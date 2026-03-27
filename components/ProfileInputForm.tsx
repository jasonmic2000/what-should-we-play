"use client";

import { useState, type KeyboardEvent } from "react";
import { useAppStore } from "@/lib/store";
import { ProfileChip } from "./ProfileChip";
import { MIN_PROFILE_COUNT, MAX_PROFILE_COUNT } from "@/lib/constants";

export function ProfileInputForm() {
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profiles = useAppStore((s) => s.profiles);
  const addProfile = useAppStore((s) => s.addProfile);
  const removeProfile = useAppStore((s) => s.removeProfile);
  const submitProfiles = useAppStore((s) => s.submitProfiles);

  const isAtCap = profiles.length >= MAX_PROFILE_COUNT;
  const canSubmit = profiles.length >= MIN_PROFILE_COUNT;

  function handleAdd() {
    const value = inputValue.trim();
    if (!value) return;

    const result = addProfile(value);
    if (result.success) {
      setInputValue("");
      setErrorMessage(null);
    } else {
      setErrorMessage(result.errorMessage ?? "Invalid input");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Paste a Steam profile URL..."
            disabled={isAtCap}
            className="flex-1 rounded-lg border bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors border-zinc-300 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 dark:text-zinc-100 dark:border-white/10 dark:placeholder-zinc-500 dark:focus:ring-teal-400/50 dark:focus:border-teal-400"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAtCap || !inputValue.trim()}
            className="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors bg-zinc-200 text-zinc-700 hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Add
          </button>
        </div>

        {errorMessage && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      {profiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => (
            <ProfileChip
              key={profile.url}
              url={profile.url}
              onRemove={() => removeProfile(profile.url)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {profiles.length} of {MAX_PROFILE_COUNT} profiles
          {profiles.length < MIN_PROFILE_COUNT && (
            <span className="ml-1 text-zinc-400 dark:text-zinc-500">
              (min {MIN_PROFILE_COUNT} required)
            </span>
          )}
        </span>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => submitProfiles()}
          className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Find Games
        </button>
      </div>
    </div>
  );
}
