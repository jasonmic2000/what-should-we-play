import { NextRequest, NextResponse } from "next/server";
import {
  runBackfillSync,
  runIncrementalSync,
  runDetailEnrichment,
} from "@/lib/steam/catalog-sync";
import logger from "@/lib/logger";

const ENRICHMENT_LIMIT = 100;

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job");
  const jobType = job ?? "incremental";
  const startTime = Date.now();

  logger.info({ msg: "sync-job-start", jobType });

  try {
    let result;

    switch (job) {
      case "backfill":
        result = await runBackfillSync();
        break;
      case "enrich":
        result = await runDetailEnrichment(ENRICHMENT_LIMIT);
        break;
      default:
        result = await runIncrementalSync();
        break;
    }

    logger.info({
      msg: "sync-job-complete",
      jobType,
      status: result.status,
      itemsProcessed: result.itemsProcessed,
      durationMs: Date.now() - startTime,
    });

    const statusCode = result.status === "completed" ? 200 : 500;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    logger.error({
      msg: "sync-job-error",
      jobType,
      errorMessage: message,
    });

    return NextResponse.json(
      { jobType, status: "failed", errorMessage: message },
      { status: 500 },
    );
  }
}
