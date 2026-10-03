/*
 * Colour theme: "system" follows the operating system, "light" and "dark" are
 * explicit. The choice is kept in localStorage and applied as
 * <html data-bs-theme="light|dark">, which Bootstrap 5.3 understands.
 *
 * The inline script in index.html repeats the read-and-apply steps below so the
 * theme is set before the first paint. Keep the storage key and the values in
 * step with it.
 */

// [Urmee · VIVA] localStorage key. Theme preference = system / light / dark.
export const THEME_STORAGE_KEY = "mc-theme";
export const THEME_PREFERENCES = ["system", "light", "dark"];

export function normalizePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : "system";
}

// Storage can be unavailable (private windows, blocked site data), so every
// access is guarded; the preference then simply lasts for the visit.
// [Urmee · VIVA] Saved choice porhi. Storage na thakle try/catch diye "system".
export function readPreference(storage) {
  try {
    return normalizePreference(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writePreference(storage, preference) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, normalizePreference(preference));
  } catch {
    // The theme still changes for this visit.
  }
}

// [Urmee · VIVA] "system" hole OS dark/light dekhe thik kori; light/dark hole sheta-i.
export function resolveTheme(preference, systemPrefersDark) {
  const normalized = normalizePreference(preference);
  if (normalized === "system") return systemPrefersDark ? "dark" : "light";
  return normalized;
}

// [Urmee · VIVA] <html data-bs-theme="dark|light"> boshai. Bootstrap ar amader CSS dui-i ei attribute dekhe dark hoy. colorScheme e scrollbar/input o dark hoy.
export function applyTheme(root, resolved) {
  root.setAttribute("data-bs-theme", resolved);
  // Lets the browser draw scrollbars and form controls to match.
  root.style.colorScheme = resolved;
}
