import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock catalog-sync module
// ---------------------------------------------------------------------------

const runBackfillSyncMock = vi.fn();
const runIncrementalSyncMock = vi.fn();
const runDetailEnrichmentMock = vi.fn();

vi.mock("@/lib/steam/catalog-sync", () => ({
  runBackfillSync: (...args: unknown[]) => runBackfillSyncMock(...args),
  runIncrementalSync: (...args: unknown[]) => runIncrementalSyncMock(...args),
  runDetailEnrichment: (...args: unknown[]) => runDetailEnrichmentMock(...args),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

function makeRequest(
  job?: string,
  authHeader?: string,
): NextRequest {
  const url = job
    ? `http://localhost/api/cron/sync-catalog?job=${job}`
    : "http://localhost/api/cron/sync-catalog";

  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }

  return new NextRequest(url, { method: "GET", headers });
}

describe("GET /api/cron/sync-catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  // -----------------------------------------------------------------------
  // Auth verification
  // -----------------------------------------------------------------------

  it("returns 401 when authorization header is missing", async () => {
    const request = makeRequest();
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when authorization header has wrong secret", async () => {
    const request = makeRequest(undefined, "Bearer wrong-secret");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when CRON_SECRET env var is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const request = makeRequest(undefined, "Bearer test-secret");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  // -----------------------------------------------------------------------
  // Job routing
  // -----------------------------------------------------------------------

  it("runs incremental sync by default (no job param)", async () => {
    runIncrementalSyncMock.mockResolvedValue({
      jobType: "incremental",
      status: "completed",
      itemsProcessed: 5,
    });

    const request = makeRequest(undefined, "Bearer test-secret");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobType).toBe("incremental");
    expect(runIncrementalSyncMock).toHaveBeenCalledOnce();
    expect(runBackfillSyncMock).not.toHaveBeenCalled();
    expect(runDetailEnrichmentMock).not.toHaveBeenCalled();
  });

  it("runs backfill sync when job=backfill", async () => {
    runBackfillSyncMock.mockResolvedValue({
      jobType: "backfill",
      status: "completed",
      itemsProcessed: 100,
    });

    const request = makeRequest("backfill", "Bearer test-secret");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobType).toBe("backfill");
    expect(runBackfillSyncMock).toHaveBeenCalledOnce();
  });

  it("runs detail enrichment when job=enrich", async () => {
    runDetailEnrichmentMock.mockResolvedValue({
      jobType: "enrichment",
      status: "completed",
      itemsProcessed: 50,
    });

    const request = makeRequest("enrich", "Bearer test-secret");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobType).toBe("enrichment");
    expect(runDetailEnrichmentMock).toHaveBeenCalledOnce();
  });

  it("returns 500 when sync job reports failed status", async () => {
    runIncrementalSyncMock.mockResolvedValue({
      jobType: "incremental",
      status: "failed",
      itemsProcessed: 0,
      errorMessage: "Network failure",
    });

    const request = makeRequest(undefined, "Bearer test-secret");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe("failed");
    expect(body.errorMessage).toBe("Network failure");
  });

  it("returns 500 with error message when sync job throws", async () => {
    runIncrementalSyncMock.mockRejectedValue(new Error("Unexpected crash"));

    const request = makeRequest(undefined, "Bearer test-secret");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe("failed");
    expect(body.errorMessage).toBe("Unexpected crash");
  });
});
