/**
 * Install command for pod CLI
 * Installs prompts from the registry into the local project
 */

import chalk from 'chalk';
import { fetchPromptFromRegistry, RegistryPrompt } from '../registry/fetchPrompt.js';
import { loadConfig, getPromptodexApiKey } from '../utils/config.js';
import {
  projectConfigExists,
  loadProjectConfig,
  addPromptToProject,
  cachePromptLocally
} from '../utils/project.js';
import { parseSlugVersion } from '../utils/parseArgs.js';

interface InstallOptions {
  verbose?: boolean;
}

/**
 * Parse a slug@version string
 */
function parseInstallArg(arg: string): { slug: string; version?: number } {
  // Use the existing parser if available, or implement simple parsing
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

/**
 * Install a single prompt
 */
async function installPrompt(
  slug: string,
  version: number | undefined,
  apiKey: string | undefined,
  options: InstallOptions
): Promise<{ slug: string; version: number } | null> {
  const versionStr = version !== undefined ? `@${version}` : '';
  
  if (options.verbose) {
    console.log(chalk.dim(`Fetching ${slug}${versionStr}...`));
  }
  
  try {
    const prompt = await fetchPromptFromRegistry(slug, version, apiKey);
    
    // Cache locally
    await cachePromptLocally(slug, prompt.version.toString(), prompt);
    
    // Update project config
    await addPromptToProject(slug, prompt.version.toString());
    
    console.log(chalk.green(`✓ ${slug}@${prompt.version}`));
    
    return { slug, version: prompt.version };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`✗ ${slug}${versionStr}: ${message}`));
    return null;
  }
}

/**
 * Execute the install command
 * 
 * Usage:
 * - pod install <name>[@version] - Install a specific prompt
 * - pod install - Install all prompts from promptodex.json
 */
export async function install(name?: string, options: InstallOptions = {}): Promise<void> {
  // Check if project is initialized
  if (!(await projectConfigExists())) {
    console.error(chalk.red('No promptodex.json found.'));
    console.error('Run ' + chalk.cyan('pod init') + ' first to initialize a project.');
    process.exit(1);
  }
  
  // Load global config for API key
  const globalConfig = await loadConfig();
  const apiKey = globalConfig ? getPromptodexApiKey(globalConfig) : undefined;
  
  if (name) {
    // Install a specific prompt
    const parsed = parseInstallArg(name);
    await installPrompt(parsed.slug, parsed.version, apiKey ?? undefined, options);
  } else {
    // Install all prompts from promptodex.json
    const projectConfig = await loadProjectConfig();
    
    if (!projectConfig) {
      console.error(chalk.red('Failed to load promptodex.json'));
      process.exit(1);
    }
    
    const prompts = Object.entries(projectConfig.prompts);
    
    if (prompts.length === 0) {
      console.log(chalk.yellow('No prompts to install.'));
      console.log('Add prompts with: ' + chalk.cyan('pod install <name>'));
      return;
    }
    
    console.log(`Installing ${prompts.length} prompt${prompts.length === 1 ? '' : 's'}...`);
    console.log('');
    
    let installed = 0;
    let failed = 0;
    
    for (const [slug, versionStr] of prompts) {
      const version = parseInt(versionStr, 10);
      const result = await installPrompt(slug, version, apiKey ?? undefined, options);
      
      if (result) {
        installed++;
      } else {
        failed++;
      }
    }
    
    console.log('');
    
    if (failed > 0) {
      console.log(chalk.yellow(`Installed ${installed} of ${prompts.length} prompts (${failed} failed)`));
    } else {
      console.log(chalk.green(`✓ Installed ${installed} prompts`));
    }
  }
}
