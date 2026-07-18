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
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [user]);

  // Returns { ok: true } or { ok: false, error }.
  function login(email, password) {
    const emailLower = email.trim().toLowerCase();

    // 1. Check custom users in localStorage
    const registered = JSON.parse(localStorage.getItem("mc_registered_users") || "[]");
    const matchedUser = registered.find(
      (u) => u.email === emailLower && u.password === password
    );
    if (matchedUser) {
      setUser(matchedUser);
      return { ok: true };
    }

    // 2. Check demo accounts
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email === emailLower && a.password === password
    );
    if (account) {
      const demoUser = {
        id: "demo-user",
        name: account.name,
        fullName: account.name,
        email: account.email,
        role: "user",
        status: "approved",
      };
      setUser(demoUser);
      return { ok: true };
    }

    return { ok: false, error: "Invalid email or password." };
  }

  // Registration: validate input, persist user to localStorage registry, and sign in.
  function register(userData) {
    const emailLower = userData.email.trim().toLowerCase();

    // Check if email already exists in custom registered users
    const registered = JSON.parse(localStorage.getItem("mc_registered_users") || "[]");
    if (registered.some((u) => u.email === emailLower)) {
      return { ok: false, error: "Email is already registered." };
    }

    // Check demo accounts
    if (DEMO_ACCOUNTS.some((a) => a.email === emailLower)) {
      return { ok: false, error: "Email is already registered as a demo account." };
    }

    const newUser = {
      id: Date.now().toString(),
      fullName: userData.fullName.trim(),
      name: userData.fullName.trim(), // for compatibility with code referencing user.name
      email: emailLower,
      phone: userData.phone.trim(),
      password: userData.password,
      role: userData.role, // 'user' or 'mosque_admin'
      status: userData.role === "mosque_admin" ? "pending" : "approved",
      mosqueName: userData.role === "mosque_admin" ? userData.mosqueName.trim() : null,
      mosqueAddress: userData.role === "mosque_admin" ? userData.mosqueAddress.trim() : null,
      mosqueRole: userData.role === "mosque_admin" ? userData.mosqueRole.trim() : null,
      proofDocument: userData.role === "mosque_admin" ? (userData.proofDocument || "proof_document.pdf") : null,
      createdAt: new Date().toISOString()
    };

    registered.push(newUser);
    localStorage.setItem("mc_registered_users", JSON.stringify(registered));

    setUser(newUser);
    return { ok: true, user: newUser };
  }

  function updateUser(updatedFields) {
    if (!user) return;
    const updatedUser = { ...user, ...updatedFields };
    setUser(updatedUser);

    if (user.id !== "demo-user") {
      const registered = JSON.parse(localStorage.getItem("mc_registered_users") || "[]");
      const idx = registered.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        registered[idx] = { ...registered[idx], ...updatedFields };
        localStorage.setItem("mc_registered_users", JSON.stringify(registered));
      }
    }
  }

  
  function logout() {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
