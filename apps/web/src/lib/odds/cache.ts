type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function getCacheMetadata(key: string): {
  hit: boolean;
  expiresAt: number | null;
  ageMs: number | null;
  remainingMs: number | null;
} {
  const entry = store.get(key);
  if (!entry) {
    return { hit: false, expiresAt: null, ageMs: null, remainingMs: null };
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { hit: false, expiresAt: null, ageMs: null, remainingMs: null };
  }
  const remainingMs = entry.expiresAt - Date.now();
  return {
    hit: true,
    expiresAt: entry.expiresAt,
    ageMs: null,
    remainingMs,
  };
}

export function getCachedFixtureCount(key: string): number | null {
  const cached = getCached<unknown[]>(key);
  return Array.isArray(cached) ? cached.length : null;
}
