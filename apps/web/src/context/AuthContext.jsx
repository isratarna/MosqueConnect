/*
 * MosqueConnect — Auth context (OTP Phone Authentication)
 *
 * Provides phone-number-based OTP authentication, token persistence,
 * and user session management connecting to the Laravel REST API.
 */
import { createContext, useContext, useEffect, useState } from "react";

const AUTH_KEY = "mc_auth_user";
const AUTH_TOKEN_KEY = "mc_auth_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Fetch current user from /api/auth/me on load
  useEffect(() => {
    let isMounted = true;

    async function fetchCurrentUser() {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`,
            Accept: "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUser(data.user);
            localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
          }
        } else {
          // Token is invalid/expired
          if (isMounted) {
            setUser(null);
            setToken(null);
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem(AUTH_TOKEN_KEY);
          }
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Request OTP for phone number: POST /api/auth/send-otp
  async function sendOtp(phoneNumber) {
    try {
      const res = await fetch("/api/auth/send-otp", {
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
      const res = await fetch("/api/auth/verify-otp", {
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
        localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
        setUser(data.user);
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
    const currentToken = token || localStorage.getItem(AUTH_TOKEN_KEY);
    if (currentToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            Accept: "application/json",
          },
        });
      } catch (err) {
        console.error("Logout API call error:", err);
      }
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);

    return { ok: true };
  }

  function updateUser(updatedFields) {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
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
