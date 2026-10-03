import { useSyncExternalStore } from "react";
import {
  applyTheme,
  readPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writePreference,
} from "../utils/theme";

// A small store, so the switcher and anything else that reads the theme (a chart
// that needs to know, say) always agree, however many places call the hook.

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const darkQuery = typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

const listeners = new Set();

function compute(preference) {
  return { preference, resolved: resolveTheme(preference, Boolean(darkQuery?.matches)) };
}

let snapshot = compute(readPreference(browserStorage()));

function update(preference) {
  snapshot = compute(preference);
  if (typeof document !== "undefined") applyTheme(document.documentElement, snapshot.resolved);
  listeners.forEach((listener) => listener());
}

/** Applies the saved theme and keeps it current. Call once, at start-up. */
// [Urmee · VIVA] App start e ekbar: saved theme lagai, OS setting ba onno tab e choice bodlale follow kori.
export function initTheme() {
  update(readPreference(browserStorage()));

  // The operating system's setting changed (only matters for "system").
  darkQuery?.addEventListener?.("change", () => update(snapshot.preference));

  // The preference was changed in another tab.
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY) update(readPreference(browserStorage()));
  });
}

// [Urmee · VIVA] Choice save kore (localStorage) ar sathe sathe theme lagai.
export function setThemePreference(preference) {
  writePreference(browserStorage(), preference);
  update(preference);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** { preference: "system" | "light" | "dark", resolved: "light" | "dark", setPreference } */
// [Urmee · VIVA] Component ke { preference, resolved, setPreference } dey. useSyncExternalStore diye shobjaygay ek theme dekhay.
export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return { ...current, setPreference: setThemePreference };
}
