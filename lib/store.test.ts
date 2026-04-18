import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./store";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  describe("addProfile", () => {
    it("adds a valid vanity URL", () => {
      const result = useAppStore.getState().addProfile("https://steamcommunity.com/id/gaben");
      expect(result.success).toBe(true);
      expect(useAppStore.getState().profiles).toHaveLength(1);
      expect(useAppStore.getState().profiles[0].url).toBe("https://steamcommunity.com/id/gaben");
      expect(useAppStore.getState().profiles[0].status).toBe("valid");
    });

    it("adds a valid numeric profile URL", () => {
      const result = useAppStore.getState().addProfile("https://steamcommunity.com/profiles/76561198000000000");
      expect(result.success).toBe(true);
      expect(useAppStore.getState().profiles).toHaveLength(1);
    });

    it("rejects an invalid URL", () => {
      const result = useAppStore.getState().addProfile("not-a-url");
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(useAppStore.getState().profiles).toHaveLength(0);
    });

    it("rejects duplicate URLs", () => {
      useAppStore.getState().addProfile("https://steamcommunity.com/id/gaben");
      const result = useAppStore.getState().addProfile("https://steamcommunity.com/id/gaben");
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("already been added");
      expect(useAppStore.getState().profiles).toHaveLength(1);
    });

    it("detects duplicates case-insensitively", () => {
      useAppStore.getState().addProfile("https://steamcommunity.com/id/Gaben");
      const result = useAppStore.getState().addProfile("https://steamcommunity.com/id/gaben");
      expect(result.success).toBe(false);
    });

    it("rejects when at max capacity", () => {
      for (let i = 0; i < 6; i++) {
        useAppStore.getState().addProfile(`https://steamcommunity.com/id/user${i}`);
      }
      const result = useAppStore.getState().addProfile("https://steamcommunity.com/id/user6");
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("Maximum");
    });
  });

  describe("removeProfile", () => {
    it("removes a profile by URL", () => {
      useAppStore.getState().addProfile("https://steamcommunity.com/id/gaben");
      useAppStore.getState().addProfile("https://steamcommunity.com/id/user2");
      useAppStore.getState().removeProfile("https://steamcommunity.com/id/gaben");
      expect(useAppStore.getState().profiles).toHaveLength(1);
      expect(useAppStore.getState().profiles[0].url).toBe("https://steamcommunity.com/id/user2");
    });
  });

  describe("clearProfiles", () => {
    it("removes all profiles", () => {
      useAppStore.getState().addProfile("https://steamcommunity.com/id/gaben");
      useAppStore.getState().addProfile("https://steamcommunity.com/id/user2");
      useAppStore.getState().clearProfiles();
      expect(useAppStore.getState().profiles).toHaveLength(0);
    });
  });

  describe("setResults / setError / setStatus", () => {
    it("sets results and updates status to success", () => {
      const data = { profiles: [], sharedGames: [] };
      useAppStore.getState().setResults(data);
      expect(useAppStore.getState().results).toEqual(data);
      expect(useAppStore.getState().status).toBe("success");
      expect(useAppStore.getState().error).toBeNull();
    });

    it("sets error and updates status to error", () => {
      const error = { code: "API_ERROR" as const, message: "Something went wrong" };
      useAppStore.getState().setError(error);
      expect(useAppStore.getState().error).toEqual(error);
      expect(useAppStore.getState().status).toBe("error");
      expect(useAppStore.getState().results).toBeNull();
    });

    it("sets status independently", () => {
      useAppStore.getState().setStatus("loading");
      expect(useAppStore.getState().status).toBe("loading");
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      useAppStore.getState().addProfile("https://steamcommunity.com/id/gaben");
      useAppStore.getState().setStatus("loading");
      useAppStore.getState().setMultiplayerOnly(true);
      useAppStore.getState().reset();
      expect(useAppStore.getState().profiles).toHaveLength(0);
      expect(useAppStore.getState().results).toBeNull();
      expect(useAppStore.getState().error).toBeNull();
      expect(useAppStore.getState().status).toBe("idle");
      expect(useAppStore.getState().multiplayerOnly).toBe(false);
    });
  });

  describe("multiplayerOnly", () => {
    it("defaults to false", () => {
      expect(useAppStore.getState().multiplayerOnly).toBe(false);
    });

    it("can be set to true via setMultiplayerOnly", () => {
      useAppStore.getState().setMultiplayerOnly(true);
      expect(useAppStore.getState().multiplayerOnly).toBe(true);
    });

    it("can be toggled back to false", () => {
      useAppStore.getState().setMultiplayerOnly(true);
      useAppStore.getState().setMultiplayerOnly(false);
      expect(useAppStore.getState().multiplayerOnly).toBe(false);
    });
  });
});
