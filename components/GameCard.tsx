"use client";

import Image from "next/image";
import { useState } from "react";
import type { SteamGame } from "@/lib/types";

interface GameCardProps {
  game: SteamGame;
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
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {game.name}
        </p>
      </div>
    </div>
  );
}
