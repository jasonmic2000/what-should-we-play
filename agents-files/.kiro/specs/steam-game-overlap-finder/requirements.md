# Requirements Document: Steam Game Overlap Finder

## Introduction

The Steam Game Overlap Finder is a web application that enables groups of 2-6 friends to discover which games they can play together by analyzing their Steam game libraries. The system accepts Steam profile URLs (vanity or numeric format), fetches game ownership data via the Steam Web API, computes the intersection of owned games, and presents the results with an optional random game picker for quick decision-making.

This requirements document defines the functional and non-functional requirements derived from the technical design, ensuring all business needs and technical constraints are captured in testable, EARS-compliant acceptance criteria.

**Important Note**: Raw SteamID64 input is not supported due to Steam API limitations (no username-to-SteamID lookup, potential username duplicates). Users must provide full Steam profile URLs.

## Glossary

- **System**: The Steam Game Overlap Finder web application
- **User**: A person using the application to find shared games
- **Steam_Profile**: A Steam user account identified by SteamID64 or vanity URL
- **SteamID64**: A 17-digit numeric identifier for a Steam user account
- **Vanity_URL**: A custom Steam profile URL in the format steamcommunity.com/id/username
- **Numeric_Profile_URL**: A Steam profile URL containing a SteamID64 in the format steamcommunity.com/profiles/[SteamID64]
- **Game_Library**: The collection of games owned by a Steam user
- **Private_Library**: A game library with privacy settings that prevent public access
- **Shared_Games**: Games owned by all users in the analysis group
- **Profile_Input**: A user-provided Steam profile URL (vanity or numeric format only)
- **Overlap_Calculation**: The process of computing the intersection of game libraries
- **Steam_API**: The Steam Web API service used for profile resolution and game data retrieval
- **API_Route**: The server-side endpoint /api/find-overlap that handles all backend logic
- **Random_Picker**: A client-side feature that selects a random game from shared games
- **Header_Image**: A 460x215px game image from Steam CDN used for display

## Non-Goals / Out of Scope for MVP

The following features are explicitly excluded from the MVP to maintain focus on core functionality and enable faster delivery:

1. **Rate Limit Handling**: The MVP does not implement RATE_LIMIT error code or countdown timers for Steam API rate limits. This is a future enhancement.

2. **Partial Success Mode**: The MVP uses strict failure handling where any profile resolution failure or private/inaccessible library fails the entire request. Partial success (showing results when at least 2 profiles succeed) is a future enhancement.

3. **Multiplayer/Co-op Filtering**: The MVP shows ownership overlap only, without filtering for multiplayer compatibility or co-op support.

4. **Shareable Result Links**: The MVP does not generate shareable URLs for results. All state is ephemeral.

5. **Saved Groups**: The MVP does not persist profile groups or analysis history.

6. **Discord Integration**: No integration with Discord or other platforms.

7. **Advanced Game Metadata**: The MVP does not show genres, tags, player counts, or weighted playtime recommendations.

8. **Flexible Ownership Thresholds**: The MVP only shows games owned by ALL users. Showing games owned by N out of M users is a future enhancement.

9. **Free-to-Play Suggestions**: The MVP does not suggest F2P games where only some users own them.

10. **Server-Side Caching**: The MVP does not implement Redis or other caching mechanisms for profile or game data.

11. **User Authentication**: The MVP does not require user accounts or authentication.

12. **Analytics and Tracking**: The MVP does not include usage analytics or tracking.

## Requirements

### Requirement 1: Profile Input Collection

**User Story:** As a user, I want to input 2-6 Steam profile URLs using vanity or numeric formats, so that I can analyze game overlap for my friend group.

#### Acceptance Criteria

1. THE System SHALL accept between 2 and 6 Profile_Inputs per analysis request
2. WHEN a User provides a Profile_Input, THE System SHALL accept Vanity_URL format (steamcommunity.com/id/username)
3. WHEN a User provides a Profile_Input, THE System SHALL accept Numeric_Profile_URL format (steamcommunity.com/profiles/[SteamID64])
4. THE System SHALL NOT accept raw SteamID64 input (17-digit numbers without URL context)
5. WHEN a User attempts to add fewer than 2 Profile_Inputs, THE System SHALL prevent submission
6. WHEN a User attempts to add more than 6 Profile_Inputs, THE System SHALL prevent additional inputs
7. WHEN a User provides duplicate Profile_Inputs, THE System SHALL prevent submission and display a duplicate error message
8. THE System SHALL provide placeholder text "Paste Steam profile URLs" in input fields

### Requirement 2: Profile Input Validation

**User Story:** As a user, I want immediate feedback on invalid profile inputs, so that I can correct errors before submitting.

#### Acceptance Criteria

1. WHEN a Profile_Input does not match any valid format, THE System SHALL display an inline validation error
2. WHEN a Profile_Input validation error occurs, THE System SHALL display the message "Invalid input. Use a Steam profile URL: steamcommunity.com/id/username or steamcommunity.com/profiles/[ID]"
3. WHEN a User corrects an invalid Profile_Input to a valid format, THE System SHALL clear the validation error
4. WHEN all Profile_Inputs are valid and between 2-6 in count, THE System SHALL enable the submission button

### Requirement 3: Profile Resolution

**User Story:** As a user, I want the system to resolve various profile identifier formats to Steam accounts, so that I don't need to manually look up SteamID64 values.

#### Acceptance Criteria

1. WHEN a Profile_Input is a Numeric_Profile_URL, THE System SHALL extract the SteamID64 from the URL path and use it directly
2. WHEN a Profile_Input is a Vanity_URL, THE System SHALL extract the vanity name and call Steam_API ISteamUser/ResolveVanityURL/v0001/ to obtain the SteamID64
3. WHEN Steam_API ResolveVanityURL returns success code 1, THE System SHALL use the returned steamid
4. WHEN Steam_API ResolveVanityURL returns success code 42, THE System SHALL return an error with code PROFILE_RESOLUTION_FAILED
5. WHEN profile resolution fails, THE System SHALL include the failed Profile_Input in the error response
6. THE System SHALL resolve all Profile_Inputs to SteamID64 format before fetching game libraries

### Requirement 4: Game Library Fetching

**User Story:** As a user, I want the system to retrieve game ownership data for all provided profiles, so that I can see what games we all own.

#### Acceptance Criteria

1. WHEN all profiles are resolved, THE System SHALL fetch game libraries using Steam_API IPlayerService/GetOwnedGames/v0001/ endpoint
2. WHEN fetching game libraries, THE System SHALL include the parameter include_appinfo=1 to retrieve game metadata (name, icons)
3. WHEN fetching game libraries, THE System SHALL include the parameter include_played_free_games=1 to include free-to-play games
4. WHEN fetching game libraries, THE System SHALL include the parameter format=json
5. WHEN fetching multiple game libraries, THE System SHALL use Promise.all() to fetch them concurrently
6. WHEN any profile fails to return a valid game library, THE System SHALL fail the entire request (strict failure mode for MVP)
7. THE System SHALL fetch player summaries using Steam_API ISteamUser/GetPlayerSummaries/v0002/ to obtain persona names and avatars

#### Private Library Detection

**User Story:** As a user, I want clear feedback when a game library cannot be accessed, so that I know which profiles need to be fixed.

#### Acceptance Criteria

1. WHEN Steam_API GetOwnedGames returns a response without a games array, THE System SHALL treat the profile as likely private or inaccessible
2. WHEN Steam_API GetOwnedGames returns game_count of 0 with no games array, THE System SHALL treat the profile as likely private or inaccessible
3. WHEN a profile is detected as likely private or inaccessible, THE System SHALL return an error response with code PRIVATE_LIBRARY
4. WHEN any Game_Library is detected as private or inaccessible, THE System SHALL fail the entire request (strict failure mode for MVP)
5. WHEN a PRIVATE_LIBRARY error occurs, THE System SHALL display the message "One or more game libraries are private. All users must set their game details to public in Steam Privacy Settings"

**Note:** Empty or missing game arrays in the Steam API response are heuristics that may indicate a private library, profile misconfiguration, or other access issues. The MVP treats these cases uniformly as access failures.

### Requirement 5: Game Data Enrichment

**User Story:** As a user, I want to see game images and metadata, so that I can easily identify games in the results.

#### Acceptance Criteria

1. WHEN processing game data, THE System SHALL construct Header_Image URLs in the format https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg
2. WHEN returning game data, THE System SHALL include appId, name, playtimeForever, imgIconUrl, imgLogoUrl, and headerImageUrl fields
3. WHERE game name is available from include_appinfo, THE System SHALL use it; otherwise use "Unknown Game" as fallback
4. WHERE img_icon_url is available from include_appinfo, THE System SHALL construct full icon URL; otherwise use empty string
5. WHERE img_logo_url is available from include_appinfo, THE System SHALL construct full logo URL; otherwise use empty string
6. WHERE rtime_last_played is available, THE System SHALL include it in the response
7. THE System SHALL preserve playtime_forever values in minutes as provided by Steam_API

### Requirement 6: Overlap Calculation

**User Story:** As a user, I want to see only the games that all provided profiles own, so that I know which games we can all play together.

#### Acceptance Criteria

1. WHEN all Game_Libraries are successfully fetched, THE System SHALL calculate the intersection of games owned by all users
2. WHEN calculating overlap, THE System SHALL identify games by appId to handle deduplication
3. WHEN a game appears in all Game_Libraries, THE System SHALL include it in Shared_Games
4. WHEN a game appears in fewer than all Game_Libraries, THE System SHALL exclude it from Shared_Games
5. WHEN Overlap_Calculation is complete, THE System SHALL sort Shared_Games alphabetically by name
6. WHEN no games are owned by all users, THE System SHALL return an empty Shared_Games array
7. THE System SHALL perform Overlap_Calculation on the server side within the API_Route

### Requirement 7: API Response Structure

**User Story:** As a developer, I want a consistent API response format, so that I can reliably handle success and error cases.

#### Acceptance Criteria

1. THE API_Route SHALL return responses with a success boolean field
2. WHEN an operation succeeds, THE API_Route SHALL set success to true and include a data field
3. WHEN an operation fails, THE API_Route SHALL set success to false and include an error field
4. WHEN returning successful data, THE API_Route SHALL include profiles array and sharedGames array
5. WHEN returning an error, THE API_Route SHALL include error code, message, and optionally failedProfile and details fields
6. THE API_Route SHALL use error codes: INVALID_INPUT, PROFILE_RESOLUTION_FAILED, PRIVATE_LIBRARY, or API_ERROR

### Requirement 8: Results Display

**User Story:** As a user, I want to see the shared games in an organized list with game information, so that I can browse our options.

#### Acceptance Criteria

1. WHEN Shared_Games are received from the API_Route, THE System SHALL display them in a list format
2. WHEN displaying a game, THE System SHALL show the Header_Image, game name, and playtime information
3. WHEN Shared_Games array is empty, THE System SHALL display the message "No shared games found. Make sure all libraries are public, or try adding different friends"
4. THE System SHALL provide client-side sorting options for Shared_Games by name or playtime
5. THE System SHALL provide client-side text filtering for Shared_Games

### Requirement 9: Random Game Picker

**User Story:** As a user, I want to randomly select a game from our shared games, so that we can quickly decide what to play.

#### Acceptance Criteria

1. WHEN Shared_Games contains at least one game, THE System SHALL display a "Pick a game for us" button
2. WHEN a User clicks the random picker button, THE System SHALL select a random game from Shared_Games using client-side logic
3. WHEN a random game is selected, THE System SHALL highlight or emphasize the picked game in the display
4. WHEN performing random selection, THE System SHALL use Math.random() to ensure uniform distribution
5. WHEN Shared_Games is empty, THE System SHALL hide or disable the random picker button

### Requirement 10: Error Handling for Invalid Input

**User Story:** As a user, I want clear error messages when I provide invalid input, so that I can correct my mistakes.

#### Acceptance Criteria

1. WHEN a User submits fewer than 2 Profile_Inputs, THE System SHALL display an error message
2. WHEN a User submits more than 6 Profile_Inputs, THE System SHALL display an error message
3. WHEN a Profile_Input format is invalid, THE System SHALL display an inline error on the specific input field
4. WHEN duplicate Profile_Inputs are detected, THE System SHALL display the message "This profile has already been added"

### Requirement 11: Error Handling for Profile Resolution Failures

**User Story:** As a user, I want to know when a profile cannot be found, so that I can verify the profile identifier.

#### Acceptance Criteria

1. WHEN Steam_API cannot resolve a Vanity_URL, THE System SHALL return an error with code PROFILE_RESOLUTION_FAILED
2. WHEN profile resolution fails, THE System SHALL display the message "Profile not found. Check the username or try using the numeric profile URL"
3. WHEN profile resolution fails, THE System SHALL include the failedProfile field in the error response

### Requirement 12: Error Handling for Steam API Failures

**User Story:** As a user, I want to know when the Steam service is unavailable, so that I can retry later.

#### Acceptance Criteria

1. WHEN Steam_API returns a 5xx server error, THE System SHALL return an error with code API_ERROR
2. WHEN Steam_API is unreachable, THE System SHALL return an error with code API_ERROR
3. WHEN an API_ERROR occurs, THE System SHALL display the message "Steam API is temporarily unavailable. Please try again in a moment"
4. WHEN an API_ERROR occurs, THE System SHALL provide a retry button

### Requirement 13: Security - API Key Protection

**User Story:** As a system administrator, I want the Steam API key to be protected, so that it cannot be exposed to end users.

#### Acceptance Criteria

1. THE System SHALL store the Steam API key in server-side environment variables
2. THE System SHALL never expose the Steam API key in client-side code or responses
3. THE API_Route SHALL act as a proxy to prevent API key leakage
4. THE System SHALL make all Steam_API calls from server-side code only

### Requirement 14: Security - Input Sanitization

**User Story:** As a system administrator, I want user inputs to be sanitized, so that injection attacks are prevented.

#### Acceptance Criteria

1. WHEN processing Profile_Inputs, THE System SHALL trim whitespace from all inputs
2. WHEN validating SteamID64 format, THE System SHALL verify it matches the pattern of exactly 17 digits
3. WHEN validating Vanity_URL format, THE System SHALL verify it matches the pattern steamcommunity.com/id/[username]
4. WHEN validating Numeric_Profile_URL format, THE System SHALL verify it matches the pattern steamcommunity.com/profiles/[17-digit ID]
5. THE System SHALL reject Profile_Inputs that do not match any supported format
6. THE System SHALL use URL parsing libraries to safely extract identifiers from URLs

### Requirement 15: Performance - Concurrent Fetching

**User Story:** As a user, I want fast results, so that I don't have to wait long for the analysis.

#### Acceptance Criteria

1. WHEN fetching multiple Game_Libraries, THE System SHALL use Promise.all() to execute requests concurrently
2. WHEN fetching N profiles concurrently, THE System SHALL complete in approximately the time of the slowest single request
3. THE System SHALL not fetch Game_Libraries sequentially

### Requirement 16: Performance - Server-Side Processing

**User Story:** As a user, I want efficient data transfer, so that the application loads quickly.

#### Acceptance Criteria

1. THE System SHALL perform Overlap_Calculation on the server side
2. THE API_Route SHALL return only Shared_Games to the client, not all Game_Libraries
3. THE System SHALL minimize the number of client-to-server round trips to one per analysis request

### Requirement 17: Data Model - Steam Profile

**User Story:** As a developer, I want consistent profile data structures, so that I can reliably process profile information.

#### Acceptance Criteria

1. THE System SHALL represent Steam_Profiles with steamId64, vanityName, profileUrl, personaName, and avatarUrl fields
2. WHEN storing a steamId64, THE System SHALL ensure it is a 17-digit numeric string
3. WHEN storing a profileUrl, THE System SHALL ensure it is a valid Steam community URL
4. WHERE a profile uses a custom URL, THE System SHALL include the vanityName field

### Requirement 18: Data Model - Steam Game

**User Story:** As a developer, I want consistent game data structures, so that I can reliably display game information.

#### Acceptance Criteria

1. THE System SHALL represent games with appId, name, playtimeForever, imgIconUrl, imgLogoUrl, and headerImageUrl fields
2. WHEN storing an appId, THE System SHALL ensure it is a positive integer
3. WHEN storing a name, THE System SHALL ensure it is a non-empty string
4. WHEN storing playtimeForever, THE System SHALL ensure it is a non-negative number in minutes
5. WHERE playtime data for the last 2 weeks exists, THE System SHALL include the playtime2Weeks field

### Requirement 19: Deployment Configuration

**User Story:** As a system administrator, I want clear deployment requirements, so that I can properly configure the application.

#### Acceptance Criteria

1. THE System SHALL require a STEAM_API_KEY environment variable to be set
2. WHEN the STEAM_API_KEY is missing, THE System SHALL fail to start and display a configuration error
3. THE System SHALL provide an .env.example file documenting required environment variables
4. THE System SHALL include instructions for obtaining a Steam API key in the README

### Requirement 20: Browser Compatibility

**User Story:** As a user, I want the application to work in modern browsers, so that I can use it without compatibility issues.

#### Acceptance Criteria

1. THE System SHALL support browsers with ES2020+ JavaScript support
2. THE System SHALL function correctly in Chrome, Firefox, Safari, and Edge latest versions
3. THE System SHALL use standard web APIs without requiring polyfills for modern browsers

### Requirement 21: Accessibility - Form Inputs

**User Story:** As a user with accessibility needs, I want properly labeled form inputs, so that I can use screen readers effectively.

#### Acceptance Criteria

1. THE System SHALL provide accessible labels for all Profile_Input fields
2. THE System SHALL associate error messages with their corresponding input fields using ARIA attributes
3. THE System SHALL ensure keyboard navigation works for all interactive elements
4. THE System SHALL provide focus indicators for all focusable elements

### Requirement 22: User Experience - Loading States

**User Story:** As a user, I want to see loading indicators during processing, so that I know the system is working.

#### Acceptance Criteria

1. WHEN a User submits Profile_Inputs, THE System SHALL display a loading indicator
2. WHILE the API_Route is processing, THE System SHALL disable the submit button
3. WHEN processing completes, THE System SHALL hide the loading indicator and display results
4. THE System SHALL provide visual feedback that indicates progress during API calls

### Requirement 23: User Experience - Dynamic Input Fields

**User Story:** As a user, I want to easily add or remove profile inputs, so that I can adjust my friend group size.

#### Acceptance Criteria

1. THE System SHALL provide an "Add Profile" button to add additional Profile_Input fields
2. THE System SHALL provide a remove button for each Profile_Input field
3. WHEN a User clicks "Add Profile" and fewer than 6 inputs exist, THE System SHALL add a new input field
4. WHEN a User clicks "Add Profile" and 6 inputs exist, THE System SHALL disable the button
5. WHEN a User removes a Profile_Input, THE System SHALL remove the field and re-validate remaining inputs
6. THE System SHALL maintain at least 2 Profile_Input fields at all times
