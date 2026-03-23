# Implementation Plan: Steam Game Overlap Finder

## Overview

This plan updates the project from a pure request-time Steam integration model to a dual-source architecture:

- live ownership data from Steam
- local game catalog data from the application database

The MVP remains simple for users, but implementation work should prioritize backend shapes that will not need to be replaced when free-to-play entitlements, multiplayer filtering, pricing, and recommendation features are added later.

## Tasks

- [ ] 1. Expand domain and integration types
  - Extend `lib/types.ts` to model fuller Steam API responses
  - Add types for recently played responses
  - Add local catalog types such as `CatalogGame`, sync timestamps, and multiplayer flags
  - Add enriched shared-game response types that can stay stable as the catalog grows
  - _Requirements: 6, 8, 9, 12_

- [ ] 2. Extend Steam API constants and client wrappers
  - Add `GetRecentlyPlayedGames` endpoint constants
  - Add typed API wrappers for owned games, player summaries, vanity resolution, and recently played data
  - Keep `https`, `include_appinfo=1`, and `include_played_free_games=1` in the owned-games call path
  - Keep Steam-specific request construction isolated from business logic
  - _Requirements: 3, 8, 14_

- [ ] 3. Refine profile parsing and resolution flow
  - Preserve current support for vanity and numeric profile URLs
  - Keep duplicate detection at both input and resolved-SteamID levels
  - Ensure error responses remain consistent after the type refactor
  - Update unit tests if response or error shapes change
  - _Requirements: 1, 2, 12_

- [ ] 4. Stabilize the live ownership pipeline
  - Keep owned-library fetching in a dedicated service
  - Ensure private-library detection follows the documented heuristics
  - Keep player summary fetching separate from overlap calculation
  - Confirm tests cover live ownership fetch behavior with mocked Steam responses
  - _Requirements: 3, 4, 14_

- [ ] 5. Add backend-only recently played support
  - Implement a service boundary for `GetRecentlyPlayedGames`
  - Add types and tests for recently played responses
  - Do not expose recently played data in `/api/find-overlap` yet
  - Keep this support internal and future-facing
  - _Requirements: 8_

- [ ] 6. Design and implement catalog persistence
  - Choose and set up the initial database approach
  - Create schema/tables for game catalog records and sync status
  - Support at minimum: `appId`, `name`, `isFree`, metadata timestamps
  - Leave room for price and multiplayer-related metadata fields
  - _Requirements: 6, 7, 9_

- [ ] 7. Implement catalog repository and enrichment layer
  - Create repository methods for batch lookup by `appId`
  - Build an enrichment layer that joins shared games with catalog metadata
  - Ensure missing catalog metadata does not break MVP overlap responses
  - Filter F2P titles on the backend by default for MVP/free-tier behavior
  - _Requirements: 6, 10, 12_

- [ ] 8. Build catalog sync jobs
  - Implement initial backfill from Steam app-list data
  - Implement incremental or timestamp-based refresh flow where provider support exists
  - Track sync status, failures, and last-refresh timestamps
  - Keep sync jobs fully outside the request-time overlap path
  - _Requirements: 7, 14_

- [ ] 9. Refactor overlap calculation for roadmap compatibility
  - Keep strict “owned by all users” behavior for MVP output
  - Structure the calculator so ownership-count logic can support threshold recommendations later
  - Keep shared-game output stable while preserving future extensibility
  - Update overlap tests to reflect any enriched response changes
  - _Requirements: 5, 11_

- [ ] 10. Update `/api/find-overlap` to use catalog enrichment
  - Keep the public response shape to `{ profiles, sharedGames }`
  - Use live Steam ownership for the overlap set
  - Join shared appIds against the local catalog
  - Apply backend filtering policy before returning results
  - Do not include recently played data yet
  - _Requirements: 6, 10, 12_

- [ ] 11. Prepare policy hooks for plan-based features
  - Define internal policy boundaries for free-tier vs future paid-tier behavior
  - Default current behavior to exclude F2P titles
  - Keep room for future paid-tier inclusion of F2P suggestions
  - Keep room for future ownership-threshold and pricing-aware recommendation outputs
  - _Requirements: 10, 11_

- [ ] 12. Rework tests around the new architecture
  - Update service tests for expanded Steam response types
  - Add tests for recently played service boundaries
  - Add tests for catalog enrichment behavior
  - Add tests verifying that F2P titles are filtered server-side by default
  - Keep route tests focused on orchestration and response contract stability
  - _Requirements: 8, 10, 12_

- [ ] 13. Update frontend integration for the stable MVP contract
  - Keep the current user-facing flow focused on shared games owned by all users
  - Ensure the frontend continues to consume `{ profiles, sharedGames }`
  - Do not add UI for recently played data yet
  - Leave room for future F2P toggles only after backend authorization exists
  - _Requirements: 10, 12_

- [ ] 14. Add operational documentation
  - Document required environment variables
  - Document catalog sync strategy and expected refresh behavior
  - Document how live ownership differs from local metadata
  - Document roadmap assumptions around pricing, multiplayer flags, and threshold recommendations
  - _Requirements: 7, 13, 14_

## Notes

- Current code already covers parts of profile parsing, profile resolution, owned-library fetching, overlap calculation, and route-level orchestration. The next implementation steps should adapt those pieces to the new catalog-first enrichment model instead of replacing them blindly.
- The MVP must stay simple at the API boundary even as the backend architecture expands.
- Avoid introducing per-game live Steam calls into `/api/find-overlap`.
- Treat recently played support as backend capability only until ranking becomes a shipped feature.
- Keep entitlement-sensitive filtering on the backend, not in the frontend.
