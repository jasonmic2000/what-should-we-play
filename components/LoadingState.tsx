"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Resolving profiles...",
  "Fetching libraries...",
  "Calculating overlap...",
];

interface LoadingStateProps {
  profileUrls: string[];
}

export function LoadingState({ profileUrls }: LoadingStateProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Progress through steps quickly to feel responsive
    // Step 0 → 1 after 600ms, Step 1 → 2 after 800ms
    const delays = [600, 800];
    if (stepIndex >= STEPS.length - 1) return;
    const timer = setTimeout(
      () => setStepIndex((i) => i + 1),
      delays[stepIndex] ?? 600,
    );
    return () => clearTimeout(timer);
  }, [stepIndex]);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6 py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />

      <div className="space-y-3 text-center">
        {STEPS.map((step, i) => (
          <p
            key={step}
            className={`text-sm transition-all duration-300 ${
              i < stepIndex
                ? "text-amber-500/60 dark:text-amber-400/60"
                : i === stepIndex
                  ? "text-amber-500 dark:text-amber-400 font-medium"
                  : "text-zinc-300 dark:text-zinc-700"
            }`}
          >
            {i < stepIndex ? "✓ " : i === stepIndex ? "● " : "○ "}
            {step}
          </p>
        ))}
      </div>

      {profileUrls.length > 0 && (
        <div className="mt-2 space-y-1 text-center">
          <p className="text-xs text-zinc-400">
            Checking {profileUrls.length} profile{profileUrls.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
