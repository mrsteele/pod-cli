/**
 * Collection commands for pod CLI
 *
 *   pod collection install <slug>
 *   pod collection skill install <slug> [--var value...]
 *
 * A collection is a list of prompts (with optional pinned versions).
 * Installing a collection just runs `pod install` for each item. The
 * `collection skill install` variant additionally compiles every item
 * into a skill using any provided `--var` values and produces a batch
 * report of missing required/optional variables.
 */

import chalk from 'chalk';
import { loadConfig, getPromptodexApiKey } from '../utils/config.js';
import { projectConfigExists } from '../utils/project.js';
import {
  fetchCollectionFromRegistry,
  parseCollectionItems,
  CollectionItem
} from '../registry/fetchCollection.js';
import { installPrompt } from './install.js';
import { compileSkill, SkillCompilationReport } from './skill.js';

export interface CollectionCommandOptions {
  verbose?: boolean;
}

async function ensureProject(): Promise<void> {
  if (!(await projectConfigExists())) {
    console.error(chalk.red('No promptodex.json found.'));
    console.error('Run ' + chalk.cyan('pod init') + ' first to initialize a project.');
    process.exit(1);
  }
}

async function loadCollection(slug: string): Promise<{
  items: CollectionItem[];
  apiKey: string | undefined;
}> {
  const globalConfig = await loadConfig();
  const apiKey = globalConfig ? getPromptodexApiKey(globalConfig) ?? undefined : undefined;

  const collection = await fetchCollectionFromRegistry(slug, apiKey);
  const items = parseCollectionItems(collection);

  if (items.length === 0) {
    console.log(chalk.yellow(`Collection "${slug}" has no items.`));
  }
  return { items, apiKey };
}

/**
 * `pod collection install <slug>`
 */
export async function collectionInstall(
  slug: string,
  options: CollectionCommandOptions = {}
): Promise<void> {
  await ensureProject();

  const { items, apiKey } = await loadCollection(slug);

  console.log(`Installing ${items.length} prompt${items.length === 1 ? '' : 's'} from collection "${slug}"...`);
  console.log('');

  let ok = 0;
  let failed = 0;
  for (const item of items) {
    const result = await installPrompt(item.slug, item.version, apiKey, {
      verbose: options.verbose
    });
    if (result) ok++;
    else failed++;
  }

  console.log('');
  if (failed > 0) {
    console.log(chalk.yellow(`Installed ${ok}/${items.length} (${failed} failed)`));
    process.exitCode = 1;
  } else {
    console.log(chalk.green(`✓ Installed ${ok} prompts`));
  }
}

/**
 * `pod collection skill install <slug> [--var value...]`
 *
 * Installs every prompt in the collection, then compiles each one as a
 * skill. The same set of `--var` values is applied to every prompt;
 * variables that do not appear in a particular prompt are ignored.
 */
export async function collectionSkillInstall(
  slug: string,
  variables: Record<string, string>,
  options: CollectionCommandOptions = {}
): Promise<void> {
  await ensureProject();

  const { items, apiKey } = await loadCollection(slug);

  console.log(
    `Installing ${items.length} skill${items.length === 1 ? '' : 's'} from collection "${slug}"...`
  );
  console.log('');

  const reports: SkillCompilationReport[] = [];
  let failed = 0;

  for (const item of items) {
    const installResult = await installPrompt(item.slug, item.version, apiKey, {
      verbose: options.verbose
    });
    if (!installResult) {
      failed++;
      continue;
    }

    const report = await compileSkill(installResult.prompt, variables);
    reports.push(report);
  }

  // Batch report
  console.log('');
  console.log(chalk.bold('Skill report:'));

  const withMissingRequired = reports.filter((r) => r.missingRequired.length > 0);
  const withMissingOptional = reports.filter(
    (r) => r.missingRequired.length === 0 && r.missingOptional.length > 0
  );
  const clean = reports.filter(
    (r) => r.missingRequired.length === 0 && r.missingOptional.length === 0
  );

  console.log(
    `  ${chalk.green(`${clean.length} ok`)}, ${chalk.yellow(
      `${withMissingOptional.length} warning`
    )}, ${chalk.red(`${withMissingRequired.length} error`)}`
  );

  if (withMissingRequired.length > 0) {
    console.log('');
    console.log(chalk.red('Skills with missing required vars:'));
    for (const r of withMissingRequired) {
      console.log(
        `  ${r.slug}@${r.version}: ${r.missingRequired.map((v) => v.name).join(', ')}`
      );
    }
    console.log('');
    console.log(
      chalk.dim(
        `Edit .promptodex/data/<slug>/config.json and run ` +
          chalk.cyan('pod doctor skills') +
          chalk.dim(' to verify.')
      )
    );
    process.exitCode = 1;
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}
