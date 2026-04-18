"use client";

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
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                ? "border-teal-500 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-500"
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
        <div className="rounded-lg border border-zinc-200 bg-white py-12 text-center dark:border-white/5 dark:bg-zinc-900">
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
    </div>
  );
}
