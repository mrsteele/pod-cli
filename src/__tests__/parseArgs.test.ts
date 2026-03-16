import { describe, it, expect } from 'vitest';
import { parseArgs, buildPromptContent, parseSlugVersion } from '../utils/parseArgs.js';

describe('parseSlugVersion', () => {
  it('should return slug without version when no @ present', () => {
    const result = parseSlugVersion('summarize');
    expect(result.slug).toBe('summarize');
    expect(result.version).toBeUndefined();
  });

  it('should parse version from slug@version format', () => {
    const result = parseSlugVersion('summarize@2');
    expect(result.slug).toBe('summarize');
    expect(result.version).toBe(2);
  });

  it('should handle multi-digit versions', () => {
    const result = parseSlugVersion('summarize@123');
    expect(result.slug).toBe('summarize');
    expect(result.version).toBe(123);
  });

  it('should treat invalid version as part of slug', () => {
    const result = parseSlugVersion('summarize@abc');
    expect(result.slug).toBe('summarize@abc');
    expect(result.version).toBeUndefined();
  });

  it('should handle @ at the beginning', () => {
    const result = parseSlugVersion('@mention');
    expect(result.slug).toBe('@mention');
    expect(result.version).toBeUndefined();
  });

  it('should use the last @ for version parsing', () => {
    const result = parseSlugVersion('test@draft@2');
    expect(result.slug).toBe('test@draft');
    expect(result.version).toBe(2);
  });
});

describe('parseArgs', () => {
  it('should parse slug', () => {
    const result = parseArgs(['summarize']);
    expect(result.slug).toBe('summarize');
    expect(result.version).toBeUndefined();
    expect(result.variables).toEqual({});
  });

  it('should parse slug with version', () => {
    const result = parseArgs(['summarize@2']);
    expect(result.slug).toBe('summarize');
    expect(result.version).toBe(2);
    expect(result.variables).toEqual({});
  });

  it('should parse slug with variables', () => {
    const result = parseArgs(['summarize', '--topic', 'dogs']);
    expect(result.slug).toBe('summarize');
    expect(result.variables).toEqual({ topic: 'dogs' });
  });

  it('should parse multiple variables', () => {
    const result = parseArgs(['summarize', '--topic', 'dogs', '--length', 'short']);
    expect(result.slug).toBe('summarize');
    expect(result.variables).toEqual({ topic: 'dogs', length: 'short' });
  });

  it('should parse model flag separately', () => {
    const result = parseArgs(['summarize', '--model', 'sonnet', '--topic', 'cats']);
    expect(result.slug).toBe('summarize');
    expect(result.model).toBe('sonnet');
    expect(result.variables).toEqual({ topic: 'cats' });
  });

  it('should throw error for empty args', () => {
    expect(() => parseArgs([])).toThrow('No prompt slug provided');
  });

  it('should handle flag without value as boolean', () => {
    const result = parseArgs(['summarize', '--verbose']);
    expect(result.variables).toEqual({ verbose: 'true' });
  });

  it('should handle values with spaces', () => {
    const result = parseArgs(['summarize', '--topic', 'machine learning']);
    expect(result.variables).toEqual({ topic: 'machine learning' });
  });
});

describe('buildPromptContent', () => {
  it('should return template when no stdin', () => {
    const result = buildPromptContent('Hello world');
    expect(result).toBe('Hello world');
  });

  it('should return template with undefined stdin', () => {
    const result = buildPromptContent('Hello world', undefined);
    expect(result).toBe('Hello world');
  });

  it('should append stdin content', () => {
    const result = buildPromptContent('Summarize this:', 'Article content here');
    expect(result).toBe('Summarize this:\n\nArticle content here');
  });

  it('should handle empty stdin', () => {
    const result = buildPromptContent('Hello', '');
    expect(result).toBe('Hello');
  });
});
