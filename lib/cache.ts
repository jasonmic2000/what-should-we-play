import { LRUCache } from "lru-cache";
import type { GameLibrary } from "./types";

// ---------------------------------------------------------------------------
// Generic TTL cache wrapper
// ---------------------------------------------------------------------------

export interface CacheOptions {
  /** Maximum number of entries */
  max: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Thin wrapper around lru-cache that keeps the interface narrow so the
 * storage backend can be swapped to Redis later without changing callers.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class TtlCache<V extends {}> {
  private cache: LRUCache<string, V>;

  constructor(options: CacheOptions) {
    this.cache = new LRUCache<string, V>({
      max: options.max,
      ttl: options.ttl,
    });
  }

  get(key: string): V | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: V): void {
    this.cache.set(key, value);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ---------------------------------------------------------------------------
// Cache instances
// ---------------------------------------------------------------------------

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

/** Vanity name → SteamID64.  Rarely changes, 24 h TTL. */
export const vanityCache = new TtlCache<string>({
  max: 1000,
  ttl: 24 * ONE_HOUR_MS,
});

/** SteamID64 → GameLibrary (serialisable object).  10 min TTL. */
export const gameLibraryCache = new TtlCache<GameLibrary>({
  max: 500,
  ttl: 10 * ONE_MINUTE_MS,
});

// ---------------------------------------------------------------------------
// Refresh rate-limiter
// ---------------------------------------------------------------------------

/** Tracks the last refresh timestamp per profile key. */
const refreshTimestamps = new Map<string, number>();

const REFRESH_COOLDOWN_MS = 5 * ONE_MINUTE_MS;

/**
 * Returns `true` if a forced refresh is allowed for the given profile key
 * (vanity name or SteamID64).  Enforces a 5-minute cooldown per profile.
 */
export function canRefresh(profileKey: string, now: number = Date.now()): boolean {
  const last = refreshTimestamps.get(profileKey);
  if (last === undefined) return true;
  return now - last >= REFRESH_COOLDOWN_MS;
}

/**
 * Records that a refresh was performed for the given profile key.
 */
export function recordRefresh(profileKey: string, now: number = Date.now()): void {
  refreshTimestamps.set(profileKey, now);
}

/**
 * Clears cached data for a specific profile during a forced refresh.
 * Removes both vanity and game library cache entries.
 */
export function invalidateProfile(profileKey: string): void {
  vanityCache.delete(profileKey);
  gameLibraryCache.delete(profileKey);
}

// Exported for testing only
export function _resetRefreshTimestamps(): void {
  refreshTimestamps.clear();
}

// ---------------------------------------------------------------------------
// Cache size getters (used by admin health dashboard)
// ---------------------------------------------------------------------------

export function getVanityCacheSize(): number {
  return vanityCache.size();
}

export function getLibraryCacheSize(): number {
  return gameLibraryCache.size();
}
