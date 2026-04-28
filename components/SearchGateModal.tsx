"use client";

import { useEffect } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { getSearchCount } from "@/lib/search-gate";

interface SearchGateModalProps {
  onClose: () => void;
}

export function SearchGateModal({ onClose }: SearchGateModalProps) {
  useEffect(() => {
    posthog.capture("search_gate_shown", {
      searchCount: getSearchCount(),
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-lg border border-zinc-300 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="space-y-4 text-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            You&apos;ve used your 3 free searches
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sign up to continue searching — it&apos;s free.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/auth/signup"
              onClick={() =>
                posthog.capture("search_gate_signup_clicked")
              }
              className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-amber-400"
            >
              Sign up
            </Link>
            <Link
              href="/auth/login"
              onClick={() =>
                posthog.capture("search_gate_login_clicked")
              }
              className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
