import { APIError, APIErrorCode } from "../types";

const DEFAULT_ERROR_MESSAGES: Record<APIErrorCode, string> = {
  INVALID_INPUT:
    "Invalid input. Use a Steam profile URL: steamcommunity.com/id/username or steamcommunity.com/profiles/[ID]",
  PROFILE_RESOLUTION_FAILED:
    "Profile not found. Check the username or try using the numeric profile URL",
  PRIVATE_LIBRARY:
    "One or more game libraries are private. All users must set their game details to public in Steam Privacy Settings",
  API_ERROR: "Steam API is temporarily unavailable. Please try again in a moment",
  RATE_LIMIT: "Too many requests. Please wait a moment before trying again.",
  UNAUTHORIZED: "You must be logged in to access this resource.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  GROUP_LIMIT_REACHED: "Free tier is limited to 1 group. Upgrade to create more groups.",
};

const ERROR_STATUS_CODES: Record<APIErrorCode, number> = {
  INVALID_INPUT: 400,
  PROFILE_RESOLUTION_FAILED: 404,
  PRIVATE_LIBRARY: 400,
  API_ERROR: 502,
  RATE_LIMIT: 429,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  GROUP_LIMIT_REACHED: 403,
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
