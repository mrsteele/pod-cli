/**
 * pod CLI - Promptodex Command Line Interface
 * 
 * Fetch, render, and execute prompts from the Promptodex registry
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { run } from './commands/run.js';
import { showConfig } from './commands/show-config.js';
import { doctor } from './commands/doctor.js';
import { init } from './commands/init.js';
import { configWizard } from './commands/config-wizard.js';
import { install } from './commands/install.js';
import { uninstall } from './commands/uninstall.js';
import { skillInstall, skillRebuild } from './commands/skill.js';
import {
  collectionInstall,
  collectionSkillInstall
} from './commands/collection.js';
import { parseArgs } from './utils/parseArgs.js';
import { getCurrentVersion } from './utils/checkVersion.js';

async function main(): Promise<void> {
  const version = await getCurrentVersion();
  
  const program = new Command();

  program
    .name('pod')
    .description('Promptodex CLI - Fetch and execute prompts from the registry')
    .version(version);

  // Init command - initializes a new project with promptodex.json
  program
    .command('init')
    .description('Initialize a new project (creates promptodex.json)')
    .action(async () => {
      try {
        await init();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Config command - interactive setup wizard
  program
    .command('config')
    .description('Interactive setup wizard to configure API keys and models')
    .action(async () => {
      try {
        await configWizard();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Show-config command - displays current configuration
  program
    .command('show-config')
    .description('Display current configuration')
    .action(async () => {
      try {
        await showConfig();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Install command
  program
    .command('install [name]')
    .alias('i')
    .description('Install prompt(s) from the registry')
    .option('-v, --verbose', 'Show verbose output')
    .action(async (name?: string, options?: { verbose?: boolean }) => {
      try {
        await install(name, { verbose: options?.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Uninstall command
  program
    .command('uninstall <name>')
    .description('Remove a prompt from the project')
    .option('-v, --verbose', 'Show verbose output')
    .action(async (name: string, options?: { verbose?: boolean }) => {
      try {
        await uninstall(name, { verbose: options?.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Doctor command - accepts optional subcommand (e.g. "skills")
  program
    .command('doctor [subcommand]')
    .description('Run diagnostic checks (use "skills" to scan installed skills)')
    .action(async (subcommand?: string) => {
      try {
        await doctor(subcommand);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Skill command group
  const skillCmd = program
    .command('skill')
    .description('Manage compiled skills (installed prompts rendered to skills/<slug>.md)');

  skillCmd
    .command('install <slug>')
    .alias('i')
    .description('Install a prompt and compile it as a skill')
    .option('-v, --verbose', 'Show verbose output')
    .allowUnknownOption(true)
    .action(async (slug: string, options: { verbose?: boolean }) => {
      try {
        const variables = extractVarsAfter(process.argv, slug);
        await skillInstall(slug, variables, { verbose: options.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  skillCmd
    .command('rebuild <slug>')
    .description('Rebuild a skill from the latest prompt version, reusing stored variables')
    .option('-v, --verbose', 'Show verbose output')
    .action(async (slug: string, options: { verbose?: boolean }) => {
      try {
        await skillRebuild(slug, { verbose: options.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Collection command group
  const collectionCmd = program
    .command('collection')
    .description('Install prompt collections from the registry');

  collectionCmd
    .command('install <slug>')
    .alias('i')
    .description('Install every prompt in the collection')
    .option('-v, --verbose', 'Show verbose output')
    .action(async (slug: string, options: { verbose?: boolean }) => {
      try {
        await collectionInstall(slug, { verbose: options.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  const collectionSkillCmd = collectionCmd
    .command('skill')
    .description('Install prompts from a collection and compile them as skills');

  collectionSkillCmd
    .command('install <slug>')
    .alias('i')
    .description('Install each prompt in the collection and compile it as a skill')
    .option('-v, --verbose', 'Show verbose output')
    .allowUnknownOption(true)
    .action(async (slug: string, options: { verbose?: boolean }) => {
      try {
        const variables = extractVarsAfter(process.argv, slug);
        await collectionSkillInstall(slug, variables, { verbose: options.verbose });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Help command (explicit for `pod help`)
  program
    .command('help')
    .description('Display help information')
    .action(() => {
      program.help();
    });

  // Handle unknown commands as prompt slugs
  // This allows `pod summarize` instead of `pod run summarize`
  // Supports versioning: `pod summarize@2` fetches version 2
  program
    .arguments('[slug] [args...]')
    .option('-m, --model <alias>', 'Override the model to use')
    .option('-v, --verbose', 'Show verbose output')
    .allowUnknownOption(true)
    .action(async (slug?: string, args?: string[], options?: { model?: string; verbose?: boolean }) => {
      if (!slug) {
        program.help();
        return;
      }

      // Skip if it's a known command
      const knownCommands = ['init', 'config', 'show-config', 'install', 'i', 'uninstall', 'doctor', 'help', 'skill', 'collection'];
      if (knownCommands.includes(slug)) {
        return;
      }

      try {
        // Parse remaining arguments as variables
        // Combine args with process.argv to get all --key value pairs
        const rawArgs = process.argv.slice(2);
        const parsed = parseArgs(rawArgs);

        await run({
          slug: parsed.slug,
          version: parsed.version,
          variables: parsed.variables,
          model: parsed.model ?? options?.model,
          verbose: options?.verbose
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  // Parse arguments
  await program.parseAsync(process.argv);
}

/**
 * Extract `--key value` pairs from raw argv that appear after a given
 * positional argument. Used by skill/collection commands where the
 * user can freely pass `--var value` flags that commander does not
 * know about.
 */
function extractVarsAfter(argv: string[], after: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const idx = argv.indexOf(after);
  if (idx === -1) return variables;

  const tail = argv.slice(idx + 1);
  const reserved = new Set(['verbose', 'v']);
  let i = 0;
  while (i < tail.length) {
    const arg = tail[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (!key) { i++; continue; }
      const next = tail[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        if (!reserved.has(key)) variables[key] = next;
        i += 2;
      } else {
        if (!reserved.has(key)) variables[key] = 'true';
        i++;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // short flag, skip (commander handles it)
      i++;
    } else {
      i++;
    }
  }
  return variables;
}

// Run the CLI
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
