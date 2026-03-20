/**
 * Uninstall command for pod CLI
 * Removes prompts from the local project
 */

import chalk from 'chalk';
import {
  projectConfigExists,
  loadProjectConfig,
  removePromptFromProject,
  removeLocalCache
} from '../utils/project.js';

interface UninstallOptions {
  verbose?: boolean;
}

/**
 * Parse a slug@version string
 */
function parseUninstallArg(arg: string): { slug: string; version?: string } {
  const atIndex = arg.lastIndexOf('@');
  
  if (atIndex > 0) {
    const slug = arg.slice(0, atIndex);
    const version = arg.slice(atIndex + 1);
    return { slug, version };
  }
  
  return { slug: arg };
}

/**
 * Execute the uninstall command
 * 
 * Usage:
 * - pod uninstall <name> - Remove a prompt (all versions)
 * - pod uninstall <name>@<version> - Remove a specific version
 */
export async function uninstall(name: string, options: UninstallOptions = {}): Promise<void> {
  // Check if project is initialized
  if (!(await projectConfigExists())) {
    console.error(chalk.red('No promptodex.json found.'));
    console.error('Run ' + chalk.cyan('pod init') + ' first to initialize a project.');
    process.exit(1);
  }
  
  const parsed = parseUninstallArg(name);
  const projectConfig = await loadProjectConfig();
  
  if (!projectConfig) {
    console.error(chalk.red('Failed to load promptodex.json'));
    process.exit(1);
  }
  
  // Check if the prompt exists in the project
  if (!(parsed.slug in projectConfig.prompts)) {
    console.log(chalk.yellow(`Prompt "${parsed.slug}" is not installed.`));
    return;
  }
  
  const installedVersion = projectConfig.prompts[parsed.slug];
  
  // If a version was specified, check if it matches
  if (parsed.version && parsed.version !== installedVersion) {
    console.log(chalk.yellow(`Version ${parsed.version} is not installed. Installed version: ${installedVersion}`));
    return;
  }
  
  if (options.verbose) {
    console.log(chalk.dim(`Removing ${parsed.slug}@${installedVersion}...`));
  }
  
  // Remove from project config
  const removed = await removePromptFromProject(parsed.slug);
  
  if (!removed) {
    console.error(chalk.red(`Failed to remove ${parsed.slug} from promptodex.json`));
    process.exit(1);
  }
  
  // Remove from local cache
  await removeLocalCache(parsed.slug, parsed.version);
  
  console.log(chalk.green(`✓ Uninstalled ${parsed.slug}@${installedVersion}`));
}
