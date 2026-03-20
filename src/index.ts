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

  // Doctor command
  program
    .command('doctor')
    .description('Run diagnostic checks')
    .action(async () => {
      try {
        await doctor();
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
      const knownCommands = ['init', 'config', 'show-config', 'install', 'i', 'uninstall', 'doctor', 'help'];
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

// Run the CLI
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
