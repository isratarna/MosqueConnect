/*
 * MosqueConnect — Auth context (Phase 1)
 *
 * Client-side only (no backend yet). A "logged-in" user is persisted in
 * localStorage; login is validated against the hardcoded demo accounts below.
 * Real, secure authentication arrives with the Laravel API in Phase 2.
 */
import { createContext, useContext, useEffect, useState } from "react";

const AUTH_KEY = "mc_auth_user";

// Hardcoded demo accounts for Phase 1.
export const DEMO_ACCOUNTS = [
  { email: "hello123@gmail.com", password: "hello1234", name: "Hello User" },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); }
    catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  }, [user]);

  // Returns { ok: true } or { ok: false, error }.
  function login(email, password) {
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password
    );
    if (!account) return { ok: false, error: "Invalid email or password." };
    setUser({ name: account.name, email: account.email });
    return { ok: true };
  }

  // Registration is a demo stub: accept any valid input and sign the user in.
  function register(name, email) {
    setUser({ name: name.trim(), email: email.trim().toLowerCase() });
    return { ok: true };
  }

  function logout() { setUser(null); }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
