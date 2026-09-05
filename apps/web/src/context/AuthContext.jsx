/*
 * MosqueConnect — Auth context (OTP Phone Authentication)
 *
 * Provides phone-number-based OTP authentication, token persistence,
 * and user session management connecting to the Laravel REST API.
 * GET /api/auth/me is the source of truth for the authenticated user.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);

  const clearSession = useCallback(() => {
    sessionVersion.current += 1;
    setUser(null);
    setToken(null);
    clearAuthStorage();
  }, []);

  const restoreSession = useCallback(async () => {
    const version = ++sessionVersion.current;
    setLoading(true);
    try {
      const storedToken = getStoredToken();
      if (!storedToken) { clearSession(); return; }
      const res = await fetch(apiUrl("/api/auth/me"), { headers: getAuthHeaders() });
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
      if (version === sessionVersion.current) setUser(null);
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
      return { ok: false, error: err.message || "Network error while verifying OTP." };
    }
  }

  // Revoke token and logout: POST /api/auth/logout
  async function logout() {
    const currentToken = token || getStoredToken();
    clearSession();

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
