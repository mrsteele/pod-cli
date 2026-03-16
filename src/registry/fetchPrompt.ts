/**
 * Registry module for pod CLI
 * Handles fetching prompts from the Promptodex registry
 */

import { getCachedPrompt, cachePrompt, CachedPrompt } from '../utils/cache.js';

const REGISTRY_BASE_URL = 'https://www.promptodex.com/api/v1';

export interface PromptModel {
  id: string;
  name: string;
  provider: string;
}

export interface PromptAuthor {
  id: string;
  username: string;
}

export interface RegistryPrompt {
  slug: string;
  title: string;
  description: string | null;
  content: string;
  variables: string[];
  author: PromptAuthor;
  tags: string[];
  version: number;
  forkCount: number;
  bookmarkCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  model: PromptModel | null;
}

/**
 * Fetch a prompt from the Promptodex registry
 * 
 * @param slug The prompt slug to fetch
 * @param version Optional specific version to fetch
 * @returns The prompt data from the registry
 */
export async function fetchPromptFromRegistry(slug: string, version?: number): Promise<RegistryPrompt> {
  let url = `${REGISTRY_BASE_URL}/prompts/${encodeURIComponent(slug)}`;
  
  // If version specified, add it to the path
  if (version !== undefined) {
    url = `${REGISTRY_BASE_URL}/prompts/${encodeURIComponent(slug)}/${version}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'pod-cli'
    },
    signal: AbortSignal.timeout(10000) // 10 second timeout
  });

  if (!response.ok) {
    if (response.status === 404) {
      if (version !== undefined) {
        throw new Error(`Prompt not found: ${slug}@${version}`);
      }
      throw new Error(`Prompt not found: ${slug}`);
    }
    throw new Error(`Failed to fetch prompt: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as RegistryPrompt;
  return data;
}

/**
 * Fetch a prompt, using cache when available
 * 
 * Strategy:
 * 1. Fetch from registry to get the latest version number
 * 2. Check if we have that version cached
 * 3. If cached, return cached version
 * 4. If not cached, use fetched data and cache it
 * 
 * @param slug The prompt slug to fetch
 * @param version Optional specific version to fetch
 * @param forceRefresh Skip cache and always fetch from registry
 * @returns The prompt data
 */
export async function fetchPrompt(
  slug: string,
  version?: number,
  forceRefresh = false
): Promise<CachedPrompt> {
  // Always fetch from registry first to check version
  const registryPrompt = await fetchPromptFromRegistry(slug, version);
  
  // Check cache (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedPrompt(slug, registryPrompt.version);
    
    if (cached) {
      return cached;
    }
  }

  // Convert to cached format and store
  const promptData: Omit<CachedPrompt, 'cachedAt'> = {
    slug: registryPrompt.slug,
    title: registryPrompt.title,
    description: registryPrompt.description,
    content: registryPrompt.content,
    variables: registryPrompt.variables,
    version: registryPrompt.version,
    model: registryPrompt.model
  };

  // Cache the prompt
  await cachePrompt(promptData);

  // Return with cachedAt timestamp
  return {
    ...promptData,
    cachedAt: new Date().toISOString()
  };
}

/**
 * Check if the registry is reachable
 */
export async function isRegistryReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${REGISTRY_BASE_URL}/health`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    // Try fetching a simple endpoint if health doesn't exist
    try {
      const response = await fetch(REGISTRY_BASE_URL, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      // Consider any response (even 404) as "reachable"
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get the registry base URL
 */
export function getRegistryUrl(): string {
  return REGISTRY_BASE_URL;
}
