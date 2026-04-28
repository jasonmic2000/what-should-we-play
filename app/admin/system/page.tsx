export default function SystemOverviewPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
        System Overview
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Database stats, catalog sync status, and environment info will appear
        here.
      </p>
    </div>
  );
}
