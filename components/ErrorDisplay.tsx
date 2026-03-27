"use client";

import type { APIError } from "@/lib/types";

interface ErrorDisplayProps {
  error: APIError;
}

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  PRIVATE_LIBRARY: {
    title: "Private Game Library",
    description:
      "One or more profiles have their game details set to private. To fix this, go to Steam → Profile → Edit Profile → Privacy Settings and set 'Game details' to Public.",
  },
  PROFILE_RESOLUTION_FAILED: {
    title: "Profile Not Found",
    description:
      "We couldn't find one of the Steam profiles. Double-check the URL and make sure the profile exists.",
  },
  INVALID_INPUT: {
    title: "Invalid Input",
    description: "Something was wrong with the request. Check your profile URLs and try again.",
  },
  API_ERROR: {
    title: "Steam API Error",
    description: "We had trouble reaching Steam. This is usually temporary — try again in a moment.",
  },
  RATE_LIMIT: {
    title: "Too Many Requests",
    description: "You're making requests too quickly. Please wait a moment before trying again.",
  },
};

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  const info = ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.API_ERROR;

  return (
    <div className="w-full max-w-xl rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
        {info.title}
      </h3>
      <p className="mt-1 text-sm text-red-600 dark:text-red-300/80">
        {error.message || info.description}
      </p>
      {error.failedProfile && (
        <p className="mt-2 truncate text-xs text-red-500 dark:text-red-400/70">
          Profile: {error.failedProfile}
        </p>
      )}
    </div>
  );
}
