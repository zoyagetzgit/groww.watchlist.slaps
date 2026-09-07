// Just localStorage for the token itself - it's a single small string and
// needs to be read synchronously before the first render to decide whether
// to redirect to /login. IndexedDB (via idb-keyval) is reserved for the
// actual market-state cache and write-ahead log in lib/offline, where the
// extra capacity and async API earn their keep.

const KEY = "swl_token";
const NAME_KEY = "swl_name";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setSession(token: string, name: string) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(NAME_KEY, name);
}

export function getName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(NAME_KEY);
}
