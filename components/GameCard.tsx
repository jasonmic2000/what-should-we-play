"use client";

import Image from "next/image";
import { useState } from "react";
import type { EnrichedSharedGame } from "@/lib/types";

interface GameCardProps {
  game: EnrichedSharedGame;
}

export function GameCard({ game }: GameCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-white/5 dark:bg-zinc-900">
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
