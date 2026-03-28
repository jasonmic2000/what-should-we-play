import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the db module before importing the repository
// ---------------------------------------------------------------------------

const limitMock = vi.fn().mockResolvedValue([]);
const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock, limit: limitMock });
const fromMock = vi.fn().mockReturnValue({ where: whereMock });
const selectMock = vi.fn().mockReturnValue({ from: fromMock });

const onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
const valuesMock = vi.fn().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateMock });
const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

vi.mock("./index", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
  },
}));

import {
  getGamesByAppIds,
  upsertGames,
  getStaleGames,
} from "./catalog-repository";

describe("getGamesByAppIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the chain so where() resolves to rows
    whereMock.mockResolvedValue([]);
  });

  it("returns empty Map for empty input without querying db", async () => {
    const result = await getGamesByAppIds([]);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("queries db and returns Map keyed by appId", async () => {
    const fakeRow = {
      appId: 570,
      name: "Dota 2",
      isFree: true,
      priceText: null,
      priceCurrency: null,
      hasOnlineCoop: null,
      hasOnlinePvp: null,
      hasLan: null,
      hasSharedSplitScreen: null,
      isGroupPlayable: null,
      catalogLastSyncedAt: null,
      storeLastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    whereMock.mockResolvedValue([fakeRow]);

    const result = await getGamesByAppIds([570]);

    expect(selectMock).toHaveBeenCalledOnce();
    expect(result.get(570)).toEqual(fakeRow);
  });

  it("chunks large arrays into batches of 500", async () => {
    whereMock.mockResolvedValue([]);

    const largeArray = Array.from({ length: 1200 }, (_, i) => i + 1);
    await getGamesByAppIds(largeArray);

    // 1200 ids → 3 batches (500 + 500 + 200)
    expect(selectMock).toHaveBeenCalledTimes(3);
  });
});

describe("upsertGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing for empty array", async () => {
    await upsertGames([]);

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("calls insert with onConflictDoUpdate for a single game", async () => {
    await upsertGames([{ appId: 570, name: "Dota 2" }]);

    expect(insertMock).toHaveBeenCalledOnce();
    expect(valuesMock).toHaveBeenCalledOnce();
    expect(onConflictDoUpdateMock).toHaveBeenCalledOnce();
  });

  it("chunks large arrays into batches of 500", async () => {
    const games = Array.from({ length: 1100 }, (_, i) => ({
      appId: i + 1,
      name: `Game ${i + 1}`,
    }));

    await upsertGames(games);

    // 1100 games → 3 batches (500 + 500 + 100)
    expect(insertMock).toHaveBeenCalledTimes(3);
  });
});

describe("getStaleGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the full chain for getStaleGames: select → from → where → orderBy → limit
    fromMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ orderBy: orderByMock });
    orderByMock.mockReturnValue({ limit: limitMock });
    limitMock.mockResolvedValue([]);
  });

  it("returns results ordered by storeLastSyncedAt with limit", async () => {
    limitMock.mockResolvedValue([]);

    const result = await getStaleGames(10);

    expect(selectMock).toHaveBeenCalledOnce();
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(result).toEqual([]);
  });

  it("accepts an optional olderThan date", async () => {
    limitMock.mockResolvedValue([]);

    const olderThan = new Date("2024-01-01");
    const result = await getStaleGames(5, olderThan);

    expect(selectMock).toHaveBeenCalledOnce();
    expect(limitMock).toHaveBeenCalledWith(5);
    expect(result).toEqual([]);
  });
});
