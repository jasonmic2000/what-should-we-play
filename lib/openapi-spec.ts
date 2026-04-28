export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "What Should We Play? API",
    description:
      "API for finding Steam games owned in common by a group of friends. Supports overlap calculation, group management, bookmarks, shareable links, notifications, and search history.",
    version: "1.0.0",
  },
  servers: [{ url: "/", description: "Current environment" }],
  tags: [
    { name: "Overlap", description: "Find shared games across Steam profiles" },
    { name: "Groups", description: "Group CRUD and listing" },
    { name: "Members", description: "Group membership management" },
    { name: "Bookmarks", description: "Per-group game bookmarks (paid)" },
    { name: "Sharing", description: "Temporary shareable overlap links" },
    { name: "Notifications", description: "New-game notifications (paid)" },
    { name: "Search History", description: "Per-user search history (paid)" },
    { name: "Auth", description: "Authentication and Steam linking" },
    { name: "System", description: "Admin and cron endpoints" },
  ],
  components: {
    schemas: {
      APIError: {
        type: "object",
        properties: {
          code: {
            type: "string",
            enum: [
              "INVALID_INPUT",
              "PROFILE_RESOLUTION_FAILED",
              "PRIVATE_LIBRARY",
              "API_ERROR",
              "RATE_LIMIT",
              "UNAUTHORIZED",
              "FORBIDDEN",
              "NOT_FOUND",
              "GROUP_LIMIT_REACHED",
            ],
          },
          message: { type: "string" },
          failedProfile: { type: "string" },
          details: {},
        },
        required: ["code", "message"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { $ref: "#/components/schemas/APIError" },
        },
      },
      ResolvedProfile: {
        type: "object",
        properties: {
          originalUrl: { type: "string" },
          steamId64: { type: "string" },
          profileUrl: { type: "string" },
          vanityName: { type: "string" },
          personaName: { type: "string" },
          avatarUrl: { type: "string" },
        },
        required: ["originalUrl", "steamId64", "profileUrl"],
      },
      EnrichedSharedGame: {
        type: "object",
        properties: {
          appId: { type: "integer" },
          name: { type: "string" },
          playtimeForever: { type: "integer" },
          imgIconUrl: { type: "string" },
          imgLogoUrl: { type: "string" },
          headerImageUrl: { type: "string" },
          rtimeLastPlayed: { type: "integer" },
          isFree: { type: "boolean", nullable: true },
          isGroupPlayable: { type: "boolean", nullable: true },
          recentPlaytimeScore: { type: "number" },
        },
        required: ["appId", "name", "playtimeForever", "imgIconUrl", "imgLogoUrl", "headerImageUrl"],
      },
      FindOverlapRequest: {
        type: "object",
        properties: {
          profiles: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 6,
            description: "Steam profile URLs or vanity names",
          },
          forceRefresh: { type: "boolean", default: false },
          multiplayerOnly: { type: "boolean", default: false },
        },
        required: ["profiles"],
      },
      FindOverlapData: {
        type: "object",
        properties: {
          profiles: {
            type: "array",
            items: { $ref: "#/components/schemas/ResolvedProfile" },
          },
          sharedGames: {
            type: "array",
            items: { $ref: "#/components/schemas/EnrichedSharedGame" },
          },
        },
      },
      Group: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          creatorUserId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      GroupMember: {
        type: "object",
        properties: {
          groupId: { type: "string", format: "uuid" },
          steamId64: { type: "string" },
          userId: { type: "string", format: "uuid", nullable: true },
          role: { type: "string", enum: ["admin", "member"] },
          addedAt: { type: "string", format: "date-time" },
        },
      },
      GroupWithMembers: {
        allOf: [
          { $ref: "#/components/schemas/Group" },
          {
            type: "object",
            properties: {
              members: {
                type: "array",
                items: { $ref: "#/components/schemas/GroupMember" },
              },
            },
          },
        ],
      },
      BookmarkedGame: {
        type: "object",
        properties: {
          groupId: { type: "string", format: "uuid" },
          appId: { type: "integer" },
          addedByUserId: { type: "string", format: "uuid" },
          addedAt: { type: "string", format: "date-time" },
          name: { type: "string" },
          headerImageUrl: { type: "string" },
        },
      },
      OverlapSnapshot: {
        type: "object",
        properties: {
          profiles: {
            type: "array",
            items: { $ref: "#/components/schemas/ResolvedProfile" },
          },
          sharedGames: {
            type: "array",
            items: { $ref: "#/components/schemas/EnrichedSharedGame" },
          },
          generatedAt: { type: "string", format: "date-time" },
        },
        required: ["profiles", "sharedGames", "generatedAt"],
      },
      SharedLinkData: {
        type: "object",
        properties: {
          snapshotData: { $ref: "#/components/schemas/OverlapSnapshot" },
          expiresAt: { type: "string", format: "date-time" },
          groupId: { type: "string", format: "uuid" },
        },
      },
      NewGameNotification: {
        type: "object",
        properties: {
          appId: { type: "integer" },
          name: { type: "string" },
          headerImageUrl: { type: "string" },
          addedBy: { type: "string", description: "Persona name of the member who got the game" },
        },
      },
      SearchHistoryEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          profilesSearched: { type: "array", items: { type: "string" } },
          sharedGameCount: { type: "integer" },
          searchedAt: { type: "string", format: "date-time" },
        },
      },
      AppUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          displayName: { type: "string" },
          steamId64: { type: "string" },
          subscriptionTier: { type: "string", enum: ["free", "paid"] },
        },
      },
      SyncResult: {
        type: "object",
        properties: {
          jobType: { type: "string" },
          status: { type: "string", enum: ["completed", "failed"] },
          itemsProcessed: { type: "integer" },
          errorMessage: { type: "string" },
        },
      },
    },
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "sb-access-token",
        description: "Supabase session cookie (set after login)",
      },
      cronSecret: {
        type: "http",
        scheme: "bearer",
        description: "CRON_SECRET bearer token for scheduled jobs",
      },
    },
  },
  paths: {
    // ── Overlap ──────────────────────────────────────────────────────
    "/api/find-overlap": {
      post: {
        tags: ["Overlap"],
        summary: "Find shared games",
        description:
          "Accepts 2-6 Steam profile URLs, resolves them, fetches owned libraries, and returns the intersection enriched with catalog metadata. Rate-limited by client IP.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/FindOverlapRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Overlap results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/FindOverlapData" },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid input", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── Groups ───────────────────────────────────────────────────────
    "/api/groups": {
      post: {
        tags: ["Groups"],
        summary: "Create a group",
        description: "Create a new group with initial members. Free tier limited to 1 group.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  memberSteamIds: { type: "array", items: { type: "string" } },
                },
                required: ["name", "memberSteamIds"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Group created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/GroupWithMembers" },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Group limit reached (free tier)", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      get: {
        tags: ["Groups"],
        summary: "List user groups",
        description: "Returns all groups the authenticated user belongs to.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of groups",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/Group" } },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/groups/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        tags: ["Groups"],
        summary: "Get group details",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Group with members",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/GroupWithMembers" } } } } },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not a member", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Group not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      put: {
        tags: ["Groups"],
        summary: "Update group",
        description: "Rename a group. Admin or creator only.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } },
        },
        responses: {
          "200": {
            description: "Updated group",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/GroupWithMembers" } } } } },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Group not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["Groups"],
        summary: "Delete group",
        description: "Delete a group. Admin or creator only.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Deleted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Group not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── Members ──────────────────────────────────────────────────────
    "/api/groups/{id}/members": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      post: {
        tags: ["Members"],
        summary: "Add member",
        description: "Add a Steam user to the group. Admin only.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { steamId64: { type: "string" } }, required: ["steamId64"] } } },
        },
        responses: {
          "201": { description: "Member added", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["Members"],
        summary: "Remove member",
        description: "Remove a Steam user from the group. Admin only.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { steamId64: { type: "string" } }, required: ["steamId64"] } } },
        },
        responses: {
          "200": { description: "Member removed", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/groups/{id}/members/{steamId64}/role": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "steamId64", in: "path", required: true, schema: { type: "string" } },
      ],
      put: {
        tags: ["Members"],
        summary: "Update member role",
        description: "Promote or demote a group member. Admin only.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { role: { type: "string", enum: ["admin", "member"] } }, required: ["role"] } } },
        },
        responses: {
          "200": { description: "Role updated", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Group not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── Bookmarks ────────────────────────────────────────────────────
    "/api/groups/{id}/bookmarks": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        tags: ["Bookmarks"],
        summary: "List bookmarks",
        description: "Get all bookmarked games for a group. Requires membership.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Bookmarked games",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/BookmarkedGame" } } } } } },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not a member or not paid tier", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      post: {
        tags: ["Bookmarks"],
        summary: "Add bookmark",
        description: "Bookmark a game for the group. Admin only, paid tier required.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { appId: { type: "integer" } }, required: ["appId"] } } },
        },
        responses: {
          "201": { description: "Bookmark added", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not admin or not paid tier", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/groups/{id}/bookmarks/{appId}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "appId", in: "path", required: true, schema: { type: "integer" } },
      ],
      delete: {
        tags: ["Bookmarks"],
        summary: "Remove bookmark",
        description: "Remove a bookmarked game. Admin only.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Bookmark removed", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── Sharing ──────────────────────────────────────────────────────
    "/api/groups/{id}/share": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      post: {
        tags: ["Sharing"],
        summary: "Create shared link",
        description: "Snapshot the current overlap results and generate a shareable link (expires in 24h). Requires group membership.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { snapshotData: { $ref: "#/components/schemas/OverlapSnapshot" } },
                required: ["snapshotData"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Link created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: { linkId: { type: "string" }, url: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not a member", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/shared/{linkId}": {
      parameters: [{ name: "linkId", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: ["Sharing"],
        summary: "Get shared link",
        description: "Retrieve a frozen overlap snapshot by link ID. No auth required. Returns 404 if expired.",
        responses: {
          "200": {
            description: "Snapshot data",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/SharedLinkData" } } } } },
          },
          "404": { description: "Link expired or not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── Notifications ────────────────────────────────────────────────
    "/api/groups/{id}/notifications": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        tags: ["Notifications"],
        summary: "Check for new games",
        description: "Diff current member libraries against cached versions and return new games matching overlap criteria. Paid tier required.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Notification list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        notifications: { type: "array", items: { $ref: "#/components/schemas/NewGameNotification" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Not a member or not paid tier", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── Search History ───────────────────────────────────────────────
    "/api/search-history": {
      post: {
        tags: ["Search History"],
        summary: "Record a search",
        description: "Store an overlap search for the authenticated user.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  profilesSearched: { type: "array", items: { type: "string" } },
                  sharedGameCount: { type: "integer", minimum: 0 },
                },
                required: ["profilesSearched", "sharedGameCount"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Recorded", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      get: {
        tags: ["Search History"],
        summary: "Get search history",
        description: "Retrieve the user's past overlap searches. Paid tier required.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100 } },
        ],
        responses: {
          "200": {
            description: "Search history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/SearchHistoryEntry" } },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Paid tier required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── Auth ─────────────────────────────────────────────────────────
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        description: "Returns the authenticated user's profile including Steam link status and subscription tier.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "User profile",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, user: { $ref: "#/components/schemas/AppUser" } } } } },
          },
          "401": { description: "Not authenticated" },
          "404": { description: "User profile not found" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out",
        description: "Destroy the current session.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Logged out", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
        },
      },
    },
    "/api/auth/steam/link": {
      get: {
        tags: ["Auth"],
        summary: "Start Steam linking",
        description: "Redirects the authenticated user to Steam's OpenID login page. On success, Steam redirects back to the callback URL.",
        security: [{ cookieAuth: [] }],
        responses: {
          "302": { description: "Redirect to Steam OpenID" },
          "302 ": { description: "Redirect to login if not authenticated" },
        },
      },
    },
    "/api/auth/steam/callback": {
      get: {
        tags: ["Auth"],
        summary: "Steam OpenID callback",
        description: "Handles the Steam OpenID callback, verifies the response, and stores the linked SteamID64.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "openid.claimed_id", in: "query", required: true, schema: { type: "string" } },
          { name: "openid.mode", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "302": { description: "Redirect to /profile on success or with error query param on failure" },
        },
      },
    },
    "/api/auth/steam/unlink": {
      post: {
        tags: ["Auth"],
        summary: "Unlink Steam account",
        description: "Remove the linked SteamID64 from the user's profile.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Unlinked", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated" },
        },
      },
    },

    // ── System ───────────────────────────────────────────────────────
    "/api/cron/sync-catalog": {
      get: {
        tags: ["System"],
        summary: "Trigger catalog sync",
        description: "Run a catalog sync job (backfill, incremental, or enrich). Requires CRON_SECRET bearer token.",
        security: [{ cronSecret: [] }],
        parameters: [
          {
            name: "job",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["backfill", "incremental", "enrich"] },
            description: "Job type. Defaults to incremental.",
          },
        ],
        responses: {
          "200": { description: "Sync result", content: { "application/json": { schema: { $ref: "#/components/schemas/SyncResult" } } } },
          "401": { description: "Invalid or missing cron secret" },
          "500": { description: "Sync failed", content: { "application/json": { schema: { $ref: "#/components/schemas/SyncResult" } } } },
        },
      },
    },
    "/api/admin/check": {
      get: {
        tags: ["System"],
        summary: "Check admin status",
        description: "Returns whether the current user is an admin (email in ADMIN_EMAILS).",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Admin status",
            content: { "application/json": { schema: { type: "object", properties: { isAdmin: { type: "boolean" } } } } },
          },
        },
      },
    },
  },
} as const;
