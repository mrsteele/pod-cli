import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { compileSkill } from '../commands/skill.js';
import { loadSkillConfig, getSkillOutputPath } from '../utils/skill.js';
import type { RegistryPrompt } from '../registry/fetchPrompt.js';

/**
 * Build a minimal RegistryPrompt for tests.
 */
function makePrompt(overrides: Partial<RegistryPrompt> = {}): RegistryPrompt {
  return {
    slug: 'greet',
    title: 'Greet',
    description: null,
    content: 'Hello, {{name}}! Tone: {{tone}}. Topic: {{topic}}.',
    variables: [
      { name: 'name', required: true },
      { name: 'tone', defaultValue: 'friendly', required: false },
      { name: 'topic', required: false }
    ],
    author: { id: '1', username: 'tester' },
    tags: [],
    version: 2,
    forkCount: 0,
    bookmarkCount: 0,
    isPublic: true,
    createdAt: '',
    updatedAt: '',
    model: null,
    ...overrides
  };
}

describe('compileSkill', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pod-skill-'));
    // Minimal promptodex.json so project utilities don't complain
    await fs.writeJson(path.join(tmpDir, 'promptodex.json'), { prompts: {} });
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir) as unknown as ReturnType<typeof vi.spyOn>;
  });

  afterEach(async () => {
    cwdSpy?.mockRestore();
    await fs.remove(tmpDir);
  });

  it('writes skills/<slug>.md with rendered content and persists config', async () => {
    const report = await compileSkill(
      makePrompt(),
      { name: 'Matt', topic: 'dogs' },
      { silent: true }
    );

    const rendered = await fs.readFile(getSkillOutputPath('greet'), 'utf-8');
    expect(rendered.trim()).toBe('Hello, Matt! Tone: friendly. Topic: dogs.');

    const saved = await loadSkillConfig('greet');
    expect(saved).toEqual({
      version: 2,
      vars: { name: 'Matt', topic: 'dogs' }
    });

    expect(report.missingRequired).toEqual([]);
    expect(report.missingOptional).toEqual([]);
  });

  it('reports missing required variables without throwing', async () => {
    const report = await compileSkill(makePrompt(), {}, { silent: true });
    expect(report.missingRequired.map((v) => v.name)).toEqual(['name']);
    // optional `topic` still reported, but `tone` has a default so it is not
    expect(report.missingOptional.map((v) => v.name)).toEqual(['topic']);
  });

  it('merges previously stored vars with incoming ones', async () => {
    await compileSkill(makePrompt(), { name: 'Matt' }, { silent: true });
    const report = await compileSkill(
      makePrompt(),
      { topic: 'cats' },
      { silent: true }
    );

    expect(report.missingRequired).toEqual([]);
    const rendered = await fs.readFile(getSkillOutputPath('greet'), 'utf-8');
    expect(rendered).toContain('Hello, Matt!');
    expect(rendered).toContain('Topic: cats.');

    const saved = await loadSkillConfig('greet');
    expect(saved?.vars).toEqual({ name: 'Matt', topic: 'cats' });
  });
});
