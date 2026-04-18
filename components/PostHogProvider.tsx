"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    console.log("[PostHog] init check:", { keyPresent: !!key, host });

    if (!key) return;

    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: true,
      loaded: (ph) => {
        console.log("[PostHog] loaded successfully, distinct_id:", ph.get_distinct_id());
      },
    });
  }, []);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      {children}
    </PHProvider>
  );
}
