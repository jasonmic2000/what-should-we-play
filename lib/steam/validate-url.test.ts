import { describe, it, expect } from "vitest";
import { isValidSteamProfileUrl, extractDisplayName } from "./validate-url";

describe("isValidSteamProfileUrl", () => {
  it("accepts vanity URL with https", () => {
    expect(isValidSteamProfileUrl("https://steamcommunity.com/id/gabelogannewell")).toBe(true);
  });

  it("accepts vanity URL with trailing slash", () => {
    expect(isValidSteamProfileUrl("https://steamcommunity.com/id/gabelogannewell/")).toBe(true);
  });

  it("accepts vanity URL without protocol", () => {
    expect(isValidSteamProfileUrl("steamcommunity.com/id/gabelogannewell")).toBe(true);
  });

  it("accepts numeric profile URL", () => {
    expect(isValidSteamProfileUrl("https://steamcommunity.com/profiles/76561198000000000")).toBe(true);
  });

  it("accepts numeric profile URL with trailing slash", () => {
    expect(isValidSteamProfileUrl("https://steamcommunity.com/profiles/76561198000000000/")).toBe(true);
  });

  it("accepts URL with www prefix", () => {
    expect(isValidSteamProfileUrl("https://www.steamcommunity.com/id/user")).toBe(true);
  });

  it("rejects raw SteamID64", () => {
    expect(isValidSteamProfileUrl("76561198000000000")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidSteamProfileUrl("")).toBe(false);
  });

  it("rejects non-Steam URL", () => {
    expect(isValidSteamProfileUrl("https://example.com/id/user")).toBe(false);
  });

  it("rejects profile URL with wrong digit count", () => {
    expect(isValidSteamProfileUrl("https://steamcommunity.com/profiles/1234")).toBe(false);
  });
});

describe("extractDisplayName", () => {
  it("extracts vanity name from vanity URL", () => {
    expect(extractDisplayName("https://steamcommunity.com/id/gabelogannewell")).toBe("gabelogannewell");
  });

  it("extracts SteamID64 from numeric URL", () => {
    expect(extractDisplayName("https://steamcommunity.com/profiles/76561198000000000")).toBe("76561198000000000");
  });

  it("returns input as-is for non-matching strings", () => {
    expect(extractDisplayName("not-a-url")).toBe("not-a-url");
  });
});
