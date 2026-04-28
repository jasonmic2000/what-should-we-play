"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { isValidSteamProfileUrl, extractDisplayName } from "@/lib/steam/validate-url";

interface GroupMemberInputProps {
  members: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  maxMembers?: number;
}

export function GroupMemberInput({
  members,
  onAdd,
  onRemove,
  maxMembers = 6,
}: GroupMemberInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isAtCap = members.length >= maxMembers;

  function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;

    if (!isValidSteamProfileUrl(value)) {
      setError("Enter a valid Steam profile URL");
      return;
    }

    const normalized = value.replace(/\/+$/, "").toLowerCase();
    const isDuplicate = members.some(
      (m) => m.replace(/\/+$/, "").toLowerCase() === normalized,
    );
    if (isDuplicate) {
      setError("This profile has already been added");
      return;
    }

    onAdd(value);
    setInputValue("");
    setError(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Paste a Steam profile URL..."
          disabled={isAtCap}
          className="flex-1 rounded-lg border bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors border-zinc-300 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 dark:text-zinc-100 dark:border-white/10 dark:placeholder-zinc-500 dark:focus:ring-amber-500/50 dark:focus:border-amber-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAtCap || !inputValue.trim()}
          className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition-colors bg-zinc-200 text-zinc-700 hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {members.map((url) => (
            <span
              key={url}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-200 px-3 py-1.5 text-sm text-zinc-800 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <span className="max-w-[180px] truncate" title={url}>
                {extractDisplayName(url)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="ml-0.5 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-zinc-300 dark:hover:bg-white/10"
                aria-label={`Remove ${extractDisplayName(url)}`}
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
          ))}
        </div>
      )}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {members.length} of {maxMembers} members
      </p>
    </div>
  );
}
