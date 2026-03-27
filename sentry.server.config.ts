import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Only capture errors — no performance monitoring or session replay
  tracesSampleRate: 0,
});
