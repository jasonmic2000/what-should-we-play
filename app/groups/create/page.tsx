"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroupMemberInput } from "@/components/GroupMemberInput";

export default function CreateGroupPage() {
  const [name, setName] = useState("");
  const [memberUrls, setMemberUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setAuthChecked(true);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Resolve member URLs to SteamID64s by extracting from profile URLs
    // The API expects steamId64 strings. For numeric profile URLs we can extract directly.
    // For vanity URLs, we pass them as-is and let the backend resolve.
    // Actually, the POST /api/groups expects memberSteamIds (SteamID64 strings).
    // We need to resolve vanity URLs first. Let's use the profile URL pattern:
    // steamcommunity.com/profiles/{steamId64} → extract steamId64
    // steamcommunity.com/id/{vanity} → need to resolve
    // For simplicity, we'll pass the URLs through find-overlap-style resolution
    // by extracting what we can and passing the rest.
    const steamIds: string[] = [];
    const profileRegex = /steamcommunity\.com\/profiles\/(\d{17})/i;

    for (const url of memberUrls) {
      const match = url.match(profileRegex);
      if (match) {
        steamIds.push(match[1]);
      } else {
        // For vanity URLs, we can't resolve client-side.
        // Pass the vanity name as a placeholder — the API will need to handle this.
        // For now, we'll just include the URL and let the user know.
        setError(
          "Only numeric Steam profile URLs (steamcommunity.com/profiles/...) are supported for group members. Vanity URLs will be supported soon.",
        );
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          memberSteamIds: steamIds,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        router.push(`/groups/${json.data.id}`);
      } else {
        setError(json.error?.message ?? "Failed to create group");
      }
    } catch {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/groups"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Back to Groups
        </Link>
      </div>

      <main className="mx-auto max-w-lg px-6 pt-8 pb-16">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Create Group
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="group-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Night Crew"
              className="mt-1 w-full rounded-lg border bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors border-zinc-300 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:bg-zinc-900 dark:text-zinc-100 dark:border-white/10 dark:placeholder-zinc-500 dark:focus:ring-amber-500/50 dark:focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Members
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              Your linked Steam account will be added automatically.
            </p>
            <GroupMemberInput
              members={memberUrls}
              onAdd={(url) => setMemberUrls((prev) => [...prev, url])}
              onRemove={(url) =>
                setMemberUrls((prev) => prev.filter((m) => m !== url))
              }
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full cursor-pointer rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Group"}
          </button>
        </form>
      </main>
    </div>
  );
}
