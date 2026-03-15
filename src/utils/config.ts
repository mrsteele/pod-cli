/**
 * Configuration utilities for pod CLI
 * Handles loading and validating the user configuration file
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface VendorConfig {
  apiKey: string;
}

export interface ModelConfig {
  vendor: string;
  model: string;
}

export interface PodConfig {
  defaultModel?: string;
  vendors: Record<string, VendorConfig>;
  models: Record<string, ModelConfig>;
}

/**
 * Get the path to the pod config directory
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), '.pod');
}

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * Check if config file exists
 */
export async function configExists(): Promise<boolean> {
  return fs.pathExists(getConfigPath());
}

/**
 * Load the pod configuration
 * Returns null if config doesn't exist
 */
export async function loadConfig(): Promise<PodConfig | null> {
  const configPath = getConfigPath();
  
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as PodConfig;
    return config;
  } catch (error) {
    throw new Error(`Failed to parse config file: ${configPath}`);
  }
}

/**
 * Get API key for a vendor
 */
export function getVendorApiKey(config: PodConfig, vendor: string): string | null {
  const vendorConfig = config.vendors[vendor];
  return vendorConfig?.apiKey ?? null;
}

/**
 * Get model configuration by alias
 */
export function getModelByAlias(config: PodConfig, alias: string): ModelConfig | null {
  return config.models[alias] ?? null;
}

/**
 * Create a default config structure
 */
export function getDefaultConfig(): PodConfig {
  return {
    defaultModel: undefined,
    vendors: {
      openai: {
        apiKey: ''
      },
      anthropic: {
        apiKey: ''
      }
    },
    models: {
      '4.1': {
        vendor: 'openai',
        model: 'gpt-4.1'
      },
      'sonnet': {
        vendor: 'anthropic',
        model: 'claude-sonnet-4'
      }
    }
  };
}

/**
 * Ensure config directory exists
 */
export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(getConfigDir());
}
