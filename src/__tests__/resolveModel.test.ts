import { describe, it, expect } from 'vitest';
import { resolveModel, getModelDisplayName, isVendorSupported } from '../utils/resolveModel.js';
import type { PodConfig } from '../utils/config.js';

const mockConfig: PodConfig = {
  defaultModel: '4.1',
  vendors: {
    openai: { apiKey: 'sk-openai-test' },
    anthropic: { apiKey: 'sk-anthropic-test' }
  },
  models: {
    '4.1': { vendor: 'openai', model: 'gpt-4.1' },
    'sonnet': { vendor: 'anthropic', model: 'claude-sonnet-4' }
  }
};

describe('resolveModel', () => {
  it('should use user-specified model', () => {
    const result = resolveModel(mockConfig, 'sonnet');
    expect(result.vendor).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4');
    expect(result.apiKey).toBe('sk-anthropic-test');
  });

  it('should use prompt-recommended model when no user override', () => {
    const promptModel = { id: 'claude-sonnet-4', name: 'Claude Sonnet', provider: 'anthropic' };
    const result = resolveModel(mockConfig, undefined, promptModel);
    expect(result.vendor).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4');
  });

  it('should use default model when no other options', () => {
    const result = resolveModel(mockConfig);
    expect(result.vendor).toBe('openai');
    expect(result.model).toBe('gpt-4.1');
  });

  it('should throw for unknown model alias', () => {
    expect(() => resolveModel(mockConfig, 'unknown')).toThrow('Model alias not found: unknown');
  });

  it('should throw when no model available', () => {
    const configNoDefault: PodConfig = {
      vendors: { openai: { apiKey: 'sk-test' } },
      models: {}
    };
    expect(() => resolveModel(configNoDefault)).toThrow('No model specified and no default model configured');
  });

  it('should throw when vendor has no API key', () => {
    const configNoKey: PodConfig = {
      defaultModel: '4.1',
      vendors: { openai: { apiKey: '' } },
      models: { '4.1': { vendor: 'openai', model: 'gpt-4.1' } }
    };
    expect(() => resolveModel(configNoKey)).toThrow('No API key configured for vendor: openai');
  });

  it('should prioritize user model over prompt model', () => {
    const promptModel = { id: 'claude-sonnet-4', name: 'Claude Sonnet', provider: 'anthropic' };
    const result = resolveModel(mockConfig, '4.1', promptModel);
    expect(result.vendor).toBe('openai');
    expect(result.model).toBe('gpt-4.1');
  });
});

describe('getModelDisplayName', () => {
  it('should format model display name', () => {
    const result = getModelDisplayName({
      vendor: 'openai',
      model: 'gpt-4.1',
      apiKey: 'sk-test'
    });
    expect(result).toBe('gpt-4.1 (openai)');
  });
});

describe('isVendorSupported', () => {
  it('should return true for openai', () => {
    expect(isVendorSupported('openai')).toBe(true);
  });

  it('should return true for anthropic', () => {
    expect(isVendorSupported('anthropic')).toBe(true);
  });

  it('should return false for unknown vendor', () => {
    expect(isVendorSupported('unknown')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isVendorSupported('OpenAI')).toBe(true);
    expect(isVendorSupported('ANTHROPIC')).toBe(true);
  });
});
