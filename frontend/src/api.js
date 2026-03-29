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

// ?? (not ||) so an empty VITE_API_URL string stays empty (relative paths via Vite proxy).
// In production with nginx, VITE_API_URL is also empty so relative /api/ paths are used.
const BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * apiFetch
 * Wraps fetch with base URL and JSON headers.
 * Throws an Error with the server's message if the response is not ok.
 * Handles network failures and non-JSON error bodies gracefully.
 */
export async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    // Network-level failure (server offline, no internet, DNS failure, etc.)
    throw new Error("Cannot reach the server — check your connection");
  }

  // Try to parse JSON; if the server returned HTML (e.g. nginx 502), fail gracefully
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status})`);
  }

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
