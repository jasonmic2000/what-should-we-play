"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AppUser } from "@/lib/types";

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Back
        </Link>
      </div>

      <main className="mx-auto max-w-lg px-6 pt-8 pb-16">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Profile
        </h1>

        {steamLinked === "true" && (
          <div className="mt-4 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-400">
            Steam account linked successfully.
          </div>
        )}

        {steamError && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            Failed to link Steam account: {steamError.replace(/_/g, " ")}
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* Email */}
          <section className="rounded-lg border border-zinc-200 p-4 dark:border-white/10">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Email
            </h2>
            <p className="mt-1 text-zinc-900 dark:text-zinc-100">
              {user.email}
            </p>
          </section>

          {/* Steam Account */}
          <section className="rounded-lg border border-zinc-200 p-4 dark:border-white/10">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Steam Account
            </h2>
            {user.steamId64 ? (
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    Linked: {user.steamId64}
                  </p>
                </div>
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
                  className="mt-3 inline-block cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400"
                >
                  Link Steam Account
                </a>
              </div>
            )}
          </section>

          {/* Placeholder: Search History */}
          <section className="rounded-lg border border-zinc-200 p-4 dark:border-white/10">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Search History
            </h2>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Coming soon.
            </p>
          </section>

          {/* Placeholder: Subscription */}
          <section className="rounded-lg border border-zinc-200 p-4 dark:border-white/10">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
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
