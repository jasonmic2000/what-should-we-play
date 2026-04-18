import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSearchCount,
  incrementSearchCount,
  isSearchGated,
  resetSearchCount,
  MAX_FREE_SEARCHES,
} from "./search-gate";

describe("search-gate", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);

    // Stub window so typeof window !== "undefined" in Node env
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    });
  });

  it("returns 0 when no searches have been performed", () => {
    expect(getSearchCount()).toBe(0);
  });

  it("increments the search count", () => {
    expect(incrementSearchCount()).toBe(1);
    expect(incrementSearchCount()).toBe(2);
    expect(getSearchCount()).toBe(2);
  });

  it("is not gated below the limit", () => {
    incrementSearchCount();
    incrementSearchCount();
    expect(isSearchGated()).toBe(false);
  });

  it("is gated at the limit", () => {
    for (let i = 0; i < MAX_FREE_SEARCHES; i++) {
      incrementSearchCount();
    }
    expect(isSearchGated()).toBe(true);
  });

  it("is gated above the limit", () => {
    for (let i = 0; i < MAX_FREE_SEARCHES + 1; i++) {
      incrementSearchCount();
    }
    expect(isSearchGated()).toBe(true);
  });

  it("resets the search count", () => {
    incrementSearchCount();
    incrementSearchCount();
    resetSearchCount();
    expect(getSearchCount()).toBe(0);
    expect(isSearchGated()).toBe(false);
  });

  it("exports MAX_FREE_SEARCHES as 3", () => {
    expect(MAX_FREE_SEARCHES).toBe(3);
  });
});
