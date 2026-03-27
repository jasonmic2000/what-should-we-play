import { beforeEach, describe, expect, it } from "vitest";
import {
  TtlCache,
  vanityCache,
  gameLibraryCache,
  canRefresh,
  recordRefresh,
  invalidateProfile,
  _resetRefreshTimestamps,
} from "./cache";

describe("TtlCache", () => {
  it("stores and retrieves values", () => {
    const cache = new TtlCache<string>({ max: 10, ttl: 60_000 });
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache<string>({ max: 10, ttl: 60_000 });
    expect(cache.get("missing")).toBeUndefined();
  });

  it("deletes entries", () => {
    const cache = new TtlCache<string>({ max: 10, ttl: 60_000 });
    cache.set("key", "value");
    cache.delete("key");
    expect(cache.get("key")).toBeUndefined();
  });

  it("reports presence with has()", () => {
    const cache = new TtlCache<string>({ max: 10, ttl: 60_000 });
    expect(cache.has("key")).toBe(false);
    cache.set("key", "value");
    expect(cache.has("key")).toBe(true);
  });

  it("clears all entries", () => {
    const cache = new TtlCache<string>({ max: 10, ttl: 60_000 });
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(false);
  });
});

describe("vanityCache and gameLibraryCache singletons", () => {
  beforeEach(() => {
    vanityCache.clear();
    gameLibraryCache.clear();
  });

  it("vanityCache stores vanity → steamId64 mappings", () => {
    vanityCache.set("alice", "76561198000000000");
    expect(vanityCache.get("alice")).toBe("76561198000000000");
  });

  it("gameLibraryCache stores library objects", () => {
    const lib = { steamId64: "123", gameCount: 5, games: [], isPrivate: false };
    gameLibraryCache.set("123", lib);
    expect(gameLibraryCache.get("123")).toEqual(lib);
  });
});

describe("refresh rate limiter", () => {
  beforeEach(() => {
    _resetRefreshTimestamps();
  });

  it("allows first refresh for a profile", () => {
    expect(canRefresh("alice")).toBe(true);
  });

  it("blocks refresh within 5-minute cooldown", () => {
    const now = 1_000_000;
    recordRefresh("alice", now);
    // 1 minute later — should be blocked
    expect(canRefresh("alice", now + 60_000)).toBe(false);
  });

  it("allows refresh after 5-minute cooldown", () => {
    const now = 1_000_000;
    recordRefresh("alice", now);
    // 5 minutes later — should be allowed
    expect(canRefresh("alice", now + 5 * 60_000)).toBe(true);
  });

  it("tracks profiles independently", () => {
    const now = 1_000_000;
    recordRefresh("alice", now);
    expect(canRefresh("bob", now + 1_000)).toBe(true);
    expect(canRefresh("alice", now + 1_000)).toBe(false);
  });
});

describe("invalidateProfile", () => {
  beforeEach(() => {
    vanityCache.clear();
    gameLibraryCache.clear();
  });

  it("removes entries from both vanity and game library caches", () => {
    vanityCache.set("alice", "76561198000000000");
    gameLibraryCache.set("alice", { steamId64: "76561198000000000", gameCount: 0, games: [], isPrivate: false });
    invalidateProfile("alice");
    expect(vanityCache.has("alice")).toBe(false);
    expect(gameLibraryCache.has("alice")).toBe(false);
  });

  it("does not throw for missing keys", () => {
    expect(() => invalidateProfile("nonexistent")).not.toThrow();
  });
});
