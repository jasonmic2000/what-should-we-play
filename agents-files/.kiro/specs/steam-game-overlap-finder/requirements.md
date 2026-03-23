# Requirements Document: Steam Game Overlap Finder

## Introduction

The Steam Game Overlap Finder is a web application that helps groups of 2-6 friends discover which games they can play together. The system accepts Steam profile URLs, resolves them to Steam accounts, fetches each user’s owned games from the Steam Web API, computes overlap on the server, and enriches the results using a local game catalog stored by the application.

The key architectural decision is that Steam remains the source of truth for user ownership, while the application maintains its own game catalog for enrichment data such as free-to-play classification, pricing snapshots, and multiplayer metadata. This keeps MVP behavior simple while avoiding an architecture that would require many Steam API calls per game at request time.

This requirements document defines the functional and non-functional requirements for both the MVP user experience and the backend architecture needed to support the future roadmap.

**Important Notes**

- Raw SteamID64 input is not supported. Users must provide Steam profile URLs.
- The MVP user-facing flow remains simple: show games owned by all users.
- The architecture must support future features such as free-to-play suggestions, ownership-threshold recommendations, multiplayer filtering, and ranking by recent activity without major redesign.

## Glossary

- **System**: The Steam Game Overlap Finder web application
- **User**: A person using the application to find games for a group
- **Steam_Profile**: A Steam account identified by a vanity or numeric profile URL
- **SteamID64**: A 17-digit numeric Steam account identifier
- **Vanity_URL**: A Steam profile URL in the format `steamcommunity.com/id/[username]`
- **Numeric_Profile_URL**: A Steam profile URL in the format `steamcommunity.com/profiles/[SteamID64]`
- **Owned_Library**: The set of games a Steam user owns
- **Shared_Games**: Games owned by all users in the request
- **Candidate_Games**: Future recommendation set of games owned by some, but not all, members of the party
- **Catalog_Record**: A locally stored representation of a Steam app and its metadata
- **Game_Catalog**: The application-managed local database of Steam app metadata
- **Catalog_Sync**: Background processes that populate and refresh the local Game_Catalog
- **Enrichment**: Joining overlap results with local metadata such as `isFree`, pricing, and play-mode flags
- **API_Route**: The application endpoint `/api/find-overlap`
- **Recently_Played_Data**: Steam data from `IPlayerService/GetRecentlyPlayedGames/v0001/`, stored or used internally for future ranking features

## Non-Goals / Out of Scope for MVP

The following are explicitly excluded from the MVP user experience:

1. Partial success mode when some profiles fail and others succeed
2. Shareable result links
3. Saved groups or analysis history
4. Discord integration
5. Account auth and billing enforcement in production
6. Ownership-threshold recommendations such as “3 out of 5 own this”
7. Multiplayer-only filtering in the public UI
8. Ranking by recently played signals in the public UI
9. Dynamic price comparisons or purchase suggestions in the public UI
10. Real-time catalog refresh during user requests
11. Complex rate-limit countdown UX

These are out of scope for MVP behavior, but the backend architecture must leave room for them.

## Requirements

### Requirement 1: Profile Input Collection

**User Story:** As a user, I want to input 2-6 Steam profile URLs so that I can analyze my group’s shared games.

#### Acceptance Criteria

1. THE System SHALL accept between 2 and 6 profile inputs per analysis request
2. THE System SHALL accept vanity profile URLs
3. THE System SHALL accept numeric profile URLs
4. THE System SHALL NOT accept raw SteamID64 input without URL context
5. WHEN a User submits duplicate profiles, THE System SHALL prevent submission and return a duplicate error
6. THE System SHALL provide placeholder guidance indicating that Steam profile URLs are required

### Requirement 2: Profile Validation and Resolution

**User Story:** As a user, I want invalid or unresolvable profiles to fail clearly so that I can fix them quickly.

#### Acceptance Criteria

1. WHEN a profile input does not match a supported Steam profile URL format, THE System SHALL return `INVALID_INPUT`
2. WHEN a profile input is a vanity URL, THE System SHALL call `ISteamUser/ResolveVanityURL/v0001/`
3. WHEN `ResolveVanityURL` returns success code `1`, THE System SHALL use the returned `steamid`
4. WHEN `ResolveVanityURL` returns success code `42`, THE System SHALL return `PROFILE_RESOLUTION_FAILED`
5. WHEN profile resolution fails, THE System SHALL include the failed profile input in the error response
6. THE System SHALL resolve all profiles to SteamID64 before fetching ownership data

### Requirement 3: Live Ownership Retrieval

**User Story:** As a user, I want the system to retrieve current owned libraries from Steam so that results reflect actual ownership.

#### Acceptance Criteria

1. WHEN all profiles are resolved, THE System SHALL fetch owned games using `IPlayerService/GetOwnedGames/v0001/`
2. WHEN calling `GetOwnedGames`, THE System SHALL send `include_appinfo=1`
3. WHEN calling `GetOwnedGames`, THE System SHALL send `include_played_free_games=1`
4. WHEN calling `GetOwnedGames`, THE System SHALL send `format=json`
5. WHEN fetching multiple owned libraries, THE System SHALL do so concurrently
6. THE System SHALL fetch player summaries using `ISteamUser/GetPlayerSummaries/v0002/`
7. THE System SHALL treat Steam as the source of truth for current ownership

### Requirement 4: Private or Inaccessible Library Handling

**User Story:** As a user, I want clear feedback when a Steam library cannot be accessed so that I know what needs fixing.

#### Acceptance Criteria

1. WHEN `GetOwnedGames` returns a response without a `games` array, THE System SHALL treat the library as private or inaccessible
2. WHEN any required library is private or inaccessible, THE System SHALL fail the full request in MVP mode
3. WHEN a private or inaccessible library is detected, THE System SHALL return `PRIVATE_LIBRARY`
4. WHEN a `PRIVATE_LIBRARY` error occurs, THE System SHALL provide a clear explanation that game details must be public

### Requirement 5: Overlap Calculation

**User Story:** As a user, I want to see games owned by all members of my group so that I know what we can play immediately.

#### Acceptance Criteria

1. THE System SHALL calculate overlap on the server side
2. THE System SHALL identify games by `appId`
3. WHEN a game appears in all owned libraries, THE System SHALL include it in `sharedGames`
4. WHEN a game appears in fewer than all owned libraries, THE System SHALL exclude it from the MVP `sharedGames` result
5. THE System SHALL sort `sharedGames` alphabetically by name by default
6. WHEN no games are shared by all users, THE System SHALL return an empty `sharedGames` array

### Requirement 6: Local Catalog Enrichment

**User Story:** As a user, I want shared games to include stable metadata without requiring many Steam lookups per request.

#### Acceptance Criteria

1. THE System SHALL maintain a local Game_Catalog separate from live ownership retrieval
2. THE System SHALL join overlap results against the local Game_Catalog before returning enriched results
3. THE local Game_Catalog SHALL support storage of, at minimum, `appId`, `name`, and free-to-play classification
4. THE local Game_Catalog SHALL support future storage of pricing snapshots
5. THE local Game_Catalog SHALL support future storage of multiplayer-related metadata flags
6. WHEN catalog metadata is unavailable for a game, THE System SHALL still be able to return the game using available Steam ownership data

### Requirement 7: Catalog Population and Refresh

**User Story:** As a system operator, I want the game catalog to be populated and refreshed asynchronously so that request-time performance remains stable.

#### Acceptance Criteria

1. THE System SHALL support an initial catalog backfill using Steam app list data
2. THE System SHALL support asynchronous catalog refresh jobs
3. THE System SHALL support incremental catalog refresh using `if_modified_since` or equivalent provider-supported mechanisms where available
4. THE System SHALL NOT depend on live per-game enrichment API calls during overlap requests
5. THE System SHALL track when catalog records were last refreshed

### Requirement 8: Recently Played Backend Support

**User Story:** As a product owner, I want backend support for recently played data so that ranking features can be added later without redesigning the Steam integration layer.

#### Acceptance Criteria

1. THE System SHALL support calling `IPlayerService/GetRecentlyPlayedGames/v0001/` in backend services
2. THE System SHALL define response types and internal service boundaries for recently played data
3. THE MVP `POST /api/find-overlap` response SHALL NOT include recently played data
4. THE System SHALL be able to add recently played ranking later without replacing the ownership-fetch architecture

### Requirement 9: Multiplayer Metadata Support

**User Story:** As a product owner, I want the catalog to support group-playability metadata so that future filtering and ranking can use it.

#### Acceptance Criteria

1. THE local Game_Catalog SHALL support future fields such as `hasOnlineCoop`, `hasOnlinePvp`, `hasLan`, and `hasSharedSplitScreen`
2. THE local Game_Catalog SHALL support a derived `isGroupPlayable` field or equivalent derived view
3. THE MVP overlap endpoint SHALL NOT require multiplayer filtering to return results
4. THE architecture SHALL allow multiplayer filtering to be added later without requiring per-game Steam API calls during overlap requests

### Requirement 10: Free-to-Play and Entitlement Filtering

**User Story:** As a product owner, I want free-to-play visibility controlled on the backend so that plan-based access cannot be bypassed in the client.

#### Acceptance Criteria

1. THE System SHALL classify games as free or paid using local catalog metadata
2. THE MVP response SHALL default to excluding free-to-play titles from `sharedGames`
3. THE System SHALL apply free-to-play filtering on the server side before returning results
4. THE architecture SHALL support future entitlement-aware inclusion of free-to-play titles for paid users
5. THE architecture SHALL support future client-side show/hide controls for free-to-play titles only after the backend has authorized their inclusion

### Requirement 11: Future Ownership-Threshold Recommendations

**User Story:** As a product owner, I want the architecture to support recommending games that some, but not all, party members own so that future paid features can include purchase suggestions.

#### Acceptance Criteria

1. THE overlap calculation layer SHALL be designed so that ownership thresholds other than “all users” can be added later
2. THE local catalog SHALL support attaching pricing metadata to future recommendation candidates
3. THE MVP endpoint SHALL remain limited to games owned by all users
4. THE architecture SHALL support future candidate-game responses without replacing the current overlap pipeline

### Requirement 12: API Response Structure

**User Story:** As a frontend developer, I want a stable response format so that I can render success and error states reliably.

#### Acceptance Criteria

1. THE API_Route SHALL return responses with a `success` boolean
2. WHEN successful, THE API_Route SHALL return `profiles` and `sharedGames`
3. WHEN unsuccessful, THE API_Route SHALL return an `error` object
4. THE `error` object SHALL include `code` and `message`
5. THE `error` object MAY include `failedProfile` and `details`
6. THE MVP response SHALL NOT expose internal-only metadata such as recently played data

### Requirement 13: Security and Secrets

**User Story:** As a system administrator, I want secrets and entitlement-sensitive data protected so that users cannot access restricted information through the client.

#### Acceptance Criteria

1. THE System SHALL store the Steam API key only in server-side environment variables
2. THE System SHALL never expose the Steam API key in client code or API responses
3. THE System SHALL make Steam API requests from server-side code only
4. THE System SHALL enforce free-to-play filtering on the backend for non-entitled users

### Requirement 14: Performance and Rate-Limit Strategy

**User Story:** As a system operator, I want request-time Steam usage kept predictable so that the application remains viable under API limits.

#### Acceptance Criteria

1. THE System SHALL restrict request-time Steam usage to live ownership and profile-related calls needed for the current request
2. THE System SHALL NOT depend on per-game Steam metadata lookups during overlap requests
3. THE System SHALL use concurrent fetching for per-profile Steam calls
4. THE System SHALL move catalog enrichment work to asynchronous sync processes instead of overlap request paths

