import { apiUrl } from "../config";
import { getAuthHeaders } from "./authApi";

export async function apiRequest(path, { body, headers, ...options } = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(Object.values(data.errors || {}).flat().join(" ") || data.message || "Unable to complete the request. Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function internationalPhone(countryCode, phone) {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return `${countryCode}${digits}`;
}

export function returnPath(location, fallback = "/") {
  const path = location.state?.from;
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/^\/(login|register)([/?#]|$)/.test(path) ? path : fallback;
}
