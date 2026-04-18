import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the db module before importing the repository
// ---------------------------------------------------------------------------

const whereMock = vi.fn().mockResolvedValue([]);
const fromMock = vi.fn().mockReturnValue({ where: whereMock });
const selectMock = vi.fn().mockReturnValue({ from: fromMock });

const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
const updateMock = vi.fn().mockReturnValue({ set: setMock });

const onConflictDoNothingMock = vi.fn().mockResolvedValue(undefined);
const valuesMock = vi.fn().mockReturnValue({ onConflictDoNothing: onConflictDoNothingMock });
const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

vi.mock("./index", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
  },
}));

import { getUserById, updateSteamId, createUser } from "./user-repository";

describe("getUserById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whereMock.mockResolvedValue([]);
  });

  it("returns null when no rows are found", async () => {
    whereMock.mockResolvedValue([]);

    const result = await getUserById("non-existent-id");

    expect(result).toBeNull();
    expect(selectMock).toHaveBeenCalledOnce();
  });

  it("returns an AppUser when a row is found", async () => {
    const fakeRow = {
      id: "user-123",
      email: "test@example.com",
      displayName: "TestUser",
      steamId64: "76561198000000001",
      subscriptionTier: "free",
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    whereMock.mockResolvedValue([fakeRow]);

    const result = await getUserById("user-123");

    expect(result).toEqual({
      id: "user-123",
      email: "test@example.com",
      displayName: "TestUser",
      steamId64: "76561198000000001",
      subscriptionTier: "free",
      stripeCustomerId: undefined,
    });
  });

  it("maps null optional fields to undefined", async () => {
    const fakeRow = {
      id: "user-456",
      email: "bare@example.com",
      displayName: null,
      steamId64: null,
      subscriptionTier: "free",
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    whereMock.mockResolvedValue([fakeRow]);

    const result = await getUserById("user-456");

    expect(result).toEqual({
      id: "user-456",
      email: "bare@example.com",
      displayName: undefined,
      steamId64: undefined,
      subscriptionTier: "free",
      stripeCustomerId: undefined,
    });
  });
});

describe("updateSteamId", () => {
  const updateWhereMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    setMock.mockReturnValue({ where: updateWhereMock });
  });

  it("calls db.update with the steamId64 and userId", async () => {
    await updateSteamId("user-123", "76561198000000001");

    expect(updateMock).toHaveBeenCalledOnce();
    expect(setMock).toHaveBeenCalledOnce();

    const setArg = setMock.mock.calls[0][0];
    expect(setArg.steamId64).toBe("76561198000000001");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("passes null when unlinking a Steam account", async () => {
    await updateSteamId("user-123", null);

    expect(setMock).toHaveBeenCalledOnce();
    const setArg = setMock.mock.calls[0][0];
    expect(setArg.steamId64).toBeNull();
  });
});

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls db.insert with user data and onConflictDoNothing", async () => {
    await createUser({ id: "user-789", email: "new@example.com" });

    expect(insertMock).toHaveBeenCalledOnce();
    expect(valuesMock).toHaveBeenCalledOnce();
    expect(valuesMock.mock.calls[0][0]).toEqual({
      id: "user-789",
      email: "new@example.com",
    });
    expect(onConflictDoNothingMock).toHaveBeenCalledOnce();
  });
});
