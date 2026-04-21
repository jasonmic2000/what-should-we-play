"use client";

import Link from "next/link";
import type { Group } from "@/lib/types";

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const createdDate = new Date(group.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800/70"
    >
      <h3 className="truncate text-base font-medium text-zinc-900 dark:text-zinc-100">
        {group.name}
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Created {createdDate}
      </p>
    </Link>
  );
}
