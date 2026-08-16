/*
 * MosqueConnect — Auth API helpers
 *
 * Shared headers and storage helpers for Sanctum bearer-token auth.
 * Session truth comes from GET /api/auth/me — not cached user objects.
 */

export const AUTH_TOKEN_KEY = "mc_auth_token";
export const AUTH_USER_KEY = "mc_auth_user";

export function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthHeaders() {
  const token = getStoredToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function clearAuthStorage() {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function cacheUser(user) {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}
