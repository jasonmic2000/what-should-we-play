"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Group } from "@/lib/types";
import { GroupCard } from "@/components/GroupCard";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const res = await fetch("/api/groups");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setGroups(json.data);
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Home
        </Link>
      </div>

      <main className="mx-auto max-w-lg px-6 pt-8 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Groups
          </h1>
          <Link
            href="/groups/create"
            className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Create Group
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {groups.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white py-12 text-center dark:border-white/5 dark:bg-zinc-900">
              <p className="text-zinc-500 dark:text-zinc-400">
                No groups yet. Create one to get started.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
