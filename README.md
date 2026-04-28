# What Should We Play?

A web app that helps groups of 2-6 Steam friends discover which games they all own in common. Paste Steam profile URLs, find your overlap, and stop arguing about what to play.

**Live:** [whatshouldweplay.potatoes.party](https://whatshouldweplay.potatoes.party)

> 🚧 This project is actively in development. Features are being added regularly.

## Features

- **Game Overlap Finder** — paste 2-6 Steam profile URLs and instantly see every game the group owns in common
- **Recently Played Ranking** — shared games are sorted by what the group has been playing recently
- **Multiplayer Filter** — toggle to show only games with multiplayer support
- **Catalog Enrichment** — 160k+ Steam games cataloged locally with metadata (free-to-play, multiplayer tags, pricing)
- **User Accounts** — sign up with email/password, link your Steam account via Steam OpenID
- **Groups** — create named groups with role-based access (admin/member), run overlap anytime
- **Bookmarks** — admins can bookmark games for the group (paid feature)
- **Shareable Links** — generate temporary 24h links to share overlap results with friends
- **Event-Driven Notifications** — see new games that match your group's overlap since your last visit (paid feature)
- **Search History** — view past overlap searches from your profile (paid feature)
- **Admin Dashboard** — internal observability with Swagger UI, system stats, architecture diagram, and API health monitoring

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 |
| Database | PostgreSQL via [Supabase](https://supabase.com) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [Supabase Auth](https://supabase.com/auth) + Steam OpenID |
| State Management | [Zustand](https://zustand.docs.pmnd.rs) |
| Testing | [Vitest](https://vitest.dev) (199 tests) |
| Error Tracking | [Sentry](https://sentry.io) |
| Analytics | [PostHog](https://posthog.com) + [Vercel Analytics](https://vercel.com/analytics) |
| Logging | [Pino](https://getpino.io) (structured JSON) |
| Hosting | [Vercel](https://vercel.com) |
| CI/CD | GitHub Actions + Vercel |

## Architecture

```
Browser → Next.js App Router
           ├── /api/find-overlap → Profile Resolver → Steam API
           │                     → Game Fetcher → Steam API
           │                     → Overlap Calculator
           │                     → Result Enricher → Catalog Repository → PostgreSQL
           │                     → Recently Played → Steam API
           │                     → In-Memory Cache (LRU)
           │                     → Rate Limiter
           ├── /api/groups/*    → Group Repository → PostgreSQL
           ├── /api/auth/*      → Supabase Auth + Steam OpenID
           ├── /api/cron/*      → Catalog Sync → Steam API → PostgreSQL
           └── /api/admin/*     → System Stats, Health Checks
```

Key architectural decisions:
- **Steam is the source of truth for ownership** — libraries are fetched live per request
- **Local catalog for metadata** — game enrichment data (free-to-play, multiplayer tags) is stored locally and synced asynchronously via background jobs
- **No per-game API calls at request time** — catalog enrichment happens in background cron jobs, never during user requests
- **Event-driven notifications** — library diffs are computed on page visit, not via polling, to stay within Steam API rate limits
- **Graceful degradation** — missing catalog data never blocks a response; enrichment is best-effort

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jasonmic2000/what-should-we-play.git
   cd what-should-we-play
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   ```
   STEAM_API_KEY=           # From steamcommunity.com/dev/apikey
   DATABASE_URL=            # Supabase connection string (transaction pooler, port 6543)
   NEXT_PUBLIC_SUPABASE_URL=    # Supabase project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon/public key
   SENTRY_DSN=              # Sentry DSN (optional for local dev)
   NEXT_PUBLIC_SENTRY_DSN=  # Same as SENTRY_DSN
   CRON_SECRET=             # Any secret string for cron job auth
   ADMIN_EMAILS=            # Comma-separated admin email addresses
   ```

4. Run database migrations:
   ```bash
   npx drizzle-kit migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Populating the Game Catalog

The app needs a local catalog of Steam games for enrichment features (F2P filtering, multiplayer tags). Run the backfill:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/sync-catalog?job=backfill"
```

Then enrich games with metadata:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/sync-catalog?job=enrich"
```

The enrichment processes 100 games per run. Run it multiple times or set up a loop for bulk enrichment.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run all tests (Vitest) |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio |

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── find-overlap/       # Core overlap endpoint
│   │   ├── groups/             # Group CRUD, members, bookmarks, share, notifications
│   │   ├── auth/               # Login, logout, Steam OpenID linking
│   │   ├── cron/               # Catalog sync jobs
│   │   ├── admin/              # Admin dashboard APIs
│   │   ├── search-history/     # Search history recording/retrieval
│   │   └── shared/             # Public shared link endpoint
│   ├── admin/                  # Admin dashboard pages
│   ├── auth/                   # Login/signup pages
│   ├── groups/                 # Group management pages
│   ├── profile/                # User profile page
│   ├── shared/                 # Public shared link page
│   └── page.tsx                # Landing page + search flow
├── components/                 # React components
├── lib/
│   ├── steam/                  # Steam API integration
│   ├── db/                     # Database repositories (Drizzle)
│   ├── supabase/               # Supabase client helpers
│   ├── cache.ts                # In-memory TTL cache
│   ├── rate-limiter.ts         # Sliding window rate limiter
│   ├── store.ts                # Zustand state management
│   ├── types.ts                # All TypeScript types
│   └── openapi-spec.ts         # OpenAPI 3.0 specification
└── drizzle/                    # Database migrations
```

## Testing

199 tests across 22 test files covering:
- Steam API integration (profile resolution, game fetching, overlap calculation)
- Caching behavior (TTL, bypass, rate limiting)
- Catalog sync (backfill, incremental, enrichment)
- Result enrichment (F2P filtering, multiplayer filtering, recently played ranking)
- Group management (CRUD, roles, bookmarks, shared links, notifications)
- User management (repository operations)
- Search gating (localStorage-based anonymous limit)
- API route orchestration (request validation, error handling, rate limiting)

```bash
npm run test
```

## License

This project is not currently licensed for redistribution. All rights reserved.
