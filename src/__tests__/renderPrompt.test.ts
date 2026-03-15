import { describe, it, expect } from 'vitest';
import {
  renderPrompt,
  extractVariables,
  hasVariables,
  getMissingVariables
} from '../utils/renderPrompt.js';

describe('renderPrompt', () => {
  it('should replace a simple variable', () => {
    const template = 'Hello {{name}}';
    const result = renderPrompt(template, { name: 'Matt' });
    expect(result).toBe('Hello Matt');
  });

  it('should replace multiple variables', () => {
    const template = 'Hello {{name}}, welcome to {{place}}';
    const result = renderPrompt(template, { name: 'Matt', place: 'Promptodex' });
    expect(result).toBe('Hello Matt, welcome to Promptodex');
  });

  it('should handle missing variables as empty string', () => {
    const template = 'Hello {{name}}';
    const result = renderPrompt(template, {});
    expect(result).toBe('Hello ');
  });

  it('should trim whitespace in variable names', () => {
    const template = 'Hello {{ name }}';
    const result = renderPrompt(template, { name: 'Matt' });
    expect(result).toBe('Hello Matt');
  });

  it('should handle templates without variables', () => {
    const template = 'Hello world';
    const result = renderPrompt(template, { name: 'Matt' });
    expect(result).toBe('Hello world');
  });

  it('should handle the same variable multiple times', () => {
    const template = '{{name}} said hello to {{name}}';
    const result = renderPrompt(template, { name: 'Matt' });
    expect(result).toBe('Matt said hello to Matt');
  });

  it('should handle multiline templates', () => {
    const template = 'Hello {{name}}\nHow are you?\n{{greeting}}';
    const result = renderPrompt(template, { name: 'Matt', greeting: 'Good morning!' });
    expect(result).toBe('Hello Matt\nHow are you?\nGood morning!');
  });

  it('should handle empty template', () => {
    const result = renderPrompt('', { name: 'Matt' });
    expect(result).toBe('');
  });

  it('should handle special characters in values', () => {
    const template = 'Code: {{code}}';
    const result = renderPrompt(template, { code: 'const x = 1; // comment' });
    expect(result).toBe('Code: const x = 1; // comment');
  });
});

describe('extractVariables', () => {
  it('should extract variable names', () => {
    const template = 'Hello {{name}}, welcome to {{place}}';
    const vars = extractVariables(template);
    expect(vars).toEqual(['name', 'place']);
  });

  it('should return empty array for no variables', () => {
    const template = 'Hello world';
    const vars = extractVariables(template);
    expect(vars).toEqual([]);
  });

  it('should deduplicate variable names', () => {
    const template = '{{name}} and {{name}}';
    const vars = extractVariables(template);
    expect(vars).toEqual(['name']);
  });

  it('should trim whitespace from names', () => {
    const template = '{{ name }} and {{  place  }}';
    const vars = extractVariables(template);
    expect(vars).toEqual(['name', 'place']);
  });
});

describe('hasVariables', () => {
  it('should return true when template has variables', () => {
    expect(hasVariables('Hello {{name}}')).toBe(true);
  });

  it('should return false when template has no variables', () => {
    expect(hasVariables('Hello world')).toBe(false);
  });

  it('should return false for empty template', () => {
    expect(hasVariables('')).toBe(false);
  });
});

describe('getMissingVariables', () => {
  it('should return missing variables', () => {
    const template = 'Hello {{name}}, welcome to {{place}}';
    const missing = getMissingVariables(template, { name: 'Matt' });
    expect(missing).toEqual(['place']);
  });

  it('should return empty array when all variables provided', () => {
    const template = 'Hello {{name}}';
    const missing = getMissingVariables(template, { name: 'Matt' });
    expect(missing).toEqual([]);
  });

  it('should return all variables when none provided', () => {
    const template = 'Hello {{name}}, {{greeting}}';
    const missing = getMissingVariables(template, {});
    expect(missing).toEqual(['name', 'greeting']);
  });
});
