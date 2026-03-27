import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveBatch, resolveProfile } from "./profile-resolver";
import { SteamOverlapError } from "./errors";
import { vanityCache } from "../cache";

const { resolveVanityUrlMock } = vi.hoisted(() => ({
  resolveVanityUrlMock: vi.fn(),
}));

vi.mock("./api", () => ({
  resolveVanityUrl: resolveVanityUrlMock,
}));

describe("resolveProfile", () => {
  beforeEach(() => {
    resolveVanityUrlMock.mockReset();
    vanityCache.clear();
  });

  it("passes through numeric profile inputs", async () => {
    await expect(
      resolveProfile({
        type: "steamid64",
        identifier: "76561198000000000",
        originalInput: "https://steamcommunity.com/profiles/76561198000000000",
        normalizedInput:
          "https://steamcommunity.com/profiles/76561198000000000",
      }),
    ).resolves.toEqual({
      originalUrl: "https://steamcommunity.com/profiles/76561198000000000",
      steamId64: "76561198000000000",
      profileUrl: "https://steamcommunity.com/profiles/76561198000000000",
    });
  });

  it("resolves vanity URLs through the steam API", async () => {
    resolveVanityUrlMock.mockResolvedValue({
      response: {
        success: 1,
        steamid: "76561198000000001",
      },
    });

    await expect(
      resolveProfile({
        type: "vanity",
        identifier: "friend-name",
        originalInput: "https://steamcommunity.com/id/friend-name",
        normalizedInput: "https://steamcommunity.com/id/friend-name",
      }),
    ).resolves.toEqual({
      originalUrl: "https://steamcommunity.com/id/friend-name",
      steamId64: "76561198000000001",
      vanityName: "friend-name",
      profileUrl: "https://steamcommunity.com/id/friend-name",
    });
  });

  it("throws a profile resolution error when vanity lookup fails", async () => {
    resolveVanityUrlMock.mockResolvedValue({
      response: {
        success: 42,
      },
    });

    await expect(
      resolveProfile({
        type: "vanity",
        identifier: "missing-user",
        originalInput: "https://steamcommunity.com/id/missing-user",
        normalizedInput: "https://steamcommunity.com/id/missing-user",
      }),
    ).rejects.toMatchObject({
      code: "PROFILE_RESOLUTION_FAILED",
      failedProfile: "https://steamcommunity.com/id/missing-user",
    } as Partial<SteamOverlapError>);
  });

  it("resolves batches concurrently", async () => {
    resolveVanityUrlMock.mockResolvedValue({
      response: {
        success: 1,
        steamid: "76561198000000002",
      },
    });

    await expect(
      resolveBatch([
        {
          type: "steamid64",
          identifier: "76561198000000000",
          originalInput:
            "https://steamcommunity.com/profiles/76561198000000000",
          normalizedInput:
            "https://steamcommunity.com/profiles/76561198000000000",
        },
        {
          type: "vanity",
          identifier: "friend-name",
          originalInput: "https://steamcommunity.com/id/friend-name",
          normalizedInput: "https://steamcommunity.com/id/friend-name",
        },
      ]),
    ).resolves.toHaveLength(2);
  });
});

describe("resolveProfile caching", () => {
  beforeEach(() => {
    resolveVanityUrlMock.mockReset();
    vanityCache.clear();
  });

  it("returns cached vanity resolution without calling Steam API", async () => {
    vanityCache.set("cached-user", "76561198000000099");

    const result = await resolveProfile({
      type: "vanity",
      identifier: "cached-user",
      originalInput: "https://steamcommunity.com/id/cached-user",
      normalizedInput: "https://steamcommunity.com/id/cached-user",
    });

    expect(result.steamId64).toBe("76561198000000099");
    expect(resolveVanityUrlMock).not.toHaveBeenCalled();
  });

  it("populates cache after a successful API resolution", async () => {
    resolveVanityUrlMock.mockResolvedValue({
      response: { success: 1, steamid: "76561198000000050" },
    });

    await resolveProfile({
      type: "vanity",
      identifier: "new-user",
      originalInput: "https://steamcommunity.com/id/new-user",
      normalizedInput: "https://steamcommunity.com/id/new-user",
    });

    expect(vanityCache.get("new-user")).toBe("76561198000000050");
  });

  it("bypasses cache when forceRefresh is true", async () => {
    vanityCache.set("cached-user", "76561198000000099");

    resolveVanityUrlMock.mockResolvedValue({
      response: { success: 1, steamid: "76561198000000100" },
    });

    const result = await resolveProfile(
      {
        type: "vanity",
        identifier: "cached-user",
        originalInput: "https://steamcommunity.com/id/cached-user",
        normalizedInput: "https://steamcommunity.com/id/cached-user",
      },
      { forceRefresh: true },
    );

    expect(result.steamId64).toBe("76561198000000100");
    expect(resolveVanityUrlMock).toHaveBeenCalledOnce();
    // Cache should be updated with new value
    expect(vanityCache.get("cached-user")).toBe("76561198000000100");
  });
});
