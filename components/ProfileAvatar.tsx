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
        className="flex items-center justify-center rounded-full bg-amber-500/10 text-sm font-medium text-amber-600 dark:text-amber-400"
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
