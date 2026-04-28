"use client";

import { useAppStore } from "@/lib/store";
import { ProfileInputForm } from "@/components/ProfileInputForm";
import { LoadingState } from "@/components/LoadingState";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";

export default function Home() {
  const status = useAppStore((s) => s.status);
  const results = useAppStore((s) => s.results);
  const error = useAppStore((s) => s.error);
  const profiles = useAppStore((s) => s.profiles);

  return (
    <div className="min-h-screen bg-stone-50 font-sans dark:bg-zinc-950">
      <main className="flex flex-col items-center px-6 pb-16">
        {/* Landing hero — always visible in idle/error */}
        {(status === "idle" || status === "error") && (
          <section className="flex flex-col items-center gap-3 pt-12 pb-8 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              What Should We Play?
            </h1>
            <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              Paste your Steam profiles. Find your common ground.
            </p>
          </section>
        )}

        {/* Error display */}
        {status === "error" && error && (
          <div className="mb-6">
            <ErrorDisplay error={error} />
          </div>
        )}

        {/* Input form — visible in idle and error */}
        {(status === "idle" || status === "error") && <ProfileInputForm />}

        {/* Loading state */}
        {status === "loading" && (
          <LoadingState profileUrls={profiles.map((p) => p.url)} />
        )}

        {/* Results */}
        {status === "success" && results && (
          <div className="pt-8">
            <ResultsDisplay data={results} />
          </div>
        )}
      </main>
    </div>
  );
}
