import { describe, it, expect } from 'vitest';
import {
  parseCollectionItems,
  RegistryCollection
} from '../registry/fetchCollection.js';

function makeCollection(items: Record<string, number | string>): RegistryCollection {
  return {
    slug: 'utils',
    name: 'Utils',
    items
  };
}

describe('parseCollectionItems', () => {
  it('returns [] for an empty items map', () => {
    expect(parseCollectionItems(makeCollection({}))).toEqual([]);
  });

  it('parses pinned numeric versions', () => {
    const items = parseCollectionItems(
      makeCollection({ 'prompt-a': 2, 'prompt-b': 5 })
    );
    expect(items).toEqual([
      { slug: 'prompt-a', version: 2 },
      { slug: 'prompt-b', version: 5 }
    ]);
  });

  it('treats empty string as "latest"', () => {
    const items = parseCollectionItems(
      makeCollection({ 'prompt-a': '', 'prompt-b': 3 })
    );
    expect(items).toEqual([
      { slug: 'prompt-a' },
      { slug: 'prompt-b', version: 3 }
    ]);
  });

  it('parses numeric strings into versions', () => {
    const items = parseCollectionItems(makeCollection({ 'prompt-a': '4' }));
    expect(items).toEqual([{ slug: 'prompt-a', version: 4 }]);
  });

  it('treats invalid or non-positive values as "latest"', () => {
    const items = parseCollectionItems(
      makeCollection({ 'prompt-a': 0, 'prompt-b': 'abc' as unknown as string })
    );
    expect(items).toEqual([{ slug: 'prompt-a' }, { slug: 'prompt-b' }]);
  });
});
