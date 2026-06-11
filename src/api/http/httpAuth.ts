import type { Role, Session, User } from "../../types/auth";
import type { AuthService, AuthServices, RoleAdminService, UserAdminService } from "../authServices";
import { authHeaders, getAuthToken, setAuthToken } from "./authToken";

/* ============================================================================
   HTTP auth implementation — talks to the real backend. Activated by setting
   VITE_API_BASE_URL. The endpoint contract is documented in README.md.
   The server owns all authorisation decisions; this layer just carries the
   bearer token issued at sign-in.
   ========================================================================== */

async function request<V>(baseUrl: string, path: string, init?: RequestInit): Promise<V> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  if (res.status === 204) return undefined as V;
  return (await res.json()) as V;
}

export function createHttpAuthServices(baseUrl: string): AuthServices {
  const api = <V,>(path: string, init?: RequestInit) => request<V>(baseUrl, path, init);

  const auth: AuthService = {
    getSession: async () => {
      if (!getAuthToken()) return null;
      try {
        return await api<Session>("/api/auth/session");
      } catch {
        // Expired or revoked token — drop it and fall back to the sign-in page.
        setAuthToken(null);
        return null;
      }
    },
    signIn: async (email, password) => {
      const session = await api<Session>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(session.token);
      return session;
    },
    signOut: async () => {
      try {
        await api<void>("/api/auth/logout", { method: "POST" });
      } finally {
        setAuthToken(null);
      }
    },
  };

  const users: UserAdminService = {
    list: () => api<User[]>("/api/users"),
    invite: (input) => api<User>("/api/users", { method: "POST", body: JSON.stringify(input) }),
    update: (id, patch) =>
      api<User>(`/api/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    suspend: (id) => api<User>(`/api/users/${encodeURIComponent(id)}/suspend`, { method: "POST" }),
    reactivate: (id) =>
      api<User>(`/api/users/${encodeURIComponent(id)}/reactivate`, { method: "POST" }),
    remove: (id) => api<void>(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };

  const roles: RoleAdminService = {
    list: () => api<Role[]>("/api/roles"),
    create: (input) => api<Role>("/api/roles", { method: "POST", body: JSON.stringify(input) }),
    update: (id, patch) =>
      api<Role>(`/api/roles/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    remove: (id) => api<void>(`/api/roles/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };

  return { auth, users, roles };
}
