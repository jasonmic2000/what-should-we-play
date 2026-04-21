"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type {
  GroupWithMembers,
  GroupRole,
  FindOverlapData,
  AppUser,
  BookmarkedGame,
  EnrichedSharedGame,
  NewGameNotification,
} from "@/lib/types";
import { MemberList } from "@/components/MemberList";
import { GroupMemberInput } from "@/components/GroupMemberInput";
import { GameCard } from "@/components/GameCard";

export default function GroupDetailPage() {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [overlapResults, setOverlapResults] = useState<FindOverlapData | null>(
    null,
  );
  const [overlapLoading, setOverlapLoading] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUrls, setNewMemberUrls] = useState<string[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkedGame[]>([]);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [notifications, setNotifications] = useState<NewGameNotification[]>([]);
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const isAdmin = (() => {
    if (!group || !currentUser) return false;
    if (group.creatorUserId === currentUser.id) return true;
    return group.members.some(
      (m) => m.userId === currentUser.id && m.role === "admin",
    );
  })();

  const isPaidUser = currentUser?.subscriptionTier === "paid";

  const loadGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        setGroup(json.data);
        setNameInput(json.data.name);
      }
    }
  }, [groupId]);

  const loadBookmarks = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/bookmarks`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        setBookmarks(json.data);
      }
    }
  }, [groupId]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Fetch current user profile
      const meRes = await fetch("/api/auth/me");
      let meJson: { user?: AppUser } | null = null;
      if (meRes.ok) {
        meJson = await meRes.json();
        if (meJson?.user) {
          setCurrentUser(meJson.user);
        }
      }

      await loadGroup();
      await loadBookmarks();

      // Fetch notifications for paid users (event-driven on page visit)
      if (meJson?.user?.subscriptionTier === "paid") {
        try {
          const notifRes = await fetch(`/api/groups/${groupId}/notifications`);
          if (notifRes.ok) {
            const notifJson = await notifRes.json();
            if (notifJson.success && notifJson.data?.notifications) {
              setNotifications(notifJson.data.notifications);
            }
          }
        } catch {
          // Notifications are non-critical — don't block page load
        }
      }

      setLoading(false);
    }
    init();
  }, [router, loadGroup, loadBookmarks]);

  async function handleRunOverlap() {
    if (!group || group.members.length < 2) {
      setOverlapError("Need at least 2 members to find overlap");
      return;
    }

    setOverlapLoading(true);
    setOverlapError(null);
    setOverlapResults(null);

    const profileUrls = group.members.map(
      (m) => `https://steamcommunity.com/profiles/${m.steamId64}`,
    );

    try {
      const res = await fetch("/api/find-overlap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: profileUrls }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setOverlapResults(json.data);
      } else {
        setOverlapError(json.error?.message ?? "Failed to find overlap");
      }
    } catch {
      setOverlapError("Failed to connect to the server");
    } finally {
      setOverlapLoading(false);
    }
  }

  async function handleAddMember() {
    if (newMemberUrls.length === 0) return;

    setAddingMember(true);
    const profileRegex = /steamcommunity\.com\/profiles\/(\d{17})/i;

    for (const url of newMemberUrls) {
      const match = url.match(profileRegex);
      if (!match) continue;

      await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId64: match[1] }),
      });
    }

    setNewMemberUrls([]);
    setShowAddMember(false);
    setAddingMember(false);
    await loadGroup();
  }

  async function handleSaveName() {
    if (!nameInput.trim() || nameInput.trim() === group?.name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (res.ok) {
        await loadGroup();
      }
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/groups");
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleMemberRemoved(steamId64: string) {
    setGroup((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members.filter((m) => m.steamId64 !== steamId64),
          }
        : prev,
    );
  }

  function handleRoleChanged(steamId64: string, newRole: GroupRole) {
    setGroup((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members.map((m) =>
              m.steamId64 === steamId64 ? { ...m, role: newRole } : m,
            ),
          }
        : prev,
    );
  }

  const bookmarkedAppIds = new Set(bookmarks.map((b) => b.appId));

  async function handleAddBookmark(appId: number) {
    setBookmarkError(null);
    const res = await fetch(`/api/groups/${groupId}/bookmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId }),
    });
    const json = await res.json();
    if (json.success) {
      await loadBookmarks();
    } else {
      setBookmarkError(json.error?.message ?? "Failed to bookmark game");
    }
  }

  async function handleRemoveBookmark(appId: number) {
    setBookmarkError(null);
    const res = await fetch(`/api/groups/${groupId}/bookmarks/${appId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) {
      setBookmarks((prev) => prev.filter((b) => b.appId !== appId));
    } else {
      setBookmarkError(json.error?.message ?? "Failed to remove bookmark");
    }
  }

  function bookmarkedGameToEnriched(b: BookmarkedGame): EnrichedSharedGame {
    return {
      appId: b.appId,
      name: b.name,
      headerImageUrl: b.headerImageUrl,
      playtimeForever: 0,
      imgIconUrl: "",
      imgLogoUrl: "",
    };
  }

  async function handleShare() {
    setShareError(null);
    setShareUrl(null);
    setShareCopied(false);

    // If overlap hasn't been run yet, run it first
    if (!overlapResults) {
      if (!group || group.members.length < 2) {
        setShareError("Need at least 2 members to share overlap results");
        return;
      }

      setShareLoading(true);
      const profileUrls = group.members.map(
        (m) => `https://steamcommunity.com/profiles/${m.steamId64}`,
      );

      try {
        const overlapRes = await fetch("/api/find-overlap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profiles: profileUrls }),
        });
        const overlapJson = await overlapRes.json();
        if (!overlapJson.success || !overlapJson.data) {
          setShareError(overlapJson.error?.message ?? "Failed to find overlap");
          setShareLoading(false);
          return;
        }
        setOverlapResults(overlapJson.data);
        await createShareLink(overlapJson.data);
      } catch {
        setShareError("Failed to connect to the server");
        setShareLoading(false);
      }
      return;
    }

    setShareLoading(true);
    await createShareLink(overlapResults);
  }

  async function createShareLink(results: FindOverlapData) {
    try {
      const snapshotData = {
        profiles: results.profiles,
        sharedGames: results.sharedGames,
        generatedAt: new Date().toISOString(),
      };

      const res = await fetch(`/api/groups/${groupId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotData }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const fullUrl = `${window.location.origin}${json.data.url}`;
        setShareUrl(fullUrl);
      } else {
        setShareError(json.error?.message ?? "Failed to create share link");
      }
    } catch {
      setShareError("Failed to connect to the server");
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="px-4 py-3">
          <Link
            href="/groups"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            &larr; Back to Groups
          </Link>
        </div>
        <div className="flex items-center justify-center pt-20">
          <p className="text-zinc-500 dark:text-zinc-400">Group not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="px-4 py-3">
        <Link
          href="/groups"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Back to Groups
        </Link>
      </div>

      <main className="mx-auto max-w-2xl px-6 pt-4 pb-16">
        {/* Group name */}
        <div className="flex items-center gap-3">
          {editingName ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setNameInput(group.name);
                  }
                }}
                autoFocus
                className="flex-1 rounded-lg border bg-zinc-100 px-3 py-1.5 text-xl font-bold text-zinc-900 outline-none border-zinc-300 focus:ring-2 focus:ring-teal-500/50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-white/10"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNameInput(group.name);
                }}
                className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {group.name}
              </h1>
              {isAdmin && (
                <button
                  onClick={() => setEditingName(true)}
                  className="cursor-pointer text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  aria-label="Edit group name"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        {/* Members section */}
        <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Members ({group.members.length})
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="cursor-pointer text-sm text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
              >
                {showAddMember ? "Cancel" : "+ Add Member"}
              </button>
            )}
          </div>

          {showAddMember && (
            <div className="mt-3 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/5 dark:bg-zinc-800/50">
              <GroupMemberInput
                members={newMemberUrls}
                onAdd={(url) => setNewMemberUrls((prev) => [...prev, url])}
                onRemove={(url) =>
                  setNewMemberUrls((prev) => prev.filter((m) => m !== url))
                }
              />
              <button
                onClick={handleAddMember}
                disabled={addingMember || newMemberUrls.length === 0}
                className="cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
              >
                {addingMember ? "Adding…" : "Add Members"}
              </button>
            </div>
          )}

          <div className="mt-3">
            <MemberList
              members={group.members}
              isAdmin={isAdmin}
              groupId={groupId}
              onMemberRemoved={handleMemberRemoved}
              onRoleChanged={handleRoleChanged}
            />
          </div>
        </section>

        {/* Notifications section */}
        {isPaidUser && notifications.length > 0 && (
          <section className="mt-6 rounded-lg border border-teal-300 bg-teal-50 p-4 dark:border-teal-500/30 dark:bg-teal-500/10">
            <h2 className="text-sm font-medium text-teal-700 dark:text-teal-300">
              New since last visit
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {notifications.map((notif) => (
                <div
                  key={notif.appId}
                  className="relative overflow-hidden rounded-lg border border-teal-200 bg-white dark:border-teal-500/20 dark:bg-zinc-900"
                >
                  <span className="absolute top-2 right-2 z-10 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-semibold uppercase leading-none text-white">
                    New!
                  </span>
                  <div className="relative aspect-[460/215] w-full bg-zinc-200 dark:bg-zinc-800">
                    <Image
                      src={notif.headerImageUrl}
                      alt={notif.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {notif.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      Added by {notif.addedBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isPaidUser && (
          <section className="mt-6">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              <span className="text-teal-600 dark:text-teal-400">
                Upgrade to see what&apos;s new
              </span>{" "}
              — get notified when group members add games that match your
              overlap.
            </p>
          </section>
        )}

        {/* Overlap section */}
        <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Game Overlap
            </h2>
            <button
              onClick={handleRunOverlap}
              disabled={overlapLoading || group.members.length < 2}
              className="cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              {overlapLoading ? "Finding…" : "Run Overlap"}
            </button>
          </div>

          {group.members.length < 2 && (
            <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">
              Add at least 2 members to run overlap.
            </p>
          )}

          {overlapLoading && (
            <div className="mt-4 flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
          )}

          {overlapError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {overlapError}
            </p>
          )}

          {overlapResults && (
            <div className="mt-4">
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                {overlapResults.sharedGames.length === 0
                  ? "No games in common"
                  : `${overlapResults.sharedGames.length} game${overlapResults.sharedGames.length === 1 ? "" : "s"} in common`}
              </p>
              {overlapResults.sharedGames.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {overlapResults.sharedGames.map((game) => (
                    <GameCard
                      key={game.appId}
                      game={game}
                      isBookmarked={bookmarkedAppIds.has(game.appId)}
                      onBookmark={
                        isAdmin && isPaidUser
                          ? () =>
                              bookmarkedAppIds.has(game.appId)
                                ? handleRemoveBookmark(game.appId)
                                : handleAddBookmark(game.appId)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Bookmarks section */}
        <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-white/10">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Bookmarks{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
          </h2>

          {bookmarkError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {bookmarkError}
            </p>
          )}

          {isAdmin && !isPaidUser && (
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              Bookmarks are a paid feature.{" "}
              <span className="text-teal-600 dark:text-teal-400">
                Upgrade to access.
              </span>
            </p>
          )}

          {bookmarks.length === 0 && (isPaidUser || !isAdmin) && (
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              No bookmarked games yet.
            </p>
          )}

          {bookmarks.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bookmarks.map((b) => (
                <GameCard
                  key={b.appId}
                  game={bookmarkedGameToEnriched(b)}
                  isBookmarked
                  onBookmark={
                    isAdmin ? () => handleRemoveBookmark(b.appId) : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Share section */}
        <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Share
            </h2>
            <button
              onClick={handleShare}
              disabled={shareLoading || (group.members.length < 2)}
              className="cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              {shareLoading ? "Creating…" : "Create Share Link"}
            </button>
          </div>

          {shareError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {shareError}
            </p>
          )}

          {shareUrl && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyShareUrl}
                className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {shareCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}

          {!shareUrl && !shareError && group.members.length >= 2 && (
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              Generate a temporary link (24h) to share your overlap results.
            </p>
          )}

          {group.members.length < 2 && (
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              Add at least 2 members to share overlap results.
            </p>
          )}
        </section>

        {/* Admin: Delete group */}
        {isAdmin && (
          <section className="mt-8">
            {showDeleteConfirm ? (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="text-sm text-red-700 dark:text-red-400">
                  Are you sure you want to delete this group? This cannot be
                  undone.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="cursor-pointer rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Delete Group
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
