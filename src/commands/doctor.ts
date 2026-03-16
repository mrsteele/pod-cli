/**
 * Doctor command for pod CLI
 * Performs health checks on the CLI setup
 */

import chalk from 'chalk';
import { configExists, getConfigPath, loadConfig, getVendorConfig } from '../utils/config.js';
import { isCacheWritable, getCacheDir } from '../utils/cache.js';
import { isRegistryReachable, getRegistryUrl } from '../registry/fetchPrompt.js';
import { getCurrentVersion } from '../utils/checkVersion.js';
import { isReachable as isLocalhostReachable } from '../ai/localhost.js';

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

        // Check for default model
        if (config.defaultModel) {
          const defaultModelConfig = config.models[config.defaultModel];
          if (defaultModelConfig) {
            checks.push({
              name: 'Default model',
              status: 'pass',
              message: `"${config.defaultModel}" -> ${defaultModelConfig.model} (${defaultModelConfig.vendor})`
            });
            
            // Check if default model's vendor is properly configured
            const vendorConfig = getVendorConfig(config, defaultModelConfig.vendor);
            if (defaultModelConfig.vendor === 'localhost') {
              if (vendorConfig?.port) {
                // Check if localhost is reachable
                const port = vendorConfig.port;
                const host = vendorConfig.host || 'localhost';
                const reachable = await isLocalhostReachable(port, host);
                checks.push({
                  name: 'Default model vendor',
                  status: reachable ? 'pass' : 'warn',
                  message: reachable 
                    ? `Localhost LLM reachable at ${host}:${port}`
                    : `Localhost LLM not reachable at ${host}:${port}`
                });
              } else {
                checks.push({
                  name: 'Default model vendor',
                  status: 'fail',
                  message: `No port configured for localhost vendor`
                });
              }
            } else if (vendorConfig?.apiKey) {
              checks.push({
                name: 'Default model vendor',
                status: 'pass',
                message: `API key configured for ${defaultModelConfig.vendor}`
              });
            } else {
              checks.push({
                name: 'Default model vendor',
                status: 'fail',
                message: `No API key configured for ${defaultModelConfig.vendor}`
              });
            }
          } else {
            checks.push({
              name: 'Default model',
              status: 'fail',
              message: `Default model "${config.defaultModel}" not found in models config`
            });
          }
        } else {
          checks.push({
            name: 'Default model',
            status: 'warn',
            message: 'No default model configured (will require --model flag)'
          });
        }

        // Check for API keys (for non-localhost vendors)
        const vendorsWithKeys = Object.entries(config.vendors || {})
          .filter(([vendor, v]) => vendor !== 'localhost' && v.apiKey && v.apiKey.length > 0)
          .map(([k]) => k);
        
        // Check for localhost vendors with ports
        const localhostVendors = Object.entries(config.vendors || {})
          .filter(([vendor, v]) => vendor === 'localhost' && v.port)
          .map(([k, v]) => `${k}:${v.port}`);
        
        const allConfigured = [...vendorsWithKeys, ...localhostVendors];
        
        if (allConfigured.length > 0) {
          checks.push({
            name: 'Vendor credentials',
            status: 'pass',
            message: `Configured: ${allConfigured.join(', ')}`
          });
        } else {
          checks.push({
            name: 'Vendor credentials',
            status: 'fail',
            message: 'No API keys or localhost ports configured'
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
