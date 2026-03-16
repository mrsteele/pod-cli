/**
 * pod CLI - Promptodex Command Line Interface
 * 
 * Fetch, render, and execute prompts from the Promptodex registry
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { run } from './commands/run.js';
import { config } from './commands/config.js';
import { doctor } from './commands/doctor.js';
import { init } from './commands/init.js';
import { parseArgs } from './utils/parseArgs.js';
import { getCurrentVersion } from './utils/checkVersion.js';

async function main(): Promise<void> {
  const version = await getCurrentVersion();
  
  const program = new Command();

  program
    .name('pod')
    .description('Promptodex CLI - Fetch and execute prompts from the registry\n\nUsage:\n  pod <slug>           Execute latest version of a prompt\n  pod <slug>@<version> Execute a specific version (e.g., pod summarize@2)')
    .version(version);

  // Config command
  program
    .command('config')
    .description('Display configuration information')
    .action(async () => {
      try {
        await config();
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

  // Init command
  program
    .command('init')
    .description('Interactive setup wizard to configure the CLI')
    .action(async () => {
      try {
        await init();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
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
      const knownCommands = ['config', 'doctor', 'init', 'help'];
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
