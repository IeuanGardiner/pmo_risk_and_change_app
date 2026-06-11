import type { Permission, Role, RoleInput, Session, User, UserInput } from "../../types/auth";
import { initialsOf, SYSTEM_ROLES } from "../../types/auth";
import type { AuthService, AuthServices, RoleAdminService, UserAdminService } from "../authServices";

/* ============================================================================
   Mock auth implementation — localStorage-backed users, custom roles and
   session, with the invariants a real backend must enforce:
     - credentials checked on sign-in; suspended accounts rejected
     - admin endpoints require users:manage / roles:manage
     - the last active admin cannot be suspended, removed or demoted
     - system roles are immutable; custom roles in use cannot be deleted
   Every demo account signs in with the password below.
   ========================================================================== */

export const DEMO_PASSWORD = "demo1234";

const LATENCY_MS = 350;
const delay = <V,>(value: V): Promise<V> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
const fail = (message: string): Promise<never> => Promise.reject(new Error(message));

const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V;
const nowIso = () => new Date().toISOString();

const SEED_TIME = "2026-01-05T09:00:00.000Z";

const systemRoles = (): Role[] =>
  SYSTEM_ROLES.map((r) => ({ ...r, permissions: [...r.permissions], createdAt: SEED_TIME, updatedAt: SEED_TIME }));

/** One demo account per built-in role so every access level can be exercised. */
export const SEED_USERS: User[] = [
  { name: "Ava Daniels", email: "ava.daniels@example.com", roleIds: ["admin"] },
  { name: "Rachel Moore", email: "rachel.moore@example.com", roleIds: ["risk-manager"] },
  { name: "Caleb Martin", email: "caleb.martin@example.com", roleIds: ["change-manager"] },
  { name: "Erin Walsh", email: "erin.walsh@example.com", roleIds: ["risk-editor"] },
  { name: "Charlie Edwards", email: "charlie.edwards@example.com", roleIds: ["change-editor"] },
  { name: "Riley Osei", email: "riley.osei@example.com", roleIds: ["read-only"] },
].map((u, i) => ({
  id: `usr-${String(i + 1).padStart(3, "0")}`,
  name: u.name,
  email: u.email,
  initials: initialsOf(u.name),
  roleIds: u.roleIds,
  status: "Active",
  lastActiveAt: null,
  createdAt: SEED_TIME,
  updatedAt: SEED_TIME,
}));

/* ---- Persistence (versioned; bump the key on breaking changes) ----------- */
const AUTH_STORAGE_KEY = "riskshield.auth.v1";

interface StoredAuth {
  users: User[];
  customRoles: Role[];
  sessionUserId: string | null;
}

function loadStored(): StoredAuth {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredAuth>;
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        return {
          users: parsed.users,
          customRoles: Array.isArray(parsed.customRoles) ? parsed.customRoles : [],
          sessionUserId: typeof parsed.sessionUserId === "string" ? parsed.sessionUserId : null,
        };
      }
    }
  } catch {
    // Corrupt or unavailable storage — fall through to the seed.
  }
  return { users: clone(SEED_USERS), customRoles: [], sessionUserId: null };
}

export function createMockAuthServices(): AuthServices {
  const stored = loadStored();
  let users: User[] = stored.users;
  let customRoles: Role[] = stored.customRoles;
  let sessionUserId: string | null = stored.sessionUserId;

  const persist = () => {
    try {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ users, customRoles, sessionUserId } satisfies StoredAuth),
      );
    } catch {
      // Storage unavailable (private mode, quota) — auth still works in-memory.
    }
  };

  const allRoles = (): Role[] => [...systemRoles(), ...customRoles];
  const roleById = (id: string) => allRoles().find((r) => r.id === id);

  const permissionsOf = (user: User): Permission[] => {
    const set = new Set<Permission>();
    for (const roleId of user.roleIds) {
      for (const p of roleById(roleId)?.permissions ?? []) set.add(p);
    }
    return [...set];
  };

  const sessionFor = (user: User): Session => ({
    user: clone(user),
    roles: user.roleIds
      .map((id) => roleById(id))
      .filter((r): r is Role => Boolean(r))
      .map((r) => ({ id: r.id, name: r.name })),
    permissions: permissionsOf(user),
    token: null,
  });

  const currentUser = (): User | null =>
    sessionUserId ? users.find((u) => u.id === sessionUserId) ?? null : null;

  /** Mirrors the backend's authorisation check on admin endpoints. */
  const requirePermission = (permission: Permission): string | null => {
    const me = currentUser();
    if (!me || me.status !== "Active") return "Not signed in";
    if (!permissionsOf(me).includes(permission)) {
      return `You do not have permission to do that (requires ${permission})`;
    }
    return null;
  };

  /** True if at least one Active user would still hold users:manage. */
  const adminRemains = (nextUsers: User[]): boolean =>
    nextUsers.some(
      (u) =>
        u.status === "Active" &&
        u.roleIds.some((id) => roleById(id)?.permissions.includes("users:manage")),
    );

  const patchUser = (id: string, patch: Partial<User>): User => {
    const merged = { ...users.find((u) => u.id === id)!, ...patch, updatedAt: nowIso() };
    users = users.map((u) => (u.id === id ? merged : u));
    persist();
    return merged;
  };

  const auth: AuthService = {
    getSession: () => {
      const me = currentUser();
      return delay(me && me.status !== "Suspended" ? sessionFor(me) : null);
    },
    signIn: (email, password) => {
      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || password !== DEMO_PASSWORD) return fail("Invalid email or password");
      if (user.status === "Suspended") {
        return fail("This account has been suspended — contact an administrator");
      }
      const active = patchUser(user.id, { status: "Active", lastActiveAt: nowIso() });
      sessionUserId = active.id;
      persist();
      return delay(sessionFor(active));
    },
    signOut: () => {
      sessionUserId = null;
      persist();
      return delay(undefined);
    },
  };

  const userInputError = (input: UserInput, ignoreUserId?: string): string | null => {
    if (!input.name.trim()) return "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "A valid email is required";
    if (input.roleIds.length === 0) return "Assign at least one role";
    const missing = input.roleIds.find((id) => !roleById(id));
    if (missing) return `Unknown role "${missing}"`;
    const emailTaken = users.some(
      (u) => u.id !== ignoreUserId && u.email.toLowerCase() === input.email.trim().toLowerCase(),
    );
    return emailTaken ? "A user with that email already exists" : null;
  };

  const usersService: UserAdminService = {
    list: () => {
      const denied = requirePermission("users:manage");
      return denied ? fail(denied) : delay(clone(users));
    },
    invite: (input) => {
      const denied = requirePermission("users:manage");
      if (denied) return fail(denied);
      const invalid = userInputError(input);
      if (invalid) return fail(invalid);
      const max = users.reduce((acc, u) => Math.max(acc, parseInt(u.id.replace(/^\D+/, ""), 10) || 0), 0);
      const rec: User = {
        id: `usr-${String(max + 1).padStart(3, "0")}`,
        name: input.name.trim(),
        email: input.email.trim(),
        initials: initialsOf(input.name),
        roleIds: [...input.roleIds],
        status: "Invited",
        lastActiveAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      users = [...users, rec];
      persist();
      return delay(clone(rec));
    },
    update: (id, patch) => {
      const denied = requirePermission("users:manage");
      if (denied) return fail(denied);
      const existing = users.find((u) => u.id === id);
      if (!existing) return fail(`User ${id} not found`);
      const next: UserInput = {
        name: patch.name ?? existing.name,
        email: patch.email ?? existing.email,
        roleIds: patch.roleIds ?? existing.roleIds,
      };
      const invalid = userInputError(next, id);
      if (invalid) return fail(invalid);
      const merged: User = {
        ...existing,
        name: next.name.trim(),
        email: next.email.trim(),
        initials: initialsOf(next.name),
        roleIds: [...next.roleIds],
      };
      if (!adminRemains(users.map((u) => (u.id === id ? merged : u)))) {
        return fail("At least one active user must keep an admin role");
      }
      return delay(clone(patchUser(id, merged)));
    },
    suspend: (id) => {
      const denied = requirePermission("users:manage");
      if (denied) return fail(denied);
      const existing = users.find((u) => u.id === id);
      if (!existing) return fail(`User ${id} not found`);
      if (id === sessionUserId) return fail("You cannot suspend your own account");
      if (!adminRemains(users.map((u) => (u.id === id ? { ...u, status: "Suspended" as const } : u)))) {
        return fail("At least one active user must keep an admin role");
      }
      return delay(clone(patchUser(id, { status: "Suspended" })));
    },
    reactivate: (id) => {
      const denied = requirePermission("users:manage");
      if (denied) return fail(denied);
      const existing = users.find((u) => u.id === id);
      if (!existing) return fail(`User ${id} not found`);
      return delay(clone(patchUser(id, { status: existing.lastActiveAt ? "Active" : "Invited" })));
    },
    remove: (id) => {
      const denied = requirePermission("users:manage");
      if (denied) return fail(denied);
      if (!users.some((u) => u.id === id)) return fail(`User ${id} not found`);
      if (id === sessionUserId) return fail("You cannot remove your own account");
      const next = users.filter((u) => u.id !== id);
      if (!adminRemains(next)) return fail("At least one active user must keep an admin role");
      users = next;
      persist();
      return delay(undefined);
    },
  };

  const roleInputError = (input: RoleInput, ignoreRoleId?: string): string | null => {
    if (!input.name.trim()) return "Role name is required";
    if (input.permissions.length === 0) return "Select at least one permission";
    const nameTaken = allRoles().some(
      (r) => r.id !== ignoreRoleId && r.name.toLowerCase() === input.name.trim().toLowerCase(),
    );
    return nameTaken ? "A role with that name already exists" : null;
  };

  const rolesService: RoleAdminService = {
    list: () => {
      // The Users page also needs role names, so either admin grant suffices.
      const denied = requirePermission("roles:manage") && requirePermission("users:manage");
      return denied ? fail(denied) : delay(clone(allRoles()));
    },
    create: (input) => {
      const denied = requirePermission("roles:manage");
      if (denied) return fail(denied);
      const invalid = roleInputError(input);
      if (invalid) return fail(invalid);
      const max = customRoles.reduce(
        (acc, r) => Math.max(acc, parseInt(r.id.replace(/^\D+/, ""), 10) || 0),
        0,
      );
      const rec: Role = {
        id: `role-${String(max + 1).padStart(3, "0")}`,
        name: input.name.trim(),
        description: input.description.trim(),
        permissions: [...input.permissions],
        isSystem: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      customRoles = [...customRoles, rec];
      persist();
      return delay(clone(rec));
    },
    update: (id, patch) => {
      const denied = requirePermission("roles:manage");
      if (denied) return fail(denied);
      if (systemRoles().some((r) => r.id === id)) return fail("System roles cannot be edited");
      const existing = customRoles.find((r) => r.id === id);
      if (!existing) return fail(`Role ${id} not found`);
      const next: RoleInput = {
        name: patch.name ?? existing.name,
        description: patch.description ?? existing.description,
        permissions: patch.permissions ?? existing.permissions,
      };
      const invalid = roleInputError(next, id);
      if (invalid) return fail(invalid);
      const merged: Role = {
        ...existing,
        name: next.name.trim(),
        description: next.description.trim(),
        permissions: [...next.permissions],
        updatedAt: nowIso(),
      };
      customRoles = customRoles.map((r) => (r.id === id ? merged : r));
      persist();
      return delay(clone(merged));
    },
    remove: (id) => {
      const denied = requirePermission("roles:manage");
      if (denied) return fail(denied);
      if (systemRoles().some((r) => r.id === id)) return fail("System roles cannot be deleted");
      if (!customRoles.some((r) => r.id === id)) return fail(`Role ${id} not found`);
      const assigned = users.filter((u) => u.roleIds.includes(id)).length;
      if (assigned > 0) {
        return fail(`This role is assigned to ${assigned} user${assigned === 1 ? "" : "s"} — reassign them first`);
      }
      customRoles = customRoles.filter((r) => r.id !== id);
      persist();
      return delay(undefined);
    },
  };

  return { auth, users: usersService, roles: rolesService };
}
