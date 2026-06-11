import type { Role, RoleInput, Session, User, UserInput } from "../types/auth";

/* ============================================================================
   Auth & user-administration service interfaces — the seam between the UI
   and the backend, mirroring src/api/services.ts. Two implementations exist:
     - mock/mockAuth.ts   localStorage-backed users/roles/session (default)
     - http/httpAuth.ts   fetch calls against VITE_API_BASE_URL

   The backend must enforce permissions on every endpoint (users:manage,
   roles:manage, …) — the client only uses them to shape the UI.
   ========================================================================== */

export interface AuthService {
  /** Restore the current session from the stored token/cookie; null when signed out. */
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
}

export interface UserAdminService {
  list(): Promise<User[]>;
  /** Creates a user in "Invited" status; they become Active on first sign-in. */
  invite(input: UserInput): Promise<User>;
  update(id: string, patch: Partial<UserInput>): Promise<User>;
  suspend(id: string): Promise<User>;
  reactivate(id: string): Promise<User>;
  /** Permanently removes a user. The server must refuse to remove the last admin. */
  remove(id: string): Promise<void>;
}

export interface RoleAdminService {
  list(): Promise<Role[]>;
  create(input: RoleInput): Promise<Role>;
  /** System roles are immutable — only custom roles may be updated. */
  update(id: string, patch: Partial<RoleInput>): Promise<Role>;
  /** Only custom roles not assigned to any user may be deleted. */
  remove(id: string): Promise<void>;
}

export interface AuthServices {
  auth: AuthService;
  users: UserAdminService;
  roles: RoleAdminService;
}
