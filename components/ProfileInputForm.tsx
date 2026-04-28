"use client";

import { useState, useEffect, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { useAppStore } from "@/lib/store";
import { ProfileChip } from "./ProfileChip";
import { SearchGateModal } from "./SearchGateModal";
import { MIN_PROFILE_COUNT, MAX_PROFILE_COUNT } from "@/lib/constants";
import { isSearchGated, incrementSearchCount } from "@/lib/search-gate";
import { createClient } from "@/lib/supabase/client";

export function ProfileInputForm() {
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGateModal, setShowGateModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const profiles = useAppStore((s) => s.profiles);
  const addProfile = useAppStore((s) => s.addProfile);
  const removeProfile = useAppStore((s) => s.removeProfile);
  const submitProfiles = useAppStore((s) => s.submitProfiles);

  const isAtCap = profiles.length >= MAX_PROFILE_COUNT;
  const canSubmit = profiles.length >= MIN_PROFILE_COUNT;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    // Authenticated users bypass the gate entirely
    if (isAuthenticated) {
      await submitProfiles();
      return;
    }

    // Anonymous: check if gated
    if (isSearchGated()) {
      setShowGateModal(true);
      return;
    }

    // Anonymous: proceed and increment count on success
    await submitProfiles();
    const { status } = useAppStore.getState();
    if (status === "success") {
      incrementSearchCount();
    }
  }, [isAuthenticated, submitProfiles]);

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
            className="flex-1 rounded-lg border bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors border-zinc-300 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-900 dark:text-zinc-100 dark:border-white/10 dark:placeholder-zinc-500 dark:focus:ring-amber-500/50 dark:focus:border-amber-400"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAtCap || !inputValue.trim()}
            className="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors bg-zinc-200 text-zinc-700 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-500/10"
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
          onClick={handleSubmit}
          className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors bg-amber-500 text-zinc-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Find Games
        </button>
      </div>

      {showGateModal && (
        <SearchGateModal onClose={() => setShowGateModal(false)} />
      )}
    </div>
  );
}
