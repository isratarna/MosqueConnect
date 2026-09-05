import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

export const API_URL = process.env.VITE_API_URL || "http://localhost:8000";

export const DEMO_PHONES = {
  superAdmin: "+8801700000001",
  mosqueAdmin: "+8801711000101",
  member: "+8801812000201",
};

export async function apiIsUp() {
  try {
    const response = await fetch(`${API_URL}/up`, { signal: AbortSignal.timeout(4000) });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The demo OTP is single-use, so every run reseeds it before logging in.
 * Returns false when the API container is not reachable.
 */
export async function reseedDemoOtp() {
  try {
    await run("docker", ["compose", "exec", "-T", "api", "php", "artisan", "db:seed", "--class=DemoAuthenticationSeeder", "--force"], {
      cwd: repoRoot,
      timeout: 120000,
    });
    return true;
  } catch {
    return false;
  }
}

async function verifyOtp(phone) {
  const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ phone, otp: "123456" }),
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, token: payload.token };
}

/**
 * Logs in through the real OTP endpoint and returns a Sanctum token. The demo
 * OTP is single-use, so a parallel worker may consume it first; reseed and
 * retry once rather than failing the run.
 */
export async function tokenFor(phone) {
  let attempt = await verifyOtp(phone);

  if (!attempt.token) {
    await reseedDemoOtp();
    attempt = await verifyOtp(phone);
  }

  if (!attempt.token) {
    throw new Error(
      `Could not log in as ${phone} (HTTP ${attempt.status}). `
      + "Reseed the demo OTP with: "
      + "docker compose exec api php artisan db:seed --class=DemoAuthenticationSeeder",
    );
  }

  return attempt.token;
}

/** Puts the token where AuthContext reads it, so the app boots authenticated. */
export async function signIn(page, token) {
  await page.addInitScript((value) => localStorage.setItem("mc_auth_token", value), token);
}

export async function api(pathname, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_URL}${pathname}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: response.status, body: await response.json().catch(() => ({})) };
}
