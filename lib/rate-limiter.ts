// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (per IP)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // max requests per window per IP

/** Stores request timestamps per IP address. */
const requestLog = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Check whether a request from `ip` is within the rate limit.
 *
 * Uses a sliding window: only timestamps within the last `WINDOW_MS` are
 * counted.  If the count is below `MAX_REQUESTS` the request is recorded
 * and allowed; otherwise it is rejected with a `retryAfterSeconds` hint.
 */
export function checkRateLimit(
  ip: string,
  now: number = Date.now(),
): RateLimitResult {
  const timestamps = requestLog.get(ip) ?? [];

  // Prune entries outside the current window
  const windowStart = now - WINDOW_MS;
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= MAX_REQUESTS) {
    // Earliest timestamp that will expire first
    const oldestInWindow = recent[0];
    const retryAfterSeconds = Math.ceil(
      (oldestInWindow + WINDOW_MS - now) / 1000,
    );
    requestLog.set(ip, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return { allowed: true };
}

/** Reset all rate-limit state. Exported for testing only. */
export function _resetRateLimiter(): void {
  requestLog.clear();
}
