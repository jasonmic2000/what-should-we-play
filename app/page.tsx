"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { ProfileInputForm } from "@/components/ProfileInputForm";
import { LoadingState } from "@/components/LoadingState";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  SVG Icons (inline, no emoji)                                      */
/* ------------------------------------------------------------------ */

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3a2.25 2.25 0 0 0-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.334a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
      />
    </svg>
  );
}

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function GamepadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.491 48.491 0 0 0-4.163.3c-1.1.128-1.907 1.077-1.907 2.185V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.108-.806-2.057-1.907-2.185a48.507 48.507 0 0 0-4.163-.3.64.64 0 0 1-.657-.643v0Z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function AdjustmentsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z"
      />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function LockOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing Page Sections                                             */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="flex flex-col items-center gap-6 px-4 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
      <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
        Find Games Your Whole{" "}
        <span className="text-amber-500 dark:text-amber-400">Squad</span> Owns
      </h1>
      <p className="max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
        Paste Steam profiles, discover your common ground, and stop arguing
        about what to play.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => {
            document.getElementById("search")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-amber-400"
        >
          Find Your Games
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
        <Link
          href="/auth/signup"
          className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
        >
          Sign up free
        </Link>
      </div>
    </section>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Paste Profiles",
    description: "Drop in 2–6 Steam profile URLs",
    icon: ClipboardIcon,
  },
  {
    step: 2,
    title: "Find Overlap",
    description: "We compare libraries instantly",
    icon: MagnifyingGlassIcon,
  },
  {
    step: 3,
    title: "Play Together",
    description: "See every game you all own",
    icon: GamepadIcon,
  },
] as const;

function HowItWorksSection() {
  return (
    <section className="w-full px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          How It Works
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map(({ step, title, description, icon: Icon }) => (
            <div
              key={step}
              className="flex flex-col items-center gap-4 rounded-xl border border-amber-200 bg-white p-8 text-center transition-shadow hover:shadow-md dark:border-amber-500/10 dark:bg-zinc-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
                <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-amber-600 uppercase dark:text-amber-400">
                Step {step}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: "Recently Played Ranking",
    description: "Games your squad played this week show up first",
    icon: ClockIcon,
  },
  {
    title: "Multiplayer Filter",
    description: "One click to show only games you can play together",
    icon: AdjustmentsIcon,
  },
  {
    title: "Saved Groups",
    description: "Save your squad and check overlap anytime",
    icon: UsersIcon,
  },
  {
    title: "Share Results",
    description: "Send a link to friends who aren't on the platform yet",
    icon: ShareIcon,
  },
] as const;

function FeaturesSection() {
  return (
    <section className="w-full px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          More Than Just Overlap
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {FEATURES.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex gap-4 rounded-xl border border-amber-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-amber-500/10 dark:bg-zinc-900"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
                <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { value: "160,000+", label: "games cataloged", icon: ChartBarIcon },
  { value: "Free", label: "to use", icon: CheckCircleIcon },
  { value: "No login", label: "required to search", icon: LockOpenIcon },
] as const;

function StatsSection() {
  return (
    <section className="w-full px-4 py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
        {STATS.map(({ value, label, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-white p-8 text-center dark:border-amber-500/10 dark:bg-zinc-900"
          >
            <Icon className="mb-1 h-6 w-6 text-amber-500 dark:text-amber-400" />
            <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {value}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="w-full px-4 py-16 sm:py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-2xl border border-amber-200 bg-white p-10 text-center sm:p-14 dark:border-amber-500/10 dark:bg-zinc-900">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Ready to find your next game night pick?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="inline-flex cursor-pointer items-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-amber-400"
          >
            Sign up free
          </Link>
          <button
            onClick={() => {
              document.getElementById("search")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="cursor-pointer text-sm font-medium text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Or just paste some profiles above
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Search Section (always rendered, anchor target for CTAs)          */
/* ------------------------------------------------------------------ */

function SearchSection() {
  return (
    <section id="search" className="w-full scroll-mt-20 px-4 py-16 sm:py-20">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
        <h2 className="text-center font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Find Your Games
        </h2>
        <ProfileInputForm />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */

export default function Home() {
  const status = useAppStore((s) => s.status);
  const results = useAppStore((s) => s.results);
  const error = useAppStore((s) => s.error);
  const profiles = useAppStore((s) => s.profiles);

  const isIdle = status === "idle";

  // Scroll to top when entering loading or results state
  useEffect(() => {
    if (status === "loading" || status === "success") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans dark:bg-zinc-950">
      <main className="flex flex-col items-center pb-16">
        {/* ---- LANDING MODE (idle) ---- */}
        {isIdle && (
          <>
            <HeroSection />
            <HowItWorksSection />
            <FeaturesSection />
            <StatsSection />
            <SearchSection />
            <FinalCtaSection />
          </>
        )}

        {/* ---- SEARCH / RESULTS MODE (not idle) ---- */}
        {!isIdle && (
          <div className="flex w-full flex-col items-center px-6">
            {/* Error display + form for retry */}
            {status === "error" && (
              <>
                <section className="flex flex-col items-center gap-3 pt-12 pb-8 text-center">
                  <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Find Your Games
                  </h1>
                </section>
                {error && (
                  <div className="mb-6">
                    <ErrorDisplay error={error} />
                  </div>
                )}
                <ProfileInputForm />
              </>
            )}

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
          </div>
        )}
      </main>
    </div>
  );
}
