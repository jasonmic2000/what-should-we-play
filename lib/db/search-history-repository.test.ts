import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Build chainable mocks
// ---------------------------------------------------------------------------

let selectResults: unknown[][] = [];
let selectCallIndex = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockImplementation(() => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return Promise.resolve(result);
  });
  return chain;
}

const selectChain = makeSelectChain();

const insertValuesMock = vi.fn().mockResolvedValue(undefined);

vi.mock("./index", () => ({
  db: {
    select: () => selectChain,
    insert: () => ({ values: insertValuesMock }),
  },
}));

import { recordSearch, getSearchHistory } from "./search-history-repository";

describe("search-history-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    selectCallIndex = 0;
  });

  describe("recordSearch", () => {
    it("inserts a search history entry", async () => {
      await recordSearch("user-1", ["76561198000000001", "76561198000000002"], 14);

      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          profilesSearched: ["76561198000000001", "76561198000000002"],
          sharedGameCount: 14,
        }),
      );
    });

    it("inserts with zero shared games", async () => {
      await recordSearch("user-1", ["76561198000000001"], 0);

      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sharedGameCount: 0,
        }),
      );
    });
  });

  describe("getSearchHistory", () => {
    it("returns formatted search history entries", async () => {
      const searchedAt = new Date("2025-01-15T12:00:00Z");
      selectResults = [
        [
          {
            id: "entry-1",
            userId: "user-1",
            profilesSearched: ["76561198000000001", "76561198000000002"],
            sharedGameCount: 14,
            searchedAt,
          },
        ],
      ];

      const result = await getSearchHistory("user-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "entry-1",
        userId: "user-1",
        profilesSearched: ["76561198000000001", "76561198000000002"],
        sharedGameCount: 14,
        searchedAt: "2025-01-15T12:00:00.000Z",
      });
    });

    it("returns empty array when no history exists", async () => {
      selectResults = [[]];

      const result = await getSearchHistory("user-1");

      expect(result).toEqual([]);
    });

    it("passes custom limit to the query", async () => {
      selectResults = [[]];

      await getSearchHistory("user-1", 5);

      expect(selectChain.limit).toHaveBeenCalledWith(5);
    });

    it("uses default limit of 20 when not specified", async () => {
      selectResults = [[]];

      await getSearchHistory("user-1");

      expect(selectChain.limit).toHaveBeenCalledWith(20);
    });
  });
});
