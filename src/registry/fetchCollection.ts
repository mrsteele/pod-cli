/**
 * Fetch a collection from the Promptodex registry.
 *
 * The API shape is documented at https://www.promptodex.com/api/v1/docs
 * and looks roughly like:
 *
 * {
 *   "slug": "utils",
 *   "name": "...",
 *   "items": { "prompt-1": 2, "prompt-2": "" },
 *   ...
 * }
 *
 * An item value of `""` (empty string) means "latest".
 */

const REGISTRY_BASE_URL = 'https://www.promptodex.com/api/v1';

export interface RegistryCollection {
  slug: string;
  name: string;
  description?: string | null;
  author?: string;
  isPrivate?: boolean;
  itemCount?: number;
  items: Record<string, number | string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionItem {
  slug: string;
  /** Pinned version, or `undefined` to always fetch the latest. */
  version?: number;
}

export async function fetchCollectionFromRegistry(
  slug: string,
  apiKey?: string
): Promise<RegistryCollection> {
  const url = `${REGISTRY_BASE_URL}/collections/${encodeURIComponent(slug)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'pod-cli'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Collection not found: ${slug}`);
    }
    throw new Error(
      `Failed to fetch collection: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RegistryCollection;
  if (!data || typeof data !== 'object' || !data.items) {
    throw new Error(`Invalid collection response for ${slug}`);
  }
  return data;
}

/**
 * Normalize the `items` map into an ordered list of `CollectionItem`.
 * `""` and non-positive numbers are treated as "latest".
 */
export function parseCollectionItems(
  collection: RegistryCollection
): CollectionItem[] {
  return Object.entries(collection.items || {}).map(([slug, value]) => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return { slug, version: value };
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return { slug, version: parsed };
      }
    }
    return { slug };
  });
}
