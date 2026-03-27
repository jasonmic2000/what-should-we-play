/**
 * Client-safe Steam profile URL validation.
 * Reuses the same regex patterns from input-parser.ts without server-side dependencies.
 */

const VANITY_URL_REGEX =
  /^(https?:\/\/)?(www\.)?steamcommunity\.com\/id\/([^/?#]+)\/?$/i;

const PROFILE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?steamcommunity\.com\/profiles\/(\d{17})\/?$/i;

/**
 * Check if a string matches a valid Steam profile URL pattern.
 */
export function isValidSteamProfileUrl(input: string): boolean {
  const trimmed = input.trim().replace(/\/+$/, "");
  return VANITY_URL_REGEX.test(trimmed) || PROFILE_URL_REGEX.test(trimmed);
}

/**
 * Extract a display name from a Steam profile URL.
 * Returns the vanity name or SteamID64 from the URL.
 */
export function extractDisplayName(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");

  const vanityMatch = trimmed.match(VANITY_URL_REGEX);
  if (vanityMatch) return vanityMatch[3];

  const profileMatch = trimmed.match(PROFILE_URL_REGEX);
  if (profileMatch) return profileMatch[3];

  return trimmed;
}
