"use client";

import { useEffect, useState } from "react";

interface SystemData {
  tableCounts: Record<string, number>;
  enrichment: {
    total: number;
    enriched: number;
    percentage: number;
  };
  recentSyncJobs: Array<{
    id: number;
    job_type: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    items_processed: number;
    last_app_id: number | null;
    error_message: string | null;
    created_at: string;
  }>;
  schema: Array<{
    table: string;
    columns: Array<{ name: string; type: string; pk?: boolean }>;
  }>;
  envStatus: Record<string, boolean>;
}

export default function SystemOverviewPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/system")
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
          System Overview
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
          Loading system data…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
          System Overview
        </h1>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Failed to load system data: {error ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
        System Overview
      </h1>

      {/* Database Stats */}
      <DatabaseStats tableCounts={data.tableCounts} enrichment={data.enrichment} />

      {/* Catalog Enrichment Progress */}
      <EnrichmentProgress enrichment={data.enrichment} />

      {/* Recent Sync Jobs */}
      <RecentSyncJobs jobs={data.recentSyncJobs} />

      {/* Schema Overview */}
      <SchemaOverview schema={data.schema} />

      {/* Environment Status */}
      <EnvironmentStatus envStatus={data.envStatus} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Database Stats
// ---------------------------------------------------------------------------
function DatabaseStats({
  tableCounts,
  enrichment,
}: {
  tableCounts: Record<string, number>;
  enrichment: SystemData["enrichment"];
}) {
  const tables = [
    {
      name: "catalog_games",
      label: "Catalog Games",
      extra: `${enrichment.enriched.toLocaleString()} enriched (${enrichment.percentage}%)`,
    },
    { name: "catalog_sync_status", label: "Sync Jobs" },
    { name: "users", label: "Users" },
    { name: "groups", label: "Groups" },
    { name: "group_members", label: "Group Members" },
    { name: "group_bookmarks", label: "Bookmarks" },
    { name: "shared_links", label: "Shared Links" },
    { name: "search_history", label: "Search History" },
    { name: "cached_member_libraries", label: "Cached Libraries" },
  ];

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Database Stats
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => (
          <div
            key={t.name}
            className="rounded-xl border border-white/[0.06] bg-zinc-900 p-4"
          >
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              {t.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-2xl font-bold text-zinc-50">
              {(tableCounts[t.name] ?? 0).toLocaleString()}
            </p>
            {t.extra && (
              <p className="mt-1 text-xs text-amber-400/80">{t.extra}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Enrichment Progress
// ---------------------------------------------------------------------------
function EnrichmentProgress({
  enrichment,
}: {
  enrichment: SystemData["enrichment"];
}) {
  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Catalog Enrichment Progress
      </h2>
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-zinc-400">
            {enrichment.enriched.toLocaleString()} of{" "}
            {enrichment.total.toLocaleString()} games enriched
          </span>
          <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-amber-400">
            {enrichment.percentage}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${Math.min(enrichment.percentage, 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recent Sync Jobs
// ---------------------------------------------------------------------------
function RecentSyncJobs({
  jobs,
}: {
  jobs: SystemData["recentSyncJobs"];
}) {
  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-400";
      case "failed":
        return "text-red-400";
      case "running":
        return "text-amber-400";
      default:
        return "text-zinc-400";
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  };

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Recent Sync Jobs
      </h2>
      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-500">No sync jobs recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-400">Type</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Items</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Started</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] bg-zinc-900/50">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-zinc-300">
                    {job.job_type}
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${statusColor(job.status)}`}>
                    {job.status}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-zinc-300">
                    {job.items_processed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {formatDate(job.started_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {formatDate(job.completed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Schema Overview
// ---------------------------------------------------------------------------
function SchemaOverview({
  schema,
}: {
  schema: SystemData["schema"];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (table: string) =>
    setExpanded((prev) => ({ ...prev, [table]: !prev[table] }));

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Schema Overview
      </h2>
      <div className="space-y-2">
        {schema.map((t) => (
          <div
            key={t.table}
            className="rounded-xl border border-white/[0.06] bg-zinc-900"
          >
            <button
              onClick={() => toggle(t.table)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-[family-name:var(--font-mono)] text-sm font-medium text-zinc-200">
                {t.table}
              </span>
              <span className="text-xs text-zinc-500">
                {t.columns.length} columns{" "}
                <span className="ml-1">{expanded[t.table] ? "▲" : "▼"}</span>
              </span>
            </button>
            {expanded[t.table] && (
              <div className="border-t border-white/[0.04] px-4 py-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th className="pb-2 font-medium text-zinc-500">Column</th>
                      <th className="pb-2 font-medium text-zinc-500">Type</th>
                      <th className="pb-2 font-medium text-zinc-500">PK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {t.columns.map((col) => (
                      <tr key={col.name}>
                        <td className="py-1.5 font-[family-name:var(--font-mono)] text-zinc-300">
                          {col.name}
                        </td>
                        <td className="py-1.5 text-zinc-400">{col.type}</td>
                        <td className="py-1.5">
                          {col.pk && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                              PK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Environment Status
// ---------------------------------------------------------------------------
function EnvironmentStatus({
  envStatus,
}: {
  envStatus: Record<string, boolean>;
}) {
  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50">
        Environment Status
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(envStatus).map(([key, configured]) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-900 px-4 py-3"
          >
            {configured ? (
              <svg
                className="h-4 w-4 shrink-0 text-emerald-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 shrink-0 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="font-[family-name:var(--font-mono)] text-xs text-zinc-300">
              {key}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
