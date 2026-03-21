import { APIError, APIErrorCode } from "../types";

const DEFAULT_ERROR_MESSAGES: Record<APIErrorCode, string> = {
  INVALID_INPUT:
    "Invalid input. Use a Steam profile URL: steamcommunity.com/id/username or steamcommunity.com/profiles/[ID]",
  PROFILE_RESOLUTION_FAILED:
    "Profile not found. Check the username or try using the numeric profile URL",
  PRIVATE_LIBRARY:
    "One or more game libraries are private. All users must set their game details to public in Steam Privacy Settings",
  API_ERROR: "Steam API is temporarily unavailable. Please try again in a moment",
};

const ERROR_STATUS_CODES: Record<APIErrorCode, number> = {
  INVALID_INPUT: 400,
  PROFILE_RESOLUTION_FAILED: 404,
  PRIVATE_LIBRARY: 400,
  API_ERROR: 502,
};

interface SteamOverlapErrorOptions {
  message?: string;
  failedProfile?: string;
  details?: unknown;
}

export class SteamOverlapError extends Error {
  code: APIErrorCode;
  failedProfile?: string;
  details?: unknown;
  statusCode: number;

  constructor(code: APIErrorCode, options: SteamOverlapErrorOptions = {}) {
    super(options.message ?? DEFAULT_ERROR_MESSAGES[code]);
    this.name = "SteamOverlapError";
    this.code = code;
    this.failedProfile = options.failedProfile;
    this.details = options.details;
    this.statusCode = ERROR_STATUS_CODES[code];
  }

  toApiError(): APIError {
    return {
      code: this.code,
      message: this.message,
      failedProfile: this.failedProfile,
      details: this.details,
    };
  }
}

export function toSteamOverlapError(error: unknown): SteamOverlapError {
  if (error instanceof SteamOverlapError) {
    return error;
  }

  if (error instanceof Error) {
    return new SteamOverlapError("API_ERROR", {
      details: error.message,
    });
  }

  return new SteamOverlapError("API_ERROR", {
    details: "Unknown error",
  });
}
