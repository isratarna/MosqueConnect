export const RECENT_SEARCHES_KEY = "mc-recent-searches";
export const MAX_RECENT_SEARCHES = 6;

const browserStorage = () => {
  try { return window.localStorage; } catch { return null; }
};

/** Newest first, without duplicates (case-insensitive), capped. Pure. */
export function addRecent(list, query) {
  const term = query.trim();
  if (!term) return list;
  const rest = list.filter((item) => item.toLowerCase() !== term.toLowerCase());
  return [term, ...rest].slice(0, MAX_RECENT_SEARCHES);
}

export function readRecent(storage = browserStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(RECENT_SEARCHES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

/** Returns the new list even when storage is blocked, so the UI still updates. */
export function saveRecent(query, storage = browserStorage()) {
  const next = addRecent(readRecent(storage), query);
  try { storage?.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch { /* blocked or full */ }
  return next;
}

export function clearRecent(storage = browserStorage()) {
  try { storage?.removeItem(RECENT_SEARCHES_KEY); } catch { /* blocked */ }
  return [];
}
