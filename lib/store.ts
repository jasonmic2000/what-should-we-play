"use client";

import { create } from "zustand";
import type { FindOverlapData, FindOverlapResponse, APIError } from "./types";
import { MAX_PROFILE_COUNT } from "./constants";
import { isValidSteamProfileUrl } from "./steam/validate-url";

export type ProfileStatus = "pending" | "valid" | "invalid" | "duplicate";

export interface ProfileEntry {
  url: string;
  status: ProfileStatus;
  errorMessage?: string;
}

export type RequestStatus = "idle" | "loading" | "success" | "error";

interface AppState {
  profiles: ProfileEntry[];
  results: FindOverlapData | null;
  error: APIError | null;
  status: RequestStatus;

  addProfile: (url: string) => { success: boolean; errorMessage?: string };
  removeProfile: (url: string) => void;
  clearProfiles: () => void;
  setResults: (data: FindOverlapData) => void;
  setError: (error: APIError) => void;
  setStatus: (status: RequestStatus) => void;
  submitProfiles: (forceRefresh?: boolean) => Promise<void>;
  reset: () => void;
}

const initialState = {
  profiles: [] as ProfileEntry[],
  results: null as FindOverlapData | null,
  error: null as APIError | null,
  status: "idle" as RequestStatus,
};

export const useAppStore = create<AppState>()((set, get) => ({
  ...initialState,

  addProfile: (url: string) => {
    const trimmed = url.trim();
    const { profiles } = get();

    if (profiles.length >= MAX_PROFILE_COUNT) {
      return { success: false, errorMessage: `Maximum of ${MAX_PROFILE_COUNT} profiles allowed` };
    }

    if (!isValidSteamProfileUrl(trimmed)) {
      return { success: false, errorMessage: "Enter a valid Steam profile URL (e.g. steamcommunity.com/id/username)" };
    }

    const normalized = trimmed.replace(/\/+$/, "").toLowerCase();
    const isDuplicate = profiles.some(
      (p) => p.url.replace(/\/+$/, "").toLowerCase() === normalized
    );

    if (isDuplicate) {
      return { success: false, errorMessage: "This profile has already been added" };
    }

    set({
      profiles: [...profiles, { url: trimmed, status: "valid" }],
    });

    return { success: true };
  },

  removeProfile: (url: string) => {
    set({ profiles: get().profiles.filter((p) => p.url !== url) });
  },

  clearProfiles: () => {
    set({ profiles: [] });
  },

  setResults: (data: FindOverlapData) => {
    set({ results: data, status: "success", error: null });
  },

  setError: (error: APIError) => {
    set({ error, status: "error", results: null });
  },

  setStatus: (status: RequestStatus) => {
    set({ status });
  },

  submitProfiles: async (forceRefresh = false) => {
    const { profiles } = get();
    set({ status: "loading", error: null });

    try {
      const res = await fetch("/api/find-overlap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profiles: profiles.map((p) => p.url),
          forceRefresh,
        }),
      });

      const json: FindOverlapResponse = await res.json();

      if (json.success && json.data) {
        set({ results: json.data, status: "success", error: null });
      } else {
        set({
          error: json.error ?? { code: "API_ERROR", message: "An unexpected error occurred" },
          status: "error",
          results: null,
        });
      }
    } catch {
      set({
        error: { code: "API_ERROR", message: "Failed to connect to the server. Please try again." },
        status: "error",
        results: null,
      });
    }
  },

  reset: () => {
    set({ ...initialState });
  },
}));
