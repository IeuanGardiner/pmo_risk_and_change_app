/* ----------------------------------------------------------------------------
   Bearer-token store for HTTP mode. The token is issued by POST /api/auth/login
   and attached to every API request as an Authorization header. Kept in its
   own module so both httpServices and httpAuth can use it without coupling.
   -------------------------------------------------------------------------- */

const TOKEN_STORAGE_KEY = "riskshield.auth.token";

let token: string | null = null;
let loaded = false;

export function getAuthToken(): string | null {
  if (!loaded) {
    loaded = true;
    try {
      token = localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      token = null;
    }
  }
  return token;
}

export function setAuthToken(next: string | null): void {
  token = next;
  loaded = true;
  try {
    if (next) localStorage.setItem(TOKEN_STORAGE_KEY, next);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage unavailable — the token still applies for this tab's lifetime.
  }
}

export function authHeaders(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
