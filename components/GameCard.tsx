"use client";

import Image from "next/image";
import { useState } from "react";
import type { EnrichedSharedGame } from "@/lib/types";

interface GameCardProps {
  game: EnrichedSharedGame;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

export function GameCard({ game, onBookmark, isBookmarked }: GameCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-white/5 dark:bg-zinc-900">
      {onBookmark && (
        <button
          onClick={onBookmark}
          className="absolute top-2 right-2 z-10 cursor-pointer rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark game"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill={isBookmarked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={isBookmarked ? 0 : 1.5}
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
      <div className="relative aspect-[460/215] w-full bg-zinc-200 dark:bg-zinc-800">
        {imgFailed ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No image available
          </div>
        ) : (
          <Image
            src={game.headerImageUrl}
            alt={game.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {game.name}
          </p>
          {game.isFree === true && (
            <span className="shrink-0 rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-teal-600 dark:text-teal-400">
              Free
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
