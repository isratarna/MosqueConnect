/*
 * MosqueConnect — Auth context (OTP Phone Authentication)
 *
 * Provides phone-number-based OTP authentication, token persistence,
 * and user session management connecting to the Laravel REST API.
 * GET /api/auth/me is the source of truth for the authenticated user.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiUrl } from "../config";
import { translate } from "../i18n/translate";
import { networkFetch } from "../utils/network";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  cacheUser,
  clearAuthStorage,
  getAuthHeaders,
  getCachedUser,
  getStoredToken,
} from "../utils/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // A returning visitor's user is already on the device, so the interface can be
  // painted on the first frame and GET /api/auth/me can confirm it in the
  // background. Blocking on that request instead left every page blank for a
  // whole round trip — on a distant server, most of the time a page took to
  // appear. /me still has the last word a moment later.
  const [user, setUser] = useState(() => (getStoredToken() ? getCachedUser() : null));
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(() => !(getStoredToken() && getCachedUser()));
  const sessionVersion = useRef(0);

  const clearSession = useCallback(() => {
    sessionVersion.current += 1;
    setUser(null);
    setToken(null);
    clearAuthStorage();
  }, []);

  const restoreSession = useCallback(async () => {
    const version = ++sessionVersion.current;
    // Only show the loading state when there is nothing to show yet. With a
    // cached user on screen this is a silent revalidation, exactly like the
    // refresh path below.
    if (!(getStoredToken() && getCachedUser())) setLoading(true);
    try {
      const storedToken = getStoredToken();
      if (!storedToken) { clearSession(); return; }
      const res = await networkFetch(apiUrl("/api/auth/me"), { headers: getAuthHeaders() });
      if (version !== sessionVersion.current) return;
      if (res.ok) {
        const data = await res.json();
        if (version !== sessionVersion.current) return;
        setUser(data.user ?? null);
        setToken(storedToken);
        if (data.user) cacheUser(data.user);
      } else {
        setUser(null);
        if (res.status === 401 || res.status === 403) clearSession();
      }
    } catch {
      // A failed connection says nothing about whether the session is valid, so
      // a cached user stays signed in and the next request retries. Only an
      // explicit 401/403 above ends the session.
      if (version === sessionVersion.current && !getCachedUser()) setUser(null);
    } finally {
      if (version === sessionVersion.current || !getStoredToken()) setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Request OTP for phone number: POST /api/auth/send-otp
  async function sendOtp(phoneNumber) {
    try {
      const res = await networkFetch(apiUrl("/api/auth/send-otp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(" ")) ||
          translate("auth.errors.sendOtp");
        return { ok: false, error: errorMsg, data };
      }

      return { ok: true, message: data.message || translate("auth.otpSentDefault"), data };
    } catch (err) {
      return { ok: false, error: err.message || translate("auth.errors.networkSend") };
    }
  }

  // Verify OTP and authenticate user: POST /api/auth/verify-otp
  async function verifyOtp(phoneNumber, otp, { acceptTerms = false } = {}) {
    try {
      const res = await networkFetch(apiUrl("/api/auth/verify-otp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          otp,
          ...(acceptTerms ? { accept_terms: true } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(" ")) ||
          translate("auth.errors.verify");
        return { ok: false, error: errorMsg, data };
      }

      sessionVersion.current += 1;
      setLoading(false);
      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setToken(data.token);
      }

      if (data.user) {
        setUser(data.user);
        cacheUser(data.user);
      } else {
        await restoreSession();
      }

      return {
        ok: true,
        user: data.user,
        token: data.token,
        data,
      };
    } catch (err) {
      return { ok: false, error: err.message || translate("auth.errors.networkVerify") };
    }
  }

  // Revoke token and logout: POST /api/auth/logout
  async function logout() {
    const currentToken = token || getStoredToken();
    clearSession();

    if (currentToken) {
      try {
        await networkFetch(apiUrl("/api/auth/logout"), {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch (err) {
        console.error("Logout API call error:", err);
      }
    }

    clearSession();
    return { ok: true };
  }

  // Re-read the user (e.g. after joining or leaving a mosque team) without the
  // loading state, so protected pages stay mounted while it refreshes.
  const refreshUser = useCallback(async () => {
    const res = await fetch(apiUrl("/api/auth/me"), { headers: getAuthHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      cacheUser(data.user);
    }
    return data.user ?? null;
  }, []);

  function updateUser(updatedFields) {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      cacheUser(updated);
      return updated;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        sendOtp,
        verifyOtp,
        logout,
        updateUser,
        restoreSession,
        refreshUser,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
