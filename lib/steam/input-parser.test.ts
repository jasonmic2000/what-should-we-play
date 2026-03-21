import { describe, expect, it } from "vitest";
import {
  normalizeProfileInput,
  parseSteamProfileInput,
} from "./input-parser";

describe("parseSteamProfileInput", () => {
  it("parses vanity profile URLs", () => {
    expect(
      parseSteamProfileInput("https://steamcommunity.com/id/some-user/"),
    ).toEqual({
      type: "vanity",
      identifier: "some-user",
      originalInput: "https://steamcommunity.com/id/some-user/",
      normalizedInput: "https://steamcommunity.com/id/some-user",
    });
  });

  it("parses numeric profile URLs", () => {
    expect(
      parseSteamProfileInput(
        "https://steamcommunity.com/profiles/76561198000000000",
      ),
    ).toEqual({
      type: "steamid64",
      identifier: "76561198000000000",
      originalInput: "https://steamcommunity.com/profiles/76561198000000000",
      normalizedInput: "https://steamcommunity.com/profiles/76561198000000000",
    });
  });

  it("rejects raw steam ids", () => {
    expect(parseSteamProfileInput("76561198000000000")).toBeNull();
  });

  it("rejects non-steam URLs", () => {
    expect(parseSteamProfileInput("https://example.com/id/test")).toBeNull();
  });
});

describe("normalizeProfileInput", () => {
  it("trims whitespace and trailing slashes", () => {
    expect(
      normalizeProfileInput("  https://steamcommunity.com/id/test-user///  "),
    ).toBe("https://steamcommunity.com/id/test-user");
  });
});
