/**
 * Model resolution utilities for pod CLI
 * Handles resolving model configuration from various sources
 */

import { PodConfig, getModelByAlias, getVendorApiKey, getVendorConfig } from './config.js';

export interface ResolvedModel {
  vendor: string;
  model: string;
  apiKey?: string;
  port?: number;
  host?: string;
}

export interface PromptModel {
  id: string;
  name: string;
  provider: string;
}

/**
 * Resolve the model to use for a prompt
 * 
 * Priority:
 * 1. User-specified model (--model flag)
 * 2. Prompt-recommended model (from registry)
 * 3. User's default model (from config)
 * 
 * @param config User configuration
 * @param userModel Model alias specified by user (optional)
 * @param promptModel Model recommended by the prompt (optional)
 * @returns Resolved model configuration
 */
export function resolveModel(
  config: PodConfig,
  userModel?: string,
  promptModel?: PromptModel | null
): ResolvedModel {
  let vendor: string;
  let model: string;

  // Priority 1: User-specified model
  if (userModel) {
    const modelConfig = getModelByAlias(config, userModel);
    
    if (!modelConfig) {
      throw new Error(`Model alias not found: ${userModel}`);
    }
    
    vendor = modelConfig.vendor;
    model = modelConfig.model;
  }
  // Priority 2: Prompt-recommended model
  else if (promptModel) {
    vendor = promptModel.provider;
    model = promptModel.id;
  }
  // Priority 3: Default model
  else if (config.defaultModel) {
    const modelConfig = getModelByAlias(config, config.defaultModel);
    
    if (!modelConfig) {
      throw new Error(`Default model alias not found: ${config.defaultModel}`);
    }
    
    vendor = modelConfig.vendor;
    model = modelConfig.model;
  }
  // No model available
  else {
    throw new Error('No model specified and no default model configured');
  }

  // Get vendor configuration
  const vendorConfig = getVendorConfig(config, vendor);
  
  // Localhost vendors don't require API keys, but need a port
  if (vendor === 'localhost') {
    if (!vendorConfig?.port) {
      throw new Error(`No port configured for localhost vendor. Add port in vendors.localhost config.`);
    }
    return {
      vendor,
      model,
      port: vendorConfig.port,
      host: vendorConfig.host || 'localhost'
    };
  }
  
  // Other vendors require API keys
  const apiKey = vendorConfig?.apiKey;
  
  if (!apiKey) {
    throw new Error(`No API key configured for vendor: ${vendor}`);
  }

  return {
    vendor,
    model,
    apiKey
  };
}

/**
 * Get a display name for a resolved model
 */
export function getModelDisplayName(resolved: ResolvedModel): string {
  return `${resolved.model} (${resolved.vendor})`;
}

/**
 * Check if a vendor is supported
 */
export function isVendorSupported(vendor: string): boolean {
  const supportedVendors = ['openai', 'anthropic', 'xai', 'localhost'];
  return supportedVendors.includes(vendor.toLowerCase());
}
