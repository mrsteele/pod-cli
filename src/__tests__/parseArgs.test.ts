import { describe, it, expect } from 'vitest';
import { parseArgs, buildPromptContent } from '../utils/parseArgs.js';

describe('parseArgs', () => {
  it('should parse slug', () => {
    const result = parseArgs(['summarize']);
    expect(result.slug).toBe('summarize');
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
