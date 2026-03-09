# Steam API Updates - Implementation Notes

## Summary of Changes

Based on actual Steam API testing, the following updates have been made to the spec and implementation:

## Key Changes

### 1. Raw SteamID64 Input No Longer Supported

**Reason**: Steam API does not provide username-to-SteamID lookup, and usernames can have duplicates.

**Impact**:
- Users MUST provide full Steam profile URLs
- Supported formats:
  - Vanity URL: `https://steamcommunity.com/id/jasonmic2000/`
  - Numeric URL: `https://steamcommunity.com/profiles/76561198869927026/`
- Raw 17-digit SteamID64 input is rejected

**Updated Files**:
- `lib/types.ts` - Updated comments
- `lib/steam/input-parser.ts` - Removed raw SteamID64 parsing
- Design document - Updated input parsing section
- Requirements document - Updated Requirement 1
- Tasks document - Updated Task 2.1

### 2. Actual Steam API Endpoints

**GetPlayerSummaries** (for profile metadata):
```
GET http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/
Params: key, steamids (comma-separated)
```

Response structure:
```typescript
{
  response: {
    players: SteamPlayerSummary[]
  }
}
```

**GetOwnedGames** (for game library):
```
GET http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/
Params: key, steamid, include_appinfo, include_played_free_games, format
```

Response structure:
```typescript
{
  response: {
    game_count: number
    games?: SteamOwnedGame[] // May be missing if private
  }
}
```

**ResolveVanityURL** (for vanity name resolution):
```
GET http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/
Params: key, vanityurl
```

Response structure:
```typescript
{
  response: {
    steamid?: string // Present when success = 1
    success: 1 | 42  // 1 = success, 42 = not found
  }
}
```

### 3. Updated Type Definitions

**New Steam API Response Types** (added to `lib/types.ts`):
- `SteamPlayerSummary` - Player profile info
- `SteamPlayerSummariesResponse` - GetPlayerSummaries response wrapper
- `SteamOwnedGame` - Individual game from GetOwnedGames
- `SteamOwnedGamesResponse` - GetOwnedGames response wrapper
- `SteamResolveVanityURLResponse` - ResolveVanityURL response wrapper

**Updated Game Data**:
- Removed `playtime2Weeks` (not in actual API response)
- Added `rtimeLastPlayed` (Unix timestamp of last play session)
- Game name, icon, and logo are optional (only present with `include_appinfo=1`)

### 4. Updated Constants

**New in `lib/constants.ts`**:
- `STEAM_API_ENDPOINTS` - Object with all three endpoint URLs
- `VANITY_URL_RESOLUTION` - Success codes (1 = success, 42 = not found)
- Helper functions: `getGameHeaderImageUrl()`, `getGameIconUrl()`, `getGameLogoUrl()`

### 5. Private Library Detection

**Updated Logic**:
- Check if `games` array is missing from response
- Check if `game_count` is 0 with no `games` array
- These are heuristics (best-effort detection)

### 6. Player Summary Integration

**New Requirement**:
- Fetch player summaries using GetPlayerSummaries to get:
  - `personaname` (display name)
  - `avatar` / `avatarfull` (profile picture)
  - `profileurl` (canonical profile URL)

**Implementation**:
- Add `fetchPlayerSummaries()` function in game-fetcher service
- Call with comma-separated list of SteamID64s
- Merge results with resolved profiles

## Implementation Checklist

- [x] Update `lib/types.ts` with Steam API response types
- [x] Update `lib/steam/input-parser.ts` to remove raw SteamID64 support
- [x] Update `lib/constants.ts` with actual API endpoints
- [x] Update design document with correct API details
- [x] Update requirements document with correct acceptance criteria
- [x] Update tasks document with implementation details
- [ ] Implement ProfileResolver with correct API endpoint and success codes
- [ ] Implement GameLibraryFetcher with correct response parsing
- [ ] Implement PlayerSummary fetching
- [ ] Handle optional game metadata (name, icons) with fallbacks

## Testing Notes

When testing with actual Steam API:
1. Use `include_appinfo=1` to get game names and icons
2. Use `include_played_free_games=1` to include F2P games
3. Use `format=json` for JSON responses
4. Check for `success: 42` in ResolveVanityURL for "not found"
5. Check for missing `games` array to detect private libraries
6. Provide fallback values for missing game metadata

## API Key Setup

1. Get API key from: https://steamcommunity.com/dev/apikey
2. Add to `.env.local`: `STEAM_API_KEY=your_key_here`
3. Never commit API key to version control
