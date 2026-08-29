/*
 * MosqueConnect — Auth context (OTP Phone Authentication)
 *
 * Provides phone-number-based OTP authentication, token persistence,
 * and user session management connecting to the Laravel REST API.
 * GET /api/auth/me is the source of truth for the authenticated user.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "../config";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  cacheUser,
  clearAuthStorage,
  getAuthHeaders,
  getStoredToken,
} from "../utils/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => getStoredToken());
  // If we already have a cached user, we can start with loading = false
  // so the UI renders immediately without a spinner.
  const [loading, setLoading] = useState(() => !localStorage.getItem(AUTH_USER_KEY));

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuthStorage();
  }, []);

  const restoreSession = useCallback(async () => {
    // Only show the blocking spinner if we don't already have a cached user.
    if (!localStorage.getItem(AUTH_USER_KEY)) {
      setLoading(true);
    }

    try {
      const storedToken = getStoredToken();
      if (!storedToken) {
        clearSession();
        setLoading(false);
        return;
      }

      // If we already have a user from localStorage, we might not need to clear it 
      // immediately if the API fetch fails (especially if backend is under development).
      const res = await fetch(apiUrl("/api/auth/me"), {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        setToken(storedToken);
        if (data.user) {
          cacheUser(data.user);
        }
        return;
      }

      if (res.status === 401 || res.status === 403) {
        clearSession();
        return;
      }

      // If backend returns 404 or 500 (e.g. during development), 
      // keep the localStorage user session active as a fallback.
      if (!localStorage.getItem(AUTH_USER_KEY)) {
        clearSession();
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
      // Don't clear session on network error if we have a cached user
      if (!localStorage.getItem(AUTH_USER_KEY)) {
        clearSession();
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Request OTP for phone number: POST /api/auth/send-otp
  async function sendOtp(phoneNumber) {
    try {
      const res = await fetch(apiUrl("/api/auth/send-otp"), {
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
          "Failed to send OTP.";
        return { ok: false, error: errorMsg, data };
      }

      return { ok: true, message: data.message || "OTP sent successfully.", data };
    } catch (err) {
      return { ok: false, error: err.message || "Network error while sending OTP." };
    }
  }

  // Verify OTP and authenticate user: POST /api/auth/verify-otp
  async function verifyOtp(phoneNumber, otp) {
    try {
      const res = await fetch(apiUrl("/api/auth/verify-otp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone: phoneNumber, otp }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(" ")) ||
          "Invalid OTP verification failed.";
        return { ok: false, error: errorMsg, data };
      }

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
      return { ok: false, error: err.message || "Network error while verifying OTP." };
    }
  }

  // Revoke token and logout: POST /api/auth/logout
  async function logout() {
    const currentToken = token || getStoredToken();

    if (currentToken) {
      try {
        await fetch(apiUrl("/api/auth/logout"), {
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
