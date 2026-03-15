/**
 * Config command for pod CLI
 * Displays configuration information
 */

import chalk from 'chalk';
import { getConfigPath, loadConfig, configExists, getDefaultConfig } from '../utils/config.js';

/**
 * Execute the config command
 * Prints config location and contents
 */
export async function config(): Promise<void> {
  const configPath = getConfigPath();
  
  console.log(chalk.bold('Configuration'));
  console.log('');
  console.log(`Location: ${chalk.cyan(configPath)}`);
  console.log('');

  if (await configExists()) {
    const configData = await loadConfig();
    
    if (configData) {
      console.log(chalk.bold('Contents:'));
      console.log('');
      
      // Print config with masked API keys
      const maskedConfig = maskSensitiveData(configData);
      console.log(JSON.stringify(maskedConfig, null, 2));
    }
  } else {
    console.log(chalk.yellow('Config file does not exist.'));
    console.log('');
    console.log('Create it with the following structure:');
    console.log('');
    console.log(chalk.dim(JSON.stringify(getDefaultConfig(), null, 2)));
  }
}

/**
 * Mask sensitive data like API keys
 */
function maskSensitiveData(config: unknown): unknown {
  if (typeof config !== 'object' || config === null) {
    return config;
  }

  if (Array.isArray(config)) {
    return config.map(maskSensitiveData);
  }

  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(config)) {
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
      if (typeof value === 'string' && value.length > 0) {
        // Mask API keys, showing only first 4 and last 4 characters
        if (value.length > 12) {
          result[key] = `${value.slice(0, 4)}...${value.slice(-4)}`;
        } else {
          result[key] = '***';
        }
      } else {
        result[key] = value;
      }
    } else {
      result[key] = maskSensitiveData(value);
    }
  }

  return result;
}
