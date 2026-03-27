"use client";

import { extractDisplayName } from "@/lib/steam/validate-url";

interface ProfileChipProps {
  url: string;
  onRemove: () => void;
}

export function ProfileChip({ url, onRemove }: ProfileChipProps) {
  const displayName = extractDisplayName(url);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-white/10">
      <span className="max-w-[180px] truncate" title={url}>
        {displayName}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/10 dark:hover:bg-white/10 hover:bg-zinc-300"
        aria-label={`Remove ${displayName}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </span>
  );
}
