/**
 * Cache utilities for pod CLI
 * Handles caching prompts locally to reduce API calls
 */

import fs from 'fs-extra';
import path from 'path';
import { getConfigDir } from './config.js';

export interface CachedPrompt {
  slug: string;
  title: string;
  description: string | null;
  content: string;
  variables: string[];
  version: number;
  model: {
    id: string;
    name: string;
    provider: string;
  } | null;
  cachedAt: string;
}

/**
 * Get the cache directory path
 */
export function getCacheDir(): string {
  return path.join(getConfigDir(), 'cache');
}

/**
 * Get the cache file path for a specific prompt version
 */
export function getCachePath(slug: string, version: number): string {
  return path.join(getCacheDir(), slug, `${version}.json`);
}

/**
 * Check if a cached version exists
 */
export async function hasCachedVersion(slug: string, version: number): Promise<boolean> {
  const cachePath = getCachePath(slug, version);
  return fs.pathExists(cachePath);
}

/**
 * Get a cached prompt
 * Returns null if not cached
 */
export async function getCachedPrompt(slug: string, version: number): Promise<CachedPrompt | null> {
  const cachePath = getCachePath(slug, version);
  
  if (!(await fs.pathExists(cachePath))) {
    return null;
  }

  try {
    const content = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(content) as CachedPrompt;
  } catch {
    return null;
  }
}

/**
 * Cache a prompt
 */
export async function cachePrompt(prompt: Omit<CachedPrompt, 'cachedAt'>): Promise<void> {
  const cachePath = getCachePath(prompt.slug, prompt.version);
  
  // Ensure directory exists
  await fs.ensureDir(path.dirname(cachePath));
  
  const cachedPrompt: CachedPrompt = {
    ...prompt,
    cachedAt: new Date().toISOString()
  };
  
  await fs.writeJson(cachePath, cachedPrompt, { spaces: 2 });
}

/**
 * Check if cache directory is writable
 */
export async function isCacheWritable(): Promise<boolean> {
  const cacheDir = getCacheDir();
  
  try {
    await fs.ensureDir(cacheDir);
    
    // Try to write a test file
    const testPath = path.join(cacheDir, '.write-test');
    await fs.writeFile(testPath, 'test');
    await fs.remove(testPath);
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all cached prompts
 */
export async function clearCache(): Promise<void> {
  const cacheDir = getCacheDir();
  
  if (await fs.pathExists(cacheDir)) {
    await fs.emptyDir(cacheDir);
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<{ promptCount: number; totalSize: number }> {
  const cacheDir = getCacheDir();
  
  if (!(await fs.pathExists(cacheDir))) {
    return { promptCount: 0, totalSize: 0 };
  }

  let promptCount = 0;
  let totalSize = 0;

  const slugDirs = await fs.readdir(cacheDir);
  
  for (const slugDir of slugDirs) {
    const slugPath = path.join(cacheDir, slugDir);
    const stat = await fs.stat(slugPath);
    
    if (stat.isDirectory()) {
      const files = await fs.readdir(slugPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          promptCount++;
          const fileStat = await fs.stat(path.join(slugPath, file));
          totalSize += fileStat.size;
        }
      }
    }
  }

  return { promptCount, totalSize };
}
