import { getToken } from "./auth";

// Strip trailing slashes from BASE URL if present
const rawBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = rawBase.replace(/\/$/, "");


const TIMEOUT_MS = 30000;

export class ApiTimeoutError extends Error {}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Ensure path starts with a single leading slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  try {
    const res = await fetch(`${BASE}${cleanPath}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    return res;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiTimeoutError("Request took too long");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}