"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AppUser, SearchHistoryEntry } from "@/lib/types";

function ProfileContent() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const steamLinked = searchParams.get("steam_linked");
  const steamError = searchParams.get("steam_error");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/auth/login");
        return;
      }

      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);

        // Fetch search history for paid users
        if (data.user?.subscriptionTier === "paid") {
          setHistoryLoading(true);
          try {
            const historyRes = await fetch("/api/search-history?limit=20");
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              setSearchHistory(historyData.data ?? []);
            }
          } catch {
            // Graceful degradation — history is non-critical
          } finally {
            setHistoryLoading(false);
          }
        }
      }
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleUnlink() {
    setUnlinking(true);
    const res = await fetch("/api/auth/steam/unlink", {
      method: "POST",
    });
    if (res.ok) {
      setUser((prev) =>
        prev ? { ...prev, steamId64: undefined } : prev
      );
    }
    setUnlinking(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Back
        </Link>
      </div>

      <main className="mx-auto max-w-lg px-6 pt-8 pb-16">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-zinc-900 dark:text-zinc-50">
          Profile
        </h1>

        {steamLinked === "true" && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            Steam account linked successfully.
          </div>
        )}

        {steamError && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            Failed to link Steam account: {steamError.replace(/_/g, " ")}
          </div>
        )}

        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-amber-200 p-4 dark:border-amber-500/10">
            <h2 className="text-sm font-medium font-[family-name:var(--font-display)] text-zinc-500 dark:text-zinc-400">
              Email
            </h2>
            <p className="mt-1 text-zinc-900 dark:text-zinc-100">
              {user.email}
            </p>
          </section>

          <section className="rounded-xl border border-amber-200 p-4 dark:border-amber-500/10">
            <h2 className="text-sm font-medium font-[family-name:var(--font-display)] text-zinc-500 dark:text-zinc-400">
              Steam Account
            </h2>
            {user.steamId64 ? (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                  Linked: {user.steamId64}
                </p>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {unlinking ? "Unlinking…" : "Unlink"}
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No Steam account linked.
                </p>
                <a
                  href="/api/auth/steam/link"
                  className="mt-3 inline-block cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-amber-400"
                >
                  Link Steam Account
                </a>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-amber-200 p-4 dark:border-amber-500/10">
            <h2 className="text-sm font-medium font-[family-name:var(--font-display)] text-zinc-500 dark:text-zinc-400">
              Search History
            </h2>
            {user.subscriptionTier === "paid" ? (
              historyLoading ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">Loading…</span>
                </div>
              ) : searchHistory.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                  No searches yet. Your overlap searches will appear here.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {searchHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2 dark:border-white/5"
                    >
                      <div>
                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                          {entry.profilesSearched.length} profiles &middot;{" "}
                          {entry.sharedGameCount} shared{" "}
                          {entry.sharedGameCount === 1 ? "game" : "games"}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {new Date(entry.searchedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                Upgrade to view your search history.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-amber-200 p-4 dark:border-amber-500/10">
            <h2 className="text-sm font-medium font-[family-name:var(--font-display)] text-zinc-500 dark:text-zinc-400">
              Subscription
            </h2>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Coming soon.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-zinc-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
