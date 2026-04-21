"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { OverlapSnapshot } from "@/lib/types";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { GameCard } from "@/components/GameCard";

interface SharedLinkData {
  snapshotData: OverlapSnapshot;
  expiresAt: string;
  groupId: string;
}

export default function SharedLinkPage() {
  const params = useParams();
  const linkId = params.linkId as string;

  const [data, setData] = useState<SharedLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shared/${linkId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [linkId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Link Not Found
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            This shared link has expired or doesn&apos;t exist.
          </p>
          <Link
            href="/auth/signup"
            className="mt-6 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Sign up to create your own groups
          </Link>
        </div>
      </div>
    );
  }

  const { snapshotData, expiresAt } = data;
  const isExpired = new Date(expiresAt) < new Date();
  const expiresDate = new Date(expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sign-up CTA banner */}
      <div className="border-b border-zinc-200 bg-teal-600 dark:border-white/10 dark:bg-teal-700">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <p className="text-sm font-medium text-white">
            Want to save this group and find overlap anytime?
          </p>
          <Link
            href="/auth/signup"
            className="cursor-pointer rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:bg-zinc-100"
          >
            Sign up free
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 pt-8 pb-16">
        {/* Expiry notice */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 dark:border-white/10 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isExpired
              ? "This link has expired."
              : `This link expires on ${expiresDate}`}
          </p>
        </div>

        {/* Profiles */}
        <div className="flex flex-wrap items-center gap-3">
          {snapshotData.profiles.map((profile) => (
            <div
              key={profile.steamId64}
              className="flex items-center gap-2"
            >
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

        {/* Summary */}
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {snapshotData.sharedGames.length === 0
            ? "No games in common"
            : `${snapshotData.sharedGames.length} game${snapshotData.sharedGames.length === 1 ? "" : "s"} in common`}
        </p>

        {/* Game grid */}
        {snapshotData.sharedGames.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snapshotData.sharedGames.map((game) => (
              <GameCard key={game.appId} game={game} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white py-12 text-center dark:border-white/5 dark:bg-zinc-900">
            <p className="text-zinc-500 dark:text-zinc-400">
              No shared games found.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
