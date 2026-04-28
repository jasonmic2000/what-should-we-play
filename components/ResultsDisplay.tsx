"use client";

import { useState } from "react";
import Link from "next/link";
import type { FindOverlapData } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { ProfileAvatar } from "./ProfileAvatar";
import { GameCard } from "./GameCard";

interface ResultsDisplayProps {
  data: FindOverlapData;
}

export function ResultsDisplay({ data }: ResultsDisplayProps) {
  const submitProfiles = useAppStore((s) => s.submitProfiles);
  const reset = useAppStore((s) => s.reset);
  const multiplayerOnly = useAppStore((s) => s.multiplayerOnly);
  const setMultiplayerOnly = useAppStore((s) => s.setMultiplayerOnly);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const { profiles, sharedGames } = data;

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Group header */}
      <div className="flex flex-wrap items-center gap-3">
        {profiles.map((profile) => (
          <div key={profile.steamId64} className="flex items-center gap-2">
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              personaName={profile.personaName}
              size={36}
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {profile.personaName ?? profile.steamId64}
            </span>
          </div>
        ))}
      </div>

      {/* Summary + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-bold font-[family-name:var(--font-display)] text-zinc-900 dark:text-zinc-100">
          {sharedGames.length === 0
            ? "No games in common"
            : `${sharedGames.length} game${sharedGames.length === 1 ? "" : "s"} in common`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const next = !multiplayerOnly;
              setMultiplayerOnly(next);
              submitProfiles();
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              multiplayerOnly
                ? "border-amber-500 bg-amber-500 text-zinc-900 dark:border-amber-400 dark:bg-amber-500"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            Multiplayer only
          </button>
          <button
            onClick={() => submitProfiles(true)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Refresh
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Start Over
          </button>
        </div>
      </div>

      {/* Game grid or empty state */}
      {sharedGames.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-white py-12 text-center dark:border-amber-500/10 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">
            No shared games found. Try adding different profiles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sharedGames.map((game) => (
            <GameCard key={game.appId} game={game} />
          ))}
        </div>
      )}

      {/* Save as group CTA */}
      {sharedGames.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-white p-6 text-center dark:border-amber-500/10 dark:bg-zinc-900">
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-zinc-900 dark:text-zinc-100">
            Want to save this group and share results?
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create an account to save groups, bookmark games, and share with friends.
          </p>
          <button
            onClick={() => setShowSaveModal(true)}
            className="mt-4 inline-block cursor-pointer rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-amber-400"
          >
            Sign up to save &amp; share
          </button>
        </div>
      )}

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-md rounded-xl border border-amber-200 bg-white p-6 shadow-xl dark:border-amber-500/10 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="absolute top-3 right-3 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="space-y-4 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Save &amp; share your results
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Create a free account to save groups, bookmark games, and share results with friends.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/auth/signup"
                  className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-amber-400"
                >
                  Sign up free
                </Link>
                <Link
                  href="/auth/login"
                  className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Already have an account? Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
