/**
 * Project utilities for pod CLI
 * Handles the local project promptodex.json and .promptodex cache directory
 */

import fs from 'fs-extra';
import path from 'path';

export interface ProjectConfig {
  prompts: Record<string, string>; // slug -> version
}

/**
 * Get the project config file path (promptodex.json in current directory)
 */
export function getProjectConfigPath(): string {
  return path.join(process.cwd(), 'promptodex.json');
}

/**
 * Get the local cache directory (.promptodex in current directory)
 */
export function getLocalCacheDir(): string {
  return path.join(process.cwd(), '.promptodex');
}

/**
 * Get the cache path for a specific prompt version
 */
export function getLocalCachePath(slug: string, version: string): string {
  return path.join(getLocalCacheDir(), 'cache', slug, `${version}.json`);
}

/**
 * Check if project config exists
 */
export async function projectConfigExists(): Promise<boolean> {
  return fs.pathExists(getProjectConfigPath());
}

/**
 * Load the project config
 * Returns null if doesn't exist
 */
export async function loadProjectConfig(): Promise<ProjectConfig | null> {
  const configPath = getProjectConfigPath();
  
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as ProjectConfig;
  } catch (error) {
    throw new Error(`Failed to parse project config: ${configPath}`);
  }
}

/**
 * Save the project config
 */
export async function saveProjectConfig(config: ProjectConfig): Promise<void> {
  const configPath = getProjectConfigPath();
  await fs.writeJson(configPath, config, { spaces: 2 });
}

/**
 * Create a new project config with empty prompts
 */
export function createEmptyProjectConfig(): ProjectConfig {
  return {
    prompts: {}
  };
}

/**
 * Add or update a prompt in the project config
 */
export async function addPromptToProject(slug: string, version: string): Promise<void> {
  let config = await loadProjectConfig();
  
  if (!config) {
    throw new Error('No promptodex.json found. Run "pod init" first.');
  }
  
  config.prompts[slug] = version;
  await saveProjectConfig(config);
}

/**
 * Remove a prompt from the project config
 */
export async function removePromptFromProject(slug: string): Promise<boolean> {
  const config = await loadProjectConfig();
  
  if (!config) {
    throw new Error('No promptodex.json found. Run "pod init" first.');
  }
  
  if (!(slug in config.prompts)) {
    return false;
  }
  
  delete config.prompts[slug];
  await saveProjectConfig(config);
  return true;
}

/**
 * Cache a prompt locally in .promptodex/cache
 */
export async function cachePromptLocally(slug: string, version: string, data: unknown): Promise<void> {
  const cachePath = getLocalCachePath(slug, version);
  await fs.ensureDir(path.dirname(cachePath));
  await fs.writeJson(cachePath, data, { spaces: 2 });
}

/**
 * Get a locally cached prompt
 */
export async function getLocalCachedPrompt(slug: string, version: string): Promise<unknown | null> {
  const cachePath = getLocalCachePath(slug, version);
  
  if (!(await fs.pathExists(cachePath))) {
    return null;
  }
  
  try {
    const content = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Remove a prompt's local cache
 */
export async function removeLocalCache(slug: string, version?: string): Promise<void> {
  const localCacheDir = getLocalCacheDir();
  const slugDir = path.join(localCacheDir, 'cache', slug);
  
  if (version) {
    // Remove specific version
    const versionDir = path.join(slugDir, version);
    await fs.remove(versionDir);
    
    // Clean up empty slug directory
    const remaining = await fs.readdir(slugDir).catch(() => []);
    if (remaining.length === 0) {
      await fs.remove(slugDir);
    }
  } else {
    // Remove all versions for this slug
    await fs.remove(slugDir);
  }
}

/**
 * Append .promptodex to .gitignore if it exists
 */
export async function updateGitignore(): Promise<boolean> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let content = '';
  let exists = await fs.pathExists(gitignorePath);
  if (exists) {
    content = await fs.readFile(gitignorePath, 'utf-8');
    const lines = content.split('\n');
    // Check if .promptodex is already ignored
    const alreadyIgnored = lines.some(line => {
      const trimmed = line.trim();
      return trimmed === '.promptodex' || trimmed === '.promptodex/' || trimmed === '/.promptodex' || trimmed === '/.promptodex/';
    });
    if (alreadyIgnored) {
      return false;
    }
    // Append .promptodex to gitignore
    content = content.endsWith('\n') 
      ? content + '.promptodex/\n'
      : content + '\n.promptodex/\n';
  } else {
    // Create new .gitignore with .promptodex/
    content = '.promptodex/\n';
  }
  await fs.writeFile(gitignorePath, content);
  return true;
}
