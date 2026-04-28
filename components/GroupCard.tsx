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
      className="block cursor-pointer rounded-xl border border-amber-200 bg-white p-4 transition-all hover:shadow-md hover:scale-[1.01] dark:border-amber-500/10 dark:bg-zinc-900"
    >
      <h3 className="truncate text-base font-medium font-[family-name:var(--font-display)] text-zinc-900 dark:text-zinc-100">
        {group.name}
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Created {createdDate}
      </p>
    </Link>
  );
}
