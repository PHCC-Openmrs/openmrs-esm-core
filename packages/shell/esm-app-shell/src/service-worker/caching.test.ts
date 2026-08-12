import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { addToOmrsCache as AddToOmrsCache, clearOmrsCache as ClearOmrsCache } from './caching';

class FakeCache {
  private store = new Map<string, boolean>();

  async add(url: string) {
    this.store.set(url, true);
  }

  async keys() {
    return [...this.store.keys()].map((url) => ({ url }) as Request);
  }

  async delete(url: string) {
    return this.store.delete(url);
  }
}

class FakeCacheStorage {
  private stores = new Map<string, FakeCache>();

  async open(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new FakeCache());
    }
    return this.stores.get(name)!;
  }

  async delete(name: string) {
    return this.stores.delete(name);
  }

  async has(name: string) {
    return this.stores.has(name);
  }
}

describe('clearOmrsCache', () => {
  let fakeCaches: FakeCacheStorage;
  let clearOmrsCache: typeof ClearOmrsCache;
  let addToOmrsCache: typeof AddToOmrsCache;
  let omrsCacheName: string;
  let absoluteWbManifestUrls: Array<string>;

  beforeEach(async () => {
    vi.resetModules();
    (globalThis as unknown as { __WB_MANIFEST: Array<{ url: string }> }).__WB_MANIFEST = [
      { url: '/index.html' },
      { url: '/openmrs-esm-app-shell.js' },
    ];

    fakeCaches = new FakeCacheStorage();
    vi.stubGlobal('caches', fakeCaches);

    const constants = await import('./constants');
    omrsCacheName = constants.omrsCacheName;
    absoluteWbManifestUrls = constants.absoluteWbManifestUrls;

    const caching = await import('./caching');
    clearOmrsCache = caching.clearOmrsCache;
    addToOmrsCache = caching.addToOmrsCache;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes the entire OMRS cache bucket', async () => {
    // Simulate a cache that has accumulated entries from a previous user/session,
    // including ones that aren't part of the app shell (e.g. cached API responses).
    await addToOmrsCache([...absoluteWbManifestUrls, 'https://backend.example/openmrs/ws/rest/v1/session']);
    expect(await fakeCaches.has(omrsCacheName)).toBe(true);

    await clearOmrsCache();

    const cache = await fakeCaches.open(omrsCacheName);
    const cachedUrls = (await cache.keys()).map((r) => r.url);

    // Only the re-precached app shell files remain; the stale/previous-session entry is gone.
    expect(cachedUrls.sort()).toEqual([...absoluteWbManifestUrls].sort());
  });

  it('re-precaches the app shell so offline navigation fallback keeps working', async () => {
    await clearOmrsCache();

    const cache = await fakeCaches.open(omrsCacheName);
    const cachedUrls = (await cache.keys()).map((r) => r.url);

    for (const shellUrl of absoluteWbManifestUrls) {
      expect(cachedUrls).toContain(shellUrl);
    }
  });

  it('is safe to call on an empty/never-populated cache', async () => {
    await expect(clearOmrsCache()).resolves.not.toThrow();
  });
});
