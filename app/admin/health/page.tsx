"use client";

import { useEffect, useState } from "react";

interface EndpointEntry {
  method: string;
  path: string;
  auth: string;
  rateLimit: string;
  description: string;
}

interface FeatureEntry {
  feature: string;
  tier: "free" | "paid";
  auth: boolean;
}

interface HealthData {
  endpoints: EndpointEntry[];
  cacheStatus: {
    vanityCacheSize: number;
    libraryCacheSize: number;
    vanityTtl: string;
    libraryTtl: string;
  };
  externalDependencies: {
    steamApi: { ok: boolean; latencyMs: number };
    supabase: { ok: boolean; latencyMs: number };
    sentry: { configured: boolean };
    posthog: { configured: boolean };
  };
  featureGating: FeatureEntry[];
}

export default function ApiHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
          API Health
        </h1>
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
          Loading health data…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
          API Health
        </h1>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Failed to load health data: {error ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
        API Health
      </h1>

      {/* External Dependencies */}
      <ExternalDependencies deps={data.externalDependencies} />

      {/* Cache Status */}
      <CacheStatus cache={data.cacheStatus} />

      {/* Endpoint Registry */}
      <EndpointRegistry endpoints={data.endpoints} />

      {/* Feature Gating Map */}
      <FeatureGatingMap features={data.featureGating} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// External Dependencies
// ---------------------------------------------------------------------------
function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`}
    />
  );
}

function ExternalDependencies({
  deps,
}: {
  deps: HealthData["externalDependencies"];
}) {
  const items = [
    {
      name: "Steam API",
      ok: deps.steamApi.ok,
      detail: deps.steamApi.ok
        ? `${deps.steamApi.latencyMs}ms`
        : `Unreachable (${deps.steamApi.latencyMs}ms)`,
    },
    {
      name: "Supabase (DB)",
      ok: deps.supabase.ok,
      detail: deps.supabase.ok
        ? `${deps.supabase.latencyMs}ms`
        : `Unreachable (${deps.supabase.latencyMs}ms)`,
    },
    {
      name: "Sentry",
      ok: deps.sentry.configured,
      detail: deps.sentry.configured ? "DSN configured" : "Not configured",
    },
    {
      name: "PostHog",
      ok: deps.posthog.configured,
      detail: deps.posthog.configured ? "Key configured" : "Not configured",
    },
  ];

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        External Dependencies
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-white/[0.06] bg-zinc-900 p-4"
          >
            <div className="flex items-center gap-2">
              <StatusDot ok={item.ok} />
              <span className="text-sm font-medium text-zinc-200">
                {item.name}
              </span>
            </div>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-zinc-400">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cache Status
// ---------------------------------------------------------------------------
function CacheStatus({ cache }: { cache: HealthData["cacheStatus"] }) {
  const cards = [
    { label: "Vanity Cache", size: cache.vanityCacheSize, ttl: cache.vanityTtl },
    { label: "Library Cache", size: cache.libraryCacheSize, ttl: cache.libraryTtl },
  ];

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Cache Status
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-white/[0.06] bg-zinc-900 p-4"
          >
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              {c.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-2xl font-bold text-zinc-50">
              {c.size}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              TTL: <span className="text-amber-400/80">{c.ttl}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Endpoint Registry
// ---------------------------------------------------------------------------
function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-400",
    POST: "bg-blue-500/15 text-blue-400",
    PUT: "bg-amber-500/15 text-amber-400",
    DELETE: "bg-red-500/15 text-red-400",
  };
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold ${colors[method] ?? "bg-zinc-700 text-zinc-300"}`}
    >
      {method}
    </span>
  );
}

function EndpointRegistry({ endpoints }: { endpoints: EndpointEntry[] }) {
  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Endpoint Registry
      </h2>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-400">Method</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Path</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Auth</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Rate Limit</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] bg-zinc-900/50">
            {endpoints.map((ep, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <MethodBadge method={ep.method} />
                </td>
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-zinc-300">
                  {ep.path}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{ep.auth}</td>
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-zinc-400">
                  {ep.rateLimit}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {ep.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Feature Gating Map
// ---------------------------------------------------------------------------
function FeatureGatingMap({ features }: { features: FeatureEntry[] }) {
  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Feature Gating Map
      </h2>
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-400">Feature</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Tier</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Auth Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] bg-zinc-900/50">
            {features.map((f) => (
              <tr key={f.feature}>
                <td className="px-4 py-3 text-sm text-zinc-200">
                  {f.feature}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                      f.tier === "free"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {f.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {f.auth ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
