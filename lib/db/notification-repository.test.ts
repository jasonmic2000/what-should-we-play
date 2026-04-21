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

const insertOnConflictMock = vi.fn().mockResolvedValue(undefined);
const insertValuesMock = vi.fn().mockReturnValue({
  onConflictDoUpdate: insertOnConflictMock,
});

const selectChain = makeSelectChain();

vi.mock("./index", () => ({
  db: {
    select: () => selectChain,
    insert: () => ({ values: insertValuesMock }),
  },
}));

import { getCachedLibraries, updateCachedLibrary } from "./notification-repository";

describe("notification-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    selectCallIndex = 0;
  });

  describe("getCachedLibraries", () => {
    it("returns a map of steamId64 → appIds", async () => {
      selectResults = [
        [
          { steamId64: "76561198000000001", appIds: [440, 730] },
          { steamId64: "76561198000000002", appIds: [440, 570] },
        ],
      ];

      const result = await getCachedLibraries("group-1");

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get("76561198000000001")).toEqual([440, 730]);
      expect(result.get("76561198000000002")).toEqual([440, 570]);
    });

    it("returns empty map when no cached data exists", async () => {
      selectResults = [[]];

      const result = await getCachedLibraries("group-1");

      expect(result.size).toBe(0);
    });
  });

  describe("updateCachedLibrary", () => {
    it("upserts cached library with onConflictDoUpdate", async () => {
      await updateCachedLibrary("group-1", "76561198000000001", [440, 730]);

      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: "group-1",
          steamId64: "76561198000000001",
          appIds: [440, 730],
        }),
      );
      expect(insertOnConflictMock).toHaveBeenCalled();
    });

    it("handles empty appIds array", async () => {
      await updateCachedLibrary("group-1", "76561198000000001", []);

      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          appIds: [],
        }),
      );
    });
  });
});
