import { describe, it, expect } from 'vitest';
import {
  getConfigDir,
  getConfigPath,
  getVendorApiKey,
  getModelByAlias,
  getDefaultConfig
} from '../utils/config.js';
import type { PodConfig } from '../utils/config.js';
import os from 'os';
import path from 'path';

describe('getConfigDir', () => {
  it('should return path in home directory', () => {
    const result = getConfigDir();
    expect(result).toBe(path.join(os.homedir(), '.pod'));
  });
});

describe('getConfigPath', () => {
  it('should return config.json path', () => {
    const result = getConfigPath();
    expect(result).toBe(path.join(os.homedir(), '.pod', 'config.json'));
  });
});

describe('getVendorApiKey', () => {
  const config: PodConfig = {
    vendors: {
      openai: { apiKey: 'sk-openai' },
      anthropic: { apiKey: 'sk-anthropic' }
    },
    models: {}
  };

  it('should return API key for vendor', () => {
    expect(getVendorApiKey(config, 'openai')).toBe('sk-openai');
    expect(getVendorApiKey(config, 'anthropic')).toBe('sk-anthropic');
  });

  it('should return null for unknown vendor', () => {
    expect(getVendorApiKey(config, 'unknown')).toBeNull();
  });
});

describe('getModelByAlias', () => {
  const config: PodConfig = {
    vendors: {},
    models: {
      '4.1': { vendor: 'openai', model: 'gpt-4.1' },
      'sonnet': { vendor: 'anthropic', model: 'claude-sonnet-4' }
    }
  };

  it('should return model config for alias', () => {
    const result = getModelByAlias(config, '4.1');
    expect(result).toEqual({ vendor: 'openai', model: 'gpt-4.1' });
  });

  it('should return null for unknown alias', () => {
    expect(getModelByAlias(config, 'unknown')).toBeNull();
  });
});

describe('getDefaultConfig', () => {
  it('should return valid default config structure', () => {
    const config = getDefaultConfig();
    expect(config).toHaveProperty('vendors');
    expect(config).toHaveProperty('models');
    expect(config.vendors).toHaveProperty('openai');
    expect(config.vendors).toHaveProperty('anthropic');
  });
});
