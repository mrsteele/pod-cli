/**
 * Doctor command for pod CLI
 * Performs health checks on the CLI setup
 */

import chalk from 'chalk';
import { configExists, getConfigPath, loadConfig } from '../utils/config.js';
import { isCacheWritable, getCacheDir } from '../utils/cache.js';
import { isRegistryReachable, getRegistryUrl } from '../registry/fetchPrompt.js';
import { getCurrentVersion } from '../utils/checkVersion.js';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

/**
 * Execute the doctor command
 * Runs diagnostic checks
 */
export async function doctor(): Promise<void> {
  console.log(chalk.bold('pod doctor'));
  console.log('');
  console.log('Running diagnostics...');
  console.log('');

  const version = await getCurrentVersion();
  console.log(`Version: ${chalk.cyan(version)}`);
  console.log('');

  const checks: CheckResult[] = [];

  // Check 1: Config exists
  const hasConfig = await configExists();
  checks.push({
    name: 'Configuration',
    status: hasConfig ? 'pass' : 'fail',
    message: hasConfig
      ? `Found at ${getConfigPath()}`
      : `Not found at ${getConfigPath()}`
  });

  // Check 2: Config is valid (if exists)
  if (hasConfig) {
    try {
      const config = await loadConfig();
      if (config) {
        // Check for vendors
        const hasVendors = Object.keys(config.vendors || {}).length > 0;
        const hasModels = Object.keys(config.models || {}).length > 0;
        
        if (hasVendors && hasModels) {
          checks.push({
            name: 'Config validity',
            status: 'pass',
            message: `${Object.keys(config.vendors).length} vendor(s), ${Object.keys(config.models).length} model(s) configured`
          });
        } else {
          checks.push({
            name: 'Config validity',
            status: 'warn',
            message: 'Config is missing vendors or models'
          });
        }

        // Check for API keys
        const vendorsWithKeys = Object.entries(config.vendors || {})
          .filter(([_, v]) => v.apiKey && v.apiKey.length > 0)
          .map(([k]) => k);
        
        if (vendorsWithKeys.length > 0) {
          checks.push({
            name: 'API keys',
            status: 'pass',
            message: `Keys configured for: ${vendorsWithKeys.join(', ')}`
          });
        } else {
          checks.push({
            name: 'API keys',
            status: 'fail',
            message: 'No API keys configured'
          });
        }
      }
    } catch (error) {
      checks.push({
        name: 'Config validity',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Invalid config'
      });
    }
  }

  // Check 3: Registry reachable
  const registryOk = await isRegistryReachable();
  checks.push({
    name: 'Registry',
    status: registryOk ? 'pass' : 'fail',
    message: registryOk
      ? `Reachable at ${getRegistryUrl()}`
      : `Cannot reach ${getRegistryUrl()}`
  });

  // Check 4: Cache writable
  const cacheOk = await isCacheWritable();
  checks.push({
    name: 'Cache',
    status: cacheOk ? 'pass' : 'warn',
    message: cacheOk
      ? `Writable at ${getCacheDir()}`
      : `Not writable at ${getCacheDir()}`
  });

  // Print results
  console.log(chalk.bold('Results:'));
  console.log('');

  let hasFailures = false;

  for (const check of checks) {
    let icon: string;
    let color: (text: string) => string;

    switch (check.status) {
      case 'pass':
        icon = '✓';
        color = chalk.green;
        break;
      case 'fail':
        icon = '✗';
        color = chalk.red;
        hasFailures = true;
        break;
      case 'warn':
        icon = '!';
        color = chalk.yellow;
        break;
    }

    console.log(`${color(icon)} ${chalk.bold(check.name)}: ${check.message}`);
  }

  console.log('');

  if (hasFailures) {
    console.log(chalk.red('Some checks failed. Please fix the issues above.'));
    process.exit(1);
  } else {
    console.log(chalk.green('All checks passed!'));
  }
}
