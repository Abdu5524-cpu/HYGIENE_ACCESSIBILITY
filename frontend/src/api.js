/**
 * api.js
 *
 * Thin wrapper around fetch for all backend API calls.
 * Reads the backend URL from the VITE_API_URL environment variable
 * so it works both locally and in production without code changes.
 *
 * Usage:
 *   import { apiFetch } from "./api.js";
 *   const user = await apiFetch("/api/users/login", {
 *     method: "POST",
 *     body: JSON.stringify({ username, password }),
 *   });
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * apiFetch
 * Wraps fetch with base URL and JSON headers.
 * Throws an Error with the server's message if the response is not ok.
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
