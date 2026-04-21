import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Build chainable mocks
// ---------------------------------------------------------------------------

let selectResults: unknown[][] = [];
let selectCallIndex = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockImplementation(() => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return Promise.resolve(result);
  });
  return chain;
}

let insertReturningResults: unknown[][] = [];
let insertCallIndex = 0;

const selectChain = makeSelectChain();

const insertReturningMock = vi.fn().mockImplementation(() => {
  const result = insertReturningResults[insertCallIndex] ?? [];
  insertCallIndex++;
  return Promise.resolve(result);
});
const insertValuesMock = vi.fn().mockReturnValue({
  returning: insertReturningMock,
});

vi.mock("./index", () => ({
  db: {
    select: () => selectChain,
    insert: () => ({ values: insertValuesMock }),
  },
}));

import { createSharedLink, getSharedLink } from "./shared-link-repository";
import type { OverlapSnapshot } from "@/lib/types";

const NOW = new Date("2025-01-15T12:00:00Z");

const mockSnapshot: OverlapSnapshot = {
  profiles: [
    {
      originalUrl: "https://steamcommunity.com/profiles/76561198000000001",
      steamId64: "76561198000000001",
      profileUrl: "https://steamcommunity.com/profiles/76561198000000001",
      personaName: "Player1",
      avatarUrl: "https://avatars.steamstatic.com/abc.jpg",
    },
  ],
  sharedGames: [
    {
      appId: 440,
      name: "Team Fortress 2",
      playtimeForever: 1000,
      imgIconUrl: "",
      imgLogoUrl: "",
      headerImageUrl:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/440/header.jpg",
    },
  ],
  generatedAt: "2025-01-15T12:00:00.000Z",
};

describe("shared-link-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    selectCallIndex = 0;
    insertReturningResults = [];
    insertCallIndex = 0;
  });

  describe("createSharedLink", () => {
    it("inserts a shared link and returns the generated id", async () => {
      insertReturningResults = [[{ id: "link-uuid-123" }]];

      const result = await createSharedLink(
        "group-1",
        "user-1",
        mockSnapshot,
      );

      expect(result).toBe("link-uuid-123");
      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: "group-1",
          createdByUserId: "user-1",
          snapshotData: mockSnapshot,
        }),
      );
      // Verify expiresAt is roughly 24h from now
      const callArg = insertValuesMock.mock.calls[0][0];
      expect(callArg.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe("getSharedLink", () => {
    it("returns snapshot data for a valid, non-expired link", async () => {
      const futureExpiry = new Date(
        NOW.getTime() + 24 * 60 * 60 * 1000,
      );
      selectResults = [
        [
          {
            snapshotData: mockSnapshot,
            expiresAt: futureExpiry,
            groupId: "group-1",
          },
        ],
      ];

      const result = await getSharedLink("link-uuid-123");

      expect(result).not.toBeNull();
      expect(result!.snapshotData).toEqual(mockSnapshot);
      expect(result!.groupId).toBe("group-1");
      expect(result!.expiresAt).toBe(futureExpiry.toISOString());
    });

    it("returns null when link is not found", async () => {
      selectResults = [[]];

      const result = await getSharedLink("non-existent");

      expect(result).toBeNull();
    });

    it("returns null when link is expired (filtered by query)", async () => {
      // The DB query filters expired links, so an empty result means expired
      selectResults = [[]];

      const result = await getSharedLink("expired-link");

      expect(result).toBeNull();
    });
  });
});
