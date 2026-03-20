/**
 * Init command for pod CLI
 * Initializes a new project with promptodex.json
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import {
  getProjectConfigPath,
  projectConfigExists,
  createEmptyProjectConfig,
  saveProjectConfig,
  updateGitignore
} from '../utils/project.js';

/**
 * Execute the init command
 * Creates a promptodex.json file in the current directory
 */
export async function init(): Promise<void> {
  const configPath = getProjectConfigPath();
  
  // Check if project already initialized
  if (await projectConfigExists()) {
    console.log(chalk.yellow('Project already initialized.'));
    console.log(chalk.dim(`  ${configPath}`));
    return;
  }
  
  // Create the empty project config
  const config = createEmptyProjectConfig();
  await saveProjectConfig(config);
  
  console.log(chalk.green('✓ Created promptodex.json'));
  
  // Update .gitignore if it exists
  const gitignoreUpdated = await updateGitignore();
  
  if (gitignoreUpdated) {
    console.log(chalk.green('✓ Added .promptodex/ to .gitignore'));
  }
  
  console.log('');
  console.log('Your project is ready! Next steps:');
  console.log('');
  console.log('  Install a prompt:');
  console.log(chalk.cyan('    pod install <prompt-name>'));
  console.log('');
  console.log('  Install a specific version:');
  console.log(chalk.cyan('    pod install <prompt-name>@<version>'));
  console.log('');
}
