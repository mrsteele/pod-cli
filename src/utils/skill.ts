/**
 * Skill filesystem helpers for pod CLI
 *
 * Skills are compiled prompts. An installed skill has three artifacts:
 *
 *   - `.promptodex/cache/<slug>/<version>.json`     (raw prompt data, shared with install)
 *   - `.promptodex/data/<slug>/config.json`         (user-provided variables + pinned version)
 *   - `skills/<slug>.md`                            (compiled markdown output)
 */

import fs from 'fs-extra';
import path from 'path';
import { getLocalCacheDir } from './project.js';

export interface SkillConfig {
  version: number;
  vars: Record<string, string>;
}

/**
 * Directory that stores per-skill configs (variables + version pin).
 */
export function getSkillDataDir(): string {
  return path.join(getLocalCacheDir(), 'data');
}

export function getSkillConfigPath(slug: string): string {
  return path.join(getSkillDataDir(), slug, 'config.json');
}

/**
 * Output directory for compiled skill markdown files.
 */
export function getSkillsDir(): string {
  return path.join(process.cwd(), 'skills');
}

export function getSkillOutputPath(slug: string): string {
  return path.join(getSkillsDir(), `${slug}.md`);
}

export async function loadSkillConfig(slug: string): Promise<SkillConfig | null> {
  const configPath = getSkillConfigPath(slug);
  if (!(await fs.pathExists(configPath))) return null;

  try {
    const raw = await fs.readJson(configPath);
    const version = typeof raw?.version === 'number' ? raw.version : Number(raw?.version);
    const vars =
      raw && typeof raw.vars === 'object' && raw.vars !== null
        ? Object.fromEntries(
            Object.entries(raw.vars as Record<string, unknown>).map(([k, v]) => [k, String(v)])
          )
        : {};

    if (!Number.isFinite(version) || version <= 0) return null;

    return { version, vars };
  } catch {
    return null;
  }
}

export async function saveSkillConfig(slug: string, config: SkillConfig): Promise<void> {
  const configPath = getSkillConfigPath(slug);
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export async function removeSkill(slug: string): Promise<void> {
  await fs.remove(path.join(getSkillDataDir(), slug));
  await fs.remove(getSkillOutputPath(slug));
}

export async function listInstalledSkills(): Promise<string[]> {
  const dir = getSkillDataDir();
  if (!(await fs.pathExists(dir))) return [];

  const entries = await fs.readdir(dir);
  const slugs: string[] = [];

  for (const entry of entries) {
    const configPath = path.join(dir, entry, 'config.json');
    if (await fs.pathExists(configPath)) {
      slugs.push(entry);
    }
  }

  return slugs.sort();
}

/**
 * Write the compiled skill markdown to `skills/<slug>.md`.
 */
export async function writeSkillOutput(slug: string, content: string): Promise<string> {
  const outPath = getSkillOutputPath(slug);
  await fs.ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, content.endsWith('\n') ? content : `${content}\n`, 'utf-8');
  return outPath;
}
