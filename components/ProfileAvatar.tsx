"use client";

import Image from "next/image";
import { useState } from "react";

interface ProfileAvatarProps {
  avatarUrl?: string;
  personaName?: string;
  size?: number;
}

export function ProfileAvatar({ avatarUrl, personaName, size = 40 }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = personaName ? personaName.charAt(0).toUpperCase() : "?";

  if (!avatarUrl || failed) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-300"
        style={{ width: size, height: size }}
        aria-label={personaName ?? "Unknown player"}
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={avatarUrl}
      alt={personaName ?? "Player avatar"}
      width={size}
      height={size}
      className="rounded-full"
      onError={() => setFailed(true)}
    />
  );
}
