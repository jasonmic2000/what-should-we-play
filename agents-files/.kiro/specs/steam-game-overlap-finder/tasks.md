# Implementation Plan: Steam Game Overlap Finder

## Overview

This plan implements a Next.js web application that helps groups of friends discover shared Steam games. The implementation follows a server-side processing approach with a single API endpoint handling profile resolution, game fetching, and overlap calculation. The client focuses on input collection and results display with a random game picker feature.

## Tasks

- [x] 1. Set up project structure and core types
  - Initialize Next.js 14+ project with TypeScript and App Router
  - Install dependencies: Tailwind CSS, Radix UI/shadcn/ui, Lucide React
  - Create folder structure: app/, components/, lib/, hooks/, __tests__/
  - Define TypeScript types in lib/types.ts (SteamProfile, SteamGame, GameLibrary, OverlapAnalysis, APIResponse, APIError)
  - Create lib/constants.ts with Steam API endpoints and configuration
  - Set up .env.example with STEAM_API_KEY placeholder
  - _Requirements: Project foundation for all subsequent tasks_

- [ ] 2. Implement Steam profile input parsing
  - [ ] 2.1 Create input parser utility
    - Implement parseSteamProfileInput() in lib/steam/input-parser.ts
    - Support vanity URLs (steamcommunity.com/id/username)
    - Support numeric profile URLs (steamcommunity.com/profiles/[ID])
    - Do NOT support raw SteamID64 input (Steam API limitation)
    - Return ParsedProfile with type ('steamid64' or 'vanity') and identifier
    - _Requirements: Design - Profile Input Parsing section, Requirement 1_
  
  - [ ]* 2.2 Write unit tests for input parser
    - Test vanity URL extraction
    - Test numeric profile URL extraction
    - Test invalid input handling (including raw SteamID64 rejection)
    - Test whitespace trimming
    - _Requirements: Design - Testing Strategy_

- [ ] 3. Implement profile resolution logic
  - [ ] 3.1 Create ProfileResolver service
    - Implement resolveProfile() in lib/steam/profile-resolver.ts
    - Call Steam API ISteamUser/ResolveVanityURL/v0001/ for vanity names
    - Handle success codes: 1 (success), 42 (not found)
    - Extract SteamID64 directly from numeric profile URLs
    - Return ResolvedProfile with steamId64, vanityName, profileUrl
    - Handle errors: INVALID_URL, VANITY_NOT_FOUND, PROFILE_NOT_FOUND, API_ERROR
    - _Requirements: Design - Component 2: ProfileResolver, Requirement 3_
  
  - [ ] 3.2 Implement batch resolution with strict failure handling
    - Implement resolveBatch() using Promise.all() for parallel processing
    - If any profile fails to resolve, fail the entire request (strict mode for MVP)
    - Return error response with PROFILE_RESOLUTION_FAILED code and failedProfile details
    - _Requirements: Design - Performance Considerations (parallel fetching), strict failure mode_
  
  - [ ]* 3.3 Write unit tests for profile resolver
    - Test vanity URL resolution with mocked Steam API (success code 1)
    - Test vanity URL not found (success code 42)
    - Test numeric profile URL extraction
    - Test error handling for each error type
    - Test batch resolution with mixed inputs
    - _Requirements: Design - Testing Strategy_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement game library fetching
  - [ ] 5.1 Create GameLibraryFetcher service
    - Implement fetchGames() in lib/steam/game-fetcher.ts
    - Call Steam API IPlayerService/GetOwnedGames/v0001/ with include_appinfo=1, include_played_free_games=1, format=json
    - Parse game data from SteamOwnedGamesResponse (handle optional name, img_icon_url, img_logo_url fields)
    - Construct header image URLs: https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg
    - Detect likely private/inaccessible libraries (missing games array or game_count=0 with no games)
    - Return GameLibrary with games array, gameCount, isPrivate flag
    - Handle errors: PRIVATE_LIBRARY, PROFILE_NOT_FOUND, API_ERROR
    - Note: Empty game arrays are treated as likely private libraries (best-effort detection)
    - _Requirements: Design - Component 3: GameLibraryFetcher, Requirement 4_
  
  - [ ] 5.2 Implement batch fetching with strict failure handling
    - Implement fetchBatch() using Promise.all() for concurrent requests
    - If any library is detected as private/inaccessible, fail the entire request (strict mode for MVP)
    - Return Map<string, GameLibrary> keyed by steamId64 only on complete success
    - _Requirements: Design - Performance Considerations (parallel fetching), strict failure mode_
  
  - [ ] 5.3 Implement player summary fetching
    - Create fetchPlayerSummaries() function
    - Call Steam API ISteamUser/GetPlayerSummaries/v0002/ with comma-separated steamids
    - Parse SteamPlayerSummariesResponse to extract personaname, avatar, profileurl
    - Return map of steamId64 to player summary data
    - _Requirements: Requirement 4.7_
  
  - [ ]* 5.4 Write unit tests for game fetcher
    - Test successful game fetching with mocked Steam API (with include_appinfo data)
    - Test game fetching without include_appinfo data (fallback to "Unknown Game")
    - Test private library detection (missing games array)
    - Test private library detection (game_count=0 with no games)
    - Test free-to-play game inclusion
    - Test header image URL construction
    - Test batch fetching with multiple profiles
    - Test player summaries fetching
    - _Requirements: Design - Testing Strategy_

- [ ] 6. Implement overlap calculation logic
  - [ ] 6.1 Create OverlapCalculator service
    - Implement calculateGameOverlap() in lib/steam/overlap-calculator.ts
    - Build map of appId to ownership (Set of steamId64s)
    - Filter games owned by ALL users
    - Return sorted array of shared games (alphabetical by name)
    - Throw error if any library is private or has errors (strict mode for MVP)
    - _Requirements: Design - Component 4: OverlapCalculator, Core Logic - Overlap Calculation_
  
  - [ ]* 6.2 Write unit tests for overlap calculator
    - Test overlap with 2 users, 3 users, 6 users
    - Test zero overlap scenario
    - Test complete overlap scenario
    - Test single game overlap
    - Test error handling for private libraries
    - Test sorting by game name
    - _Requirements: Design - Testing Strategy_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement API endpoint
  - [ ] 8.1 Create /api/find-overlap route handler
    - Create app/api/find-overlap/route.ts with POST handler
    - Validate request body (2-6 profiles array)
    - Parse all profile inputs using input-parser (trim whitespace, validate formats)
    - Resolve all profiles using ProfileResolver.resolveBatch() - fail entire request if any profile fails
    - Fetch all game libraries using GameLibraryFetcher.fetchBatch() - fail entire request if any library is private/inaccessible
    - Calculate overlap using OverlapCalculator.calculateGameOverlap()
    - Return APIResponse with profiles and sharedGames on success
    - Implement strict failure mode: any profile or library failure fails the entire request
    - _Requirements: Design - API Design, Single Endpoint: Find Overlap_
  
  - [ ] 8.2 Implement error handling
    - Handle INVALID_INPUT (invalid profile format, wrong count, unsupported format)
    - Handle PROFILE_RESOLUTION_FAILED (vanity URL not found, profile not found)
    - Handle PRIVATE_LIBRARY (empty/missing game list detected - strict failure mode)
    - Handle API_ERROR (Steam API unavailable, 5xx errors)
    - Include failedProfile in error response for debugging
    - Do not implement RATE_LIMIT handling in MVP (future enhancement)
    - _Requirements: Design - Error Handling (all scenarios), Requirement 7.6_
  
  - [ ]* 8.3 Write integration tests for API endpoint
    - Test successful flow with mocked Steam API
    - Test invalid input validation
    - Test profile resolution failure
    - Test private library handling
    - Test Steam API error handling
    - _Requirements: Design - Integration Testing Approach_

- [ ] 9. Implement frontend components
  - [ ] 9.1 Create ProfileInputForm component
    - Create components/ProfileInputForm.tsx
    - Render dynamic input fields (2-6 profiles, add/remove buttons)
    - Implement client-side validation (trim whitespace, validate URL formats - vanity and numeric only)
    - Reject raw SteamID64 input (17-digit numbers without URL context)
    - Prevent duplicate inputs (normalize and compare)
    - Display placeholder: "Paste Steam profile URLs"
    - Emit onSubmit with profiles array
    - _Requirements: Design - Component 1: ProfileInputForm, Requirement 14, Requirement 1_
  
  - [ ] 9.2 Create ResultsDisplay component
    - Create components/ResultsDisplay.tsx
    - Display list of shared games with header images
    - Show game name, appId, and playtime metadata
    - Implement client-side sorting (by name, by playtime)
    - Implement client-side filtering (text search)
    - Display user profile summaries
    - Handle empty state (zero shared games)
    - _Requirements: Design - Component 5: ResultsDisplay_
  
  - [ ] 9.3 Create RandomPicker component
    - Create components/RandomPicker.tsx
    - Implement pickRandomGame() function
    - Add animation using pickRandomGameWithAnimation() (20 iterations, 100ms interval)
    - Highlight picked game in results list
    - Provide "Pick a game for us" button
    - _Requirements: Design - Core Logic - Random Game Picker_
  
  - [ ] 9.4 Create error and loading components
    - Create components/ErrorBanner.tsx for error display
    - Create components/LoadingState.tsx for loading indicators
    - Display appropriate messages for each error type
    - _Requirements: Design - Error Handling_

- [ ] 10. Implement custom hooks
  - [ ] 10.1 Create useProfileInputs hook
    - Create hooks/useProfileInputs.ts
    - Manage profile input state (add, remove, validate)
    - Track validation errors per input
    - Prevent duplicates
    - _Requirements: Design - Component 1: ProfileInputForm_
  
  - [ ] 10.2 Create useFindOverlap hook
    - Create hooks/useFindOverlap.ts
    - Call POST /api/find-overlap endpoint
    - Manage loading, success, and error states
    - Parse and return API response
    - _Requirements: Design - API Design_

- [ ] 11. Build main page
  - [ ] 11.1 Create landing page
    - Create app/page.tsx with ProfileInputForm
    - Integrate useFindOverlap hook
    - Display ResultsDisplay when data available
    - Display ErrorBanner on errors
    - Display LoadingState during API calls
    - Wire up RandomPicker component
    - _Requirements: Design - Main User Flow_
  
  - [ ] 11.2 Add styling and layout
    - Configure Tailwind CSS in app/globals.css
    - Create responsive layout in app/layout.tsx
    - Style all components for clean, modern UI
    - Add game card styling with header images
    - _Requirements: Design - Dependencies (Tailwind CSS)_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All Steam API calls use parallel fetching with Promise.all() for performance
- **Strict failure mode for MVP**: Any profile resolution failure or private/inaccessible library fails the entire request
- Partial success handling is a future enhancement
- TypeScript is used throughout for type safety
- Steam API key must be configured in .env.local before running
- Header images provide better visual display than icon images from API
- Rate limit handling (RATE_LIMIT error code) is not implemented in MVP - future enhancement
