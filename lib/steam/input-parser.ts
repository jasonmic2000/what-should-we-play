import { ParsedProfile } from "../types";

/**
 * Parse a Steam profile URL into either:
 * - a vanity identifier from /id/:vanity
 * - a SteamID64 from /profiles/:steamId64
 *
 * Supported inputs:
 * - https://steamcommunity.com/id/someuser
 * - https://steamcommunity.com/id/someuser/
 * - http://steamcommunity.com/id/someuser
 * - steamcommunity.com/id/someuser
 * - https://steamcommunity.com/profiles/76561198000000000
 * - https://steamcommunity.com/profiles/76561198000000000/
 *
 * Raw SteamID64 input is intentionally not supported in the current MVP.
 */
const VANITY_URL_REGEX =
  /^(https?:\/\/)?(www\.)?steamcommunity\.com\/id\/([^/?#]+)\/?$/i;

const PROFILE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?steamcommunity\.com\/profiles\/(\d{17})\/?$/i;

export function parseSteamProfileInput(input: string): ParsedProfile | null {
  const normalized = normalizeProfileInput(input);

  const vanityMatch = normalized.match(VANITY_URL_REGEX);
  if (vanityMatch) {
    return {
      type: "vanity",
      identifier: vanityMatch[3],
      originalInput: input,
      normalizedInput: normalized,
    };
  }

  const profileMatch = normalized.match(PROFILE_URL_REGEX);
  if (profileMatch) {
    return {
      type: "steamid64",
      identifier: profileMatch[3],
      originalInput: input,
      normalizedInput: normalized,
    };
  }

  return null;
}

export function normalizeProfileInput(input: string): string {
  return input.trim().replace(/\/+$/, "");
}