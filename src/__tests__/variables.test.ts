import { describe, it, expect } from 'vitest';
import { normalizeVariables, analyzeVariables } from '../utils/variables.js';

describe('normalizeVariables', () => {
  it('returns empty array for non-arrays', () => {
    expect(normalizeVariables(undefined)).toEqual([]);
    expect(normalizeVariables(null)).toEqual([]);
    expect(normalizeVariables('foo')).toEqual([]);
  });

  it('treats plain strings as required variables', () => {
    expect(normalizeVariables(['name', 'topic'])).toEqual([
      { name: 'name', required: true },
      { name: 'topic', required: true }
    ]);
  });

  it('parses structured entries from the API', () => {
    expect(
      normalizeVariables([
        { name: 'name', defaultValue: 'world', required: true },
        { name: 'tone', defaultValue: 'friendly', required: false },
        { name: 'extra', required: false }
      ])
    ).toEqual([
      { name: 'name', defaultValue: 'world', required: true },
      { name: 'tone', defaultValue: 'friendly', required: false },
      { name: 'extra', required: false }
    ]);
  });

  it('infers required=false when a defaultValue is provided but required is omitted', () => {
    expect(normalizeVariables([{ name: 'tone', defaultValue: 'calm' }])).toEqual([
      { name: 'tone', defaultValue: 'calm', required: false }
    ]);
  });

  it('drops malformed entries', () => {
    expect(
      normalizeVariables([{ name: '' }, null, 42, { defaultValue: 'x' }])
    ).toEqual([]);
  });
});

describe('analyzeVariables', () => {
  const declared = normalizeVariables([
    { name: 'name', required: true },
    { name: 'tone', defaultValue: 'friendly', required: false },
    { name: 'topic', required: false }
  ]);

  it('flags missing required vars', () => {
    const report = analyzeVariables(declared, {});
    expect(report.missingRequired.map((v) => v.name)).toEqual(['name']);
    expect(report.missingOptional.map((v) => v.name)).toEqual(['topic']);
    expect(report.provided.tone).toBe('friendly');
  });

  it('fills provided vars and defaults without reporting them missing', () => {
    const report = analyzeVariables(declared, { name: 'Matt', topic: 'dogs' });
    expect(report.missingRequired).toEqual([]);
    expect(report.missingOptional).toEqual([]);
    expect(report.provided).toEqual({
      name: 'Matt',
      tone: 'friendly',
      topic: 'dogs'
    });
  });

  it('respects user-provided value over default', () => {
    const report = analyzeVariables(declared, { name: 'Matt', tone: 'sassy' });
    expect(report.provided.tone).toBe('sassy');
  });
});
