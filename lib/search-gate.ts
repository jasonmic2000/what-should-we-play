const STORAGE_KEY = "wsw_search_count";
const MAX_FREE_SEARCHES = 3;

export function getSearchCount(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function incrementSearchCount(): number {
  const count = getSearchCount() + 1;
  localStorage.setItem(STORAGE_KEY, String(count));
  return count;
}

export function isSearchGated(): boolean {
  return getSearchCount() >= MAX_FREE_SEARCHES;
}

export function resetSearchCount(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export { MAX_FREE_SEARCHES };
