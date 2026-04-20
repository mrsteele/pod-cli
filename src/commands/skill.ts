/**
 * Skill commands for pod CLI
 *
 * A "skill" is an installed prompt that has been compiled to
 * `skills/<slug>.md` using a persisted set of variable values.
 *
 *   pod skill install <slug> [--var value...]
 *   pod skill rebuild <slug>
 */

import chalk from 'chalk';
import { loadConfig, getPromptodexApiKey } from '../utils/config.js';
import { projectConfigExists } from '../utils/project.js';
import { installPrompt } from './install.js';
import { fetchPromptFromRegistry, RegistryPrompt } from '../registry/fetchPrompt.js';
import { renderPrompt } from '../utils/renderPrompt.js';
import {
  analyzeVariables,
  normalizeVariables,
  PromptVariable
} from '../utils/variables.js';
import {
  loadSkillConfig,
  saveSkillConfig,
  writeSkillOutput,
  getSkillConfigPath,
  listInstalledSkills,
  SkillConfig
} from '../utils/skill.js';

export interface SkillCommandOptions {
  verbose?: boolean;
}

export interface SkillCompilationReport {
  slug: string;
  version: number;
  outputPath: string;
  missingRequired: PromptVariable[];
  missingOptional: PromptVariable[];
}

function ensureProject(): Promise<void> {
  return projectConfigExists().then((exists) => {
    if (!exists) {
      console.error(chalk.red('No promptodex.json found.'));
      console.error('Run ' + chalk.cyan('pod init') + ' first to initialize a project.');
      process.exit(1);
    }
  });
}

/**
 * Compile a prompt into a skill markdown file, merging incoming CLI
 * variables with any previously stored config. The merged config is
 * persisted back to `.promptodex/data/<slug>/config.json`.
 *
 * Callers can pass `silent: true` to suppress per-skill logging when
 * running as part of a larger batch (e.g. a collection install).
 */
export async function compileSkill(
  prompt: RegistryPrompt,
  incomingVars: Record<string, string>,
  options: { silent?: boolean } = {}
): Promise<SkillCompilationReport> {
  const existing = await loadSkillConfig(prompt.slug);
  const mergedVars: Record<string, string> = {
    ...(existing?.vars ?? {}),
    ...incomingVars
  };

  const declared = normalizeVariables(prompt.variables);
  const { provided, missingRequired, missingOptional } = analyzeVariables(
    declared,
    mergedVars
  );

  // Persist the user-supplied values (keep user intent, not defaults).
  const configToSave: SkillConfig = {
    version: prompt.version,
    vars: mergedVars
  };
  await saveSkillConfig(prompt.slug, configToSave);

  // Render the prompt. Missing required variables still render (as
  // empty strings) but we surface them loudly below.
  const rendered = renderPrompt(prompt.content, provided);
  const outputPath = await writeSkillOutput(prompt.slug, rendered);

  if (!options.silent) {
    reportCompilation({
      slug: prompt.slug,
      version: prompt.version,
      outputPath,
      missingRequired,
      missingOptional
    });
  }

  return {
    slug: prompt.slug,
    version: prompt.version,
    outputPath,
    missingRequired,
    missingOptional
  };
}

function reportCompilation(report: SkillCompilationReport): void {
  const relOut = report.outputPath.replace(`${process.cwd()}/`, '');
  console.log(chalk.green(`✓ skill ${report.slug}@${report.version}`) + chalk.dim(` → ${relOut}`));

  if (report.missingOptional.length > 0) {
    const names = report.missingOptional.map((v) => v.name).join(', ');
    console.log(chalk.yellow(`  ! missing optional vars: ${names}`));
  }

  if (report.missingRequired.length > 0) {
    const names = report.missingRequired.map((v) => v.name).join(', ');
    console.error(chalk.red(`  ✗ missing required vars: ${names}`));
    console.error(
      chalk.dim(
        `    Edit ${getSkillConfigPath(report.slug)} or run ` +
          chalk.cyan('pod doctor skills')
      )
    );
  }
}

/**
 * `pod skill install <slug> [--var value...]`
 */
export async function skillInstall(
  slugArg: string,
  variables: Record<string, string>,
  options: SkillCommandOptions = {}
): Promise<SkillCompilationReport | null> {
  await ensureProject();

  const { slug, version } = parseSlugVersion(slugArg);

  const globalConfig = await loadConfig();
  const apiKey = globalConfig ? getPromptodexApiKey(globalConfig) ?? undefined : undefined;

  const installResult = await installPrompt(slug, version, apiKey, {
    verbose: options.verbose
  });

  if (!installResult) {
    process.exitCode = 1;
    return null;
  }

  const report = await compileSkill(installResult.prompt, variables);
  if (report.missingRequired.length > 0) {
    process.exitCode = 1;
  }
  return report;
}

/**
 * `pod skill rebuild <slug>`
 *
 * Resolves the latest version of the prompt, preserves any existing
 * variable values from the skill config, and recompiles the markdown
 * output. Warns when the latest version introduces new required vars.
 */
export async function skillRebuild(
  slugArg: string,
  options: SkillCommandOptions = {}
): Promise<SkillCompilationReport | null> {
  await ensureProject();

  const { slug } = parseSlugVersion(slugArg);

  const existing = await loadSkillConfig(slug);
  if (!existing) {
    console.error(chalk.red(`Skill "${slug}" is not installed.`));
    console.error('Install it first with: ' + chalk.cyan(`pod skill install ${slug}`));
    process.exit(1);
  }

  const globalConfig = await loadConfig();
  const apiKey = globalConfig ? getPromptodexApiKey(globalConfig) ?? undefined : undefined;

  if (options.verbose) {
    console.log(chalk.dim(`Fetching latest version of ${slug}...`));
  }

  const latest = await fetchPromptFromRegistry(slug, undefined, apiKey);

  // Cache the fresh prompt locally so other commands see the new version.
  const installResult = await installPrompt(slug, latest.version, apiKey, {
    verbose: options.verbose
  });
  if (!installResult) {
    process.exitCode = 1;
    return null;
  }

  // Warn about new required variables introduced since the last build.
  const declared = normalizeVariables(installResult.prompt.variables);
  const newlyRequired = declared.filter(
    (v) => v.required && v.defaultValue === undefined && !(v.name in existing!.vars)
  );
  if (newlyRequired.length > 0) {
    const names = newlyRequired.map((v) => v.name).join(', ');
    console.log(chalk.yellow(`  ! new required vars since last build: ${names}`));
  }

  const report = await compileSkill(installResult.prompt, {}); // reuse existing
  if (report.missingRequired.length > 0) {
    process.exitCode = 1;
  }
  return report;
}

/**
 * `pod doctor skills` implementation.
 *
 * Loads every installed skill, fetches its pinned prompt version from
 * the local cache (falling back to the registry when not cached), and
 * reports on missing variables without modifying any files.
 */
export async function doctorSkills(): Promise<void> {
  await ensureProject();

  const slugs = await listInstalledSkills();

  console.log(chalk.bold('pod doctor skills'));
  console.log('');

  if (slugs.length === 0) {
    console.log(chalk.dim('No skills installed.'));
    return;
  }

  const globalConfig = await loadConfig();
  const apiKey = globalConfig ? getPromptodexApiKey(globalConfig) ?? undefined : undefined;

  let ok = 0;
  let warn = 0;
  let fail = 0;

  for (const slug of slugs) {
    const config = await loadSkillConfig(slug);
    if (!config) continue;

    let prompt: RegistryPrompt;
    try {
      prompt = await fetchPromptFromRegistry(slug, config.version, apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`✗ ${slug}@${config.version}: ${message}`));
      fail++;
      continue;
    }

    const declared = normalizeVariables(prompt.variables);
    const { missingRequired, missingOptional } = analyzeVariables(declared, config.vars);

    if (missingRequired.length > 0) {
      const names = missingRequired.map((v) => v.name).join(', ');
      console.error(
        chalk.red(`✗ ${slug}@${prompt.version}`) +
          chalk.dim(` missing required: ${names}`)
      );
      fail++;
    } else if (missingOptional.length > 0) {
      const names = missingOptional.map((v) => v.name).join(', ');
      console.log(
        chalk.yellow(`! ${slug}@${prompt.version}`) +
          chalk.dim(` missing optional: ${names}`)
      );
      warn++;
    } else {
      console.log(chalk.green(`✓ ${slug}@${prompt.version}`));
      ok++;
    }
  }

  console.log('');
  console.log(
    `${chalk.green(`${ok} ok`)}, ${chalk.yellow(`${warn} warning`)}, ${chalk.red(
      `${fail} error`
    )}`
  );

  if (fail > 0) {
    console.log('');
    console.log(
      chalk.dim(
        `Populate missing values by editing each skill's config.json under ` +
          `.promptodex/data/<slug>/config.json and re-running ` +
          chalk.cyan('pod skill rebuild <slug>')
      )
    );
    process.exitCode = 1;
  }
}

/**
 * Local slug@version parser (kept independent of parseArgs to avoid
 * pulling in the full CLI parser here).
 */
function parseSlugVersion(arg: string): { slug: string; version?: number } {
  const atIndex = arg.lastIndexOf('@');
  if (atIndex > 0) {
    const slug = arg.slice(0, atIndex);
    const versionStr = arg.slice(atIndex + 1);
    const version = parseInt(versionStr, 10);
    if (!isNaN(version) && version > 0) {
      return { slug, version };
    }
  }
  return { slug: arg };
}
