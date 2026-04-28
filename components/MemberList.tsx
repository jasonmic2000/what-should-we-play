"use client";

import { useState } from "react";
import type { GroupMember, GroupRole } from "@/lib/types";

interface MemberListProps {
  members: GroupMember[];
  isAdmin: boolean;
  groupId: string;
  onMemberRemoved?: (steamId64: string) => void;
  onRoleChanged?: (steamId64: string, newRole: GroupRole) => void;
}

export function MemberList({
  members,
  isAdmin,
  groupId,
  onMemberRemoved,
  onRoleChanged,
}: MemberListProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handleRemove(steamId64: string) {
    setLoadingAction(`remove-${steamId64}`);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId64 }),
      });
      if (res.ok) {
        onMemberRemoved?.(steamId64);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleToggleRole(steamId64: string, currentRole: GroupRole) {
    const newRole: GroupRole = currentRole === "admin" ? "member" : "admin";
    setLoadingAction(`role-${steamId64}`);
    try {
      const res = await fetch(
        `/api/groups/${groupId}/members/${steamId64}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (res.ok) {
        onRoleChanged?.(steamId64, newRole);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <ul className="divide-y divide-amber-200/50 dark:divide-amber-500/5">
      {members.map((member) => (
        <li
          key={member.steamId64}
          className="flex items-center justify-between gap-3 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {member.steamId64.slice(-2)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                {member.steamId64}
              </p>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${
                member.role === "admin"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
              }`}
            >
              {member.role}
            </span>
          </div>

          {isAdmin && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => handleToggleRole(member.steamId64, member.role)}
                disabled={loadingAction === `role-${member.steamId64}`}
                className="cursor-pointer rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-amber-500/10 disabled:opacity-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-amber-500/10"
              >
                {member.role === "admin" ? "Demote" : "Promote"}
              </button>
              <button
                onClick={() => handleRemove(member.steamId64)}
                disabled={loadingAction === `remove-${member.steamId64}`}
                className="cursor-pointer rounded border border-red-300 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                aria-label={`Remove member ${member.steamId64}`}
              >
                Remove
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
