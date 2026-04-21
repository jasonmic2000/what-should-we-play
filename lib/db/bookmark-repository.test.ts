import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Build chainable mocks
// ---------------------------------------------------------------------------

let selectResults: unknown[][] = [];
let selectCallIndex = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockImplementation(() => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return Promise.resolve(result);
  });
  return chain;
}

const insertOnConflictMock = vi.fn().mockResolvedValue(undefined);
const insertValuesMock = vi.fn().mockReturnValue({
  onConflictDoNothing: insertOnConflictMock,
});

const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
const deleteMock = vi.fn().mockReturnValue({ where: deleteWhereMock });

const selectChain = makeSelectChain();

vi.mock("./index", () => ({
  db: {
    select: () => selectChain,
    insert: () => ({ values: insertValuesMock }),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

import { addBookmark, removeBookmark, getBookmarks } from "./bookmark-repository";

const NOW = new Date("2025-01-01T00:00:00Z");

describe("bookmark-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    selectCallIndex = 0;
  });

  describe("addBookmark", () => {
    it("inserts a bookmark with onConflictDoNothing", async () => {
      await addBookmark("group-1", 440, "user-1");

      expect(insertValuesMock).toHaveBeenCalledWith({
        groupId: "group-1",
        appId: 440,
        addedByUserId: "user-1",
      });
      expect(insertOnConflictMock).toHaveBeenCalled();
    });
  });

  describe("removeBookmark", () => {
    it("deletes the bookmark row", async () => {
      await removeBookmark("group-1", 440);

      expect(deleteMock).toHaveBeenCalled();
      expect(deleteWhereMock).toHaveBeenCalled();
    });
  });

  describe("getBookmarks", () => {
    it("returns bookmarks with catalog metadata", async () => {
      selectResults = [
        [
          {
            groupId: "group-1",
            appId: 440,
            addedByUserId: "user-1",
            addedAt: NOW,
            name: "Team Fortress 2",
          },
        ],
      ];

      const result = await getBookmarks("group-1");

      expect(result).toHaveLength(1);
      expect(result[0].appId).toBe(440);
      expect(result[0].name).toBe("Team Fortress 2");
      expect(result[0].headerImageUrl).toContain("440");
      expect(result[0].addedAt).toBe("2025-01-01T00:00:00.000Z");
    });

    it("returns fallback name when catalog data is missing", async () => {
      selectResults = [
        [
          {
            groupId: "group-1",
            appId: 999,
            addedByUserId: "user-1",
            addedAt: NOW,
            name: null,
          },
        ],
      ];

      const result = await getBookmarks("group-1");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("App 999");
    });

    it("returns empty array when no bookmarks exist", async () => {
      selectResults = [[]];

      const result = await getBookmarks("group-1");

      expect(result).toHaveLength(0);
    });
  });
});
