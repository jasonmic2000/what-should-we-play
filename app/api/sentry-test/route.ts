// Temporary route to verify Sentry error capture. Delete after confirming.
export async function GET() {
  throw new Error("Sentry test error — if you see this in Sentry, it works!");
}
