"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

// ---------------------------------------------------------------------------
// Mermaid diagram definition
// ---------------------------------------------------------------------------
const DIAGRAM_DEFINITION = `graph TD
  Browser[Browser Client] --> NextJS[Next.js App Router]
  NextJS --> FindOverlap[/api/find-overlap]
  NextJS --> GroupsAPI[/api/groups/*]
  NextJS --> AuthAPI[/api/auth/*]
  NextJS --> SharedAPI[/api/shared/*]
  NextJS --> CronAPI[/api/cron/*]
  NextJS --> AdminAPI[/api/admin/*]

  FindOverlap --> ProfileResolver[Profile Resolver]
  FindOverlap --> GameFetcher[Game Fetcher]
  FindOverlap --> OverlapCalc[Overlap Calculator]
  FindOverlap --> ResultEnricher[Result Enricher]
  FindOverlap --> RecentlyPlayed[Recently Played]
  FindOverlap --> Cache[In-Memory Cache]
  FindOverlap --> RateLimiter[Rate Limiter]

  ProfileResolver --> SteamAPI[Steam Web API]
  GameFetcher --> SteamAPI
  RecentlyPlayed --> SteamAPI

  ResultEnricher --> CatalogRepo[Catalog Repository]
  GroupsAPI --> GroupRepo[Group Repository]
  GroupsAPI --> BookmarkRepo[Bookmark Repository]
  GroupsAPI --> SharedLinkRepo[Shared Link Repository]
  GroupsAPI --> NotificationSvc[Notification Service]

  CatalogRepo --> PostgreSQL[(PostgreSQL via Supabase)]
  GroupRepo --> PostgreSQL
  BookmarkRepo --> PostgreSQL
  SharedLinkRepo --> PostgreSQL

  AuthAPI --> SupabaseAuth[Supabase Auth]
  AuthAPI --> SteamOpenID[Steam OpenID]

  CronAPI --> CatalogSync[Catalog Sync Service]
  CatalogSync --> SteamAPI
  CatalogSync --> PostgreSQL

  Sentry[Sentry] -.-> NextJS
  PostHog[PostHog] -.-> Browser
  VercelAnalytics[Vercel Analytics] -.-> Browser
  Pino[Pino Logger] -.-> NextJS`;

// ---------------------------------------------------------------------------
// Technology stack data
// ---------------------------------------------------------------------------
interface TechItem {
  name: string;
  version?: string;
  role: string;
}

const TECH_STACK: TechItem[] = [
  { name: "Next.js", version: "16.1.6", role: "App Router framework with server-side API routes" },
  { name: "TypeScript", version: "5.x", role: "Type-safe language for all source code" },
  { name: "Tailwind CSS", version: "4.x", role: "Utility-first CSS framework" },
  { name: "PostgreSQL", role: "Primary database via Supabase managed hosting" },
  { name: "Drizzle ORM", version: "0.45.x", role: "Zero-overhead ORM compiling to raw SQL" },
  { name: "Zustand", version: "5.x", role: "Lightweight client state management" },
  { name: "Vitest", version: "4.x", role: "Fast unit and integration test runner" },
  { name: "Sentry", version: "10.x", role: "Error tracking and server-side exception capture" },
  { name: "PostHog", role: "Product analytics and event tracking" },
  { name: "Pino", version: "10.x", role: "Structured JSON logging with Axiom drain" },
  { name: "Vercel", role: "Hosting platform with automatic deployments" },
  { name: "GitHub Actions", role: "CI pipeline: lint, type-check, test, build" },
];

// ---------------------------------------------------------------------------
// Component health data (derived from health API)
// ---------------------------------------------------------------------------
interface ComponentHealth {
  name: string;
  status: "green" | "amber" | "red";
  detail: string;
}


// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function ArchitecturePage() {
  const [diagramSvg, setDiagramSvg] = useState<string>("");
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const [health, setHealth] = useState<ComponentHealth[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Render Mermaid diagram on mount
  useEffect(() => {
    let cancelled = false;
    mermaid.initialize({ startOnLoad: false, theme: "dark" });
    mermaid
      .render("arch-diagram", DIAGRAM_DEFINITION)
      .then(({ svg }) => {
        if (!cancelled) setDiagramSvg(svg);
      })
      .catch((err) => {
        if (!cancelled) setDiagramError(err instanceof Error ? err.message : "Failed to render diagram");
      });
    return () => { cancelled = true; };
  }, []);

  // Fetch component health from health API
  useEffect(() => {
    fetch("/api/admin/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const components: ComponentHealth[] = [];
        const deps = data.externalDependencies;
        if (deps) {
          components.push({
            name: "Steam API",
            status: deps.steamApi?.ok ? "green" : "red",
            detail: deps.steamApi?.ok ? `${deps.steamApi.latencyMs}ms` : "Unreachable",
          });
          components.push({
            name: "Supabase (DB)",
            status: deps.supabase?.ok ? "green" : "red",
            detail: deps.supabase?.ok ? `${deps.supabase.latencyMs}ms` : "Unreachable",
          });
          components.push({
            name: "Sentry",
            status: deps.sentry?.configured ? "green" : "amber",
            detail: deps.sentry?.configured ? "Configured" : "Not configured",
          });
          components.push({
            name: "PostHog",
            status: deps.posthog?.configured ? "green" : "amber",
            detail: deps.posthog?.configured ? "Configured" : "Not configured",
          });
        }
        const cache = data.cacheStatus;
        if (cache) {
          components.push({
            name: "Vanity Cache",
            status: "green",
            detail: `${cache.vanityCacheSize} entries (TTL ${cache.vanityTtl})`,
          });
          components.push({
            name: "Library Cache",
            status: "green",
            detail: `${cache.libraryCacheSize} entries (TTL ${cache.libraryTtl})`,
          });
        }
        setHealth(components);
      })
      .catch(() => {
        setHealth([]);
      })
      .finally(() => setHealthLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
        Architecture
      </h1>

      {/* Architecture Diagram (hero) */}
      <ArchitectureDiagram
        svg={diagramSvg}
        error={diagramError}
        containerRef={containerRef}
      />

      {/* Component Health */}
      <ComponentHealthGrid health={health} loading={healthLoading} />

      {/* Technology Stack */}
      <TechnologyStack />

      {/* Deployment Info */}
      <DeploymentInfo />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Architecture Diagram
// ---------------------------------------------------------------------------
function ArchitectureDiagram({
  svg,
  error,
  containerRef,
}: {
  svg: string;
  error: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (error) {
    return (
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
          Architecture Diagram
        </h2>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Failed to render diagram: {error}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Architecture Diagram
      </h2>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-zinc-900 p-6">
        {svg ? (
          <div
            ref={containerRef}
            className="flex justify-center [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex items-center justify-center py-12 text-zinc-400">
            <svg
              className="mr-3 h-5 w-5 animate-spin text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Rendering diagram…
          </div>
        )}
      </div>
    </section>
  );
}


// ---------------------------------------------------------------------------
// Component Health Grid
// ---------------------------------------------------------------------------
function HealthDot({ status }: { status: "green" | "amber" | "red" }) {
  const color =
    status === "green"
      ? "bg-emerald-400"
      : status === "amber"
        ? "bg-amber-400"
        : "bg-red-400";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}

function ComponentHealthGrid({
  health,
  loading,
}: {
  health: ComponentHealth[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
          Component Health
        </h2>
        <div className="flex items-center gap-3 text-zinc-400">
          <svg
            className="h-5 w-5 animate-spin text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Checking component health…
        </div>
      </section>
    );
  }

  if (health.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
          Component Health
        </h2>
        <p className="text-sm text-zinc-500">Unable to load health data.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Component Health
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {health.map((c) => (
          <div
            key={c.name}
            className="rounded-xl border border-white/[0.06] bg-zinc-900 p-4"
          >
            <div className="flex items-center gap-2">
              <HealthDot status={c.status} />
              <span className="text-sm font-medium text-zinc-200">
                {c.name}
              </span>
            </div>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-zinc-400">
              {c.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Technology Stack
// ---------------------------------------------------------------------------
function TechnologyStack() {
  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Technology Stack
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TECH_STACK.map((tech) => (
          <div
            key={tech.name}
            className="rounded-xl border border-white/[0.06] bg-zinc-900 p-4"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-zinc-200">
                {tech.name}
              </span>
              {tech.version && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold text-amber-400">
                  v{tech.version}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-400">{tech.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Deployment Info
// ---------------------------------------------------------------------------
function DeploymentInfo() {
  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Deployment Info
      </h2>
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Platform
            </dt>
            <dd className="mt-1 font-[family-name:var(--font-mono)] text-sm text-zinc-200">
              Vercel
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Node.js Version
            </dt>
            <dd className="mt-1 font-[family-name:var(--font-mono)] text-sm text-zinc-200">
              {typeof process !== "undefined" ? process.version : "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Environment
            </dt>
            <dd className="mt-1 font-[family-name:var(--font-mono)] text-sm text-zinc-200">
              {typeof process !== "undefined"
                ? process.env.NODE_ENV ?? "unknown"
                : "N/A"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Region
            </dt>
            <dd className="mt-1 font-[family-name:var(--font-mono)] text-sm text-zinc-200">
              {typeof process !== "undefined" &&
              process.env.NEXT_PUBLIC_VERCEL_REGION
                ? process.env.NEXT_PUBLIC_VERCEL_REGION
                : "Local / not deployed"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
