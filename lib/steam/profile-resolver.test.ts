import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveBatch, resolveProfile } from "./profile-resolver";
import { SteamOverlapError } from "./errors";

const { resolveVanityUrlMock } = vi.hoisted(() => ({
  resolveVanityUrlMock: vi.fn(),
}));

vi.mock("./api", () => ({
  resolveVanityUrl: resolveVanityUrlMock,
}));

describe("resolveProfile", () => {
  beforeEach(() => {
    resolveVanityUrlMock.mockReset();
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
