import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetRateLimiter } from "./rate-limiter";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimiter();
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBeUndefined();
  });

  it("allows up to 10 requests per IP within a minute", () => {
    const now = 1000000;
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit("1.2.3.4", now + i);
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects the 11th request within the window", () => {
    const now = 1000000;
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4", now);
    }
    const result = checkRateLimit("1.2.3.4", now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks IPs independently", () => {
    const now = 1000000;
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.1.1.1", now);
    }
    // Different IP should still be allowed
    const result = checkRateLimit("2.2.2.2", now);
    expect(result.allowed).toBe(true);
  });

  it("allows requests again after the window expires", () => {
    const now = 1000000;
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4", now);
    }
    // 61 seconds later — outside the 60s window
    const result = checkRateLimit("1.2.3.4", now + 61_000);
    expect(result.allowed).toBe(true);
  });

  it("returns a positive retryAfterSeconds when rejected", () => {
    const now = 1000000;
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4", now);
    }
    const result = checkRateLimit("1.2.3.4", now + 5_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("_resetRateLimiter clears all state", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4");
    }
    _resetRateLimiter();
    const result = checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
  });
});
