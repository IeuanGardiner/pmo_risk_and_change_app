import type { ChangeTransitionAction } from "./domain";

/* ============================================================================
   Auth & RBAC model — shared between the mock layer and the HTTP layer.
   These shapes ARE the API contract (see README.md for the endpoint list).

   Design: users hold roles, roles hold fine-grained permissions, and feature
   code only ever checks permissions — never role names — so new roles can be
   added (in Settings or by the backend) without touching feature code.
   Least privilege: a role carries only the permissions it explicitly lists;
   a user's effective permissions are the union of their roles'.

   The client checks permissions purely for UX (hiding actions a user cannot
   perform). The backend MUST re-enforce every permission on its endpoints —
   never trust the client.
   ========================================================================== */

/* ------------------------------ Permissions ------------------------------ */

/** Grouping used by the role editor's permission matrix. */
export type PermissionGroup = "Risks" | "Changes" | "Reports" | "Administration";

export interface PermissionDef {
  id: string;
  group: PermissionGroup;
  label: string;
  description: string;
}

/** The full permission catalogue. The backend should enforce exactly these. */
export const PERMISSIONS = [
  {
    id: "risks:read",
    group: "Risks",
    label: "View risks",
    description: "View the risk register, dashboards and risk exports",
  },
  {
    id: "risks:create",
    group: "Risks",
    label: "Log risks",
    description: "Log new risks",
  },
  {
    id: "risks:update",
    group: "Risks",
    label: "Edit risks",
    description: "Edit risk details, scoring and mitigation",
  },
  {
    id: "risks:close",
    group: "Risks",
    label: "Close risks",
    description: "Close risks (lifecycle decision)",
  },
  {
    id: "risks:archive",
    group: "Risks",
    label: "Archive risks",
    description: "Archive and restore risks (soft delete)",
  },
  {
    id: "changes:read",
    group: "Changes",
    label: "View changes",
    description: "View the change register, dashboards and change exports",
  },
  {
    id: "changes:create",
    group: "Changes",
    label: "Raise changes",
    description: "Raise new change requests",
  },
  {
    id: "changes:update",
    group: "Changes",
    label: "Edit changes",
    description: "Edit change request details and impacts",
  },
  {
    id: "changes:transition",
    group: "Changes",
    label: "Progress workflow",
    description: "Routine workflow moves: submit, start review, mark implemented, reopen",
  },
  {
    id: "changes:approve",
    group: "Changes",
    label: "Approve / reject",
    description: "Make approval decisions on submitted change requests",
  },
  {
    id: "changes:delete",
    group: "Changes",
    label: "Delete drafts",
    description: "Permanently delete draft change requests",
  },
  {
    id: "reports:read",
    group: "Reports",
    label: "View reports",
    description: "View the reports area",
  },
  {
    id: "settings:manage",
    group: "Administration",
    label: "Manage settings",
    description: "Configure lookups, the scoring matrix and display currency",
  },
  {
    id: "projects:manage",
    group: "Administration",
    label: "Manage projects",
    description: "Add, rename, archive and restore projects",
  },
  {
    id: "users:manage",
    group: "Administration",
    label: "Manage users",
    description: "Invite, edit, suspend and remove users",
  },
  {
    id: "roles:manage",
    group: "Administration",
    label: "Manage roles",
    description: "Create, edit and delete roles and their permissions",
  },
] as const satisfies readonly PermissionDef[];

export type Permission = (typeof PERMISSIONS)[number]["id"];

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.id);

/** Which permission each change-workflow action requires (enforced server-side). */
export const CHANGE_TRANSITION_PERMISSIONS: Record<ChangeTransitionAction, Permission> = {
  submit: "changes:transition",
  startReview: "changes:transition",
  approve: "changes:approve",
  reject: "changes:approve",
  implement: "changes:transition",
  reopen: "changes:transition",
};

/* --------------------------------- Roles --------------------------------- */

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  /** Built-in roles ship with the app: not editable or deletable, but cloneable. */
  isSystem: boolean;
  /** ISO datetime. */
  createdAt: string;
  /** ISO datetime. */
  updatedAt: string;
}

export type RoleInput = Pick<Role, "name" | "description" | "permissions">;

/** Built-in roles. The backend should seed the same set (matching ids). */
export const SYSTEM_ROLES: Omit<Role, "createdAt" | "updatedAt">[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access, including settings, projects, users and roles",
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
  },
  {
    id: "risk-manager",
    name: "Risk Manager",
    description: "Owns the risk register: log, edit, close and archive risks",
    permissions: [
      "risks:read",
      "risks:create",
      "risks:update",
      "risks:close",
      "risks:archive",
      "changes:read",
      "reports:read",
    ],
    isSystem: true,
  },
  {
    id: "change-manager",
    name: "Change Manager",
    description: "Owns the change pipeline: raise, edit, approve/reject and delete drafts",
    permissions: [
      "changes:read",
      "changes:create",
      "changes:update",
      "changes:transition",
      "changes:approve",
      "changes:delete",
      "risks:read",
      "reports:read",
    ],
    isSystem: true,
  },
  {
    id: "risk-editor",
    name: "Risk Editor",
    description: "Log and edit risks; cannot close, archive or delete",
    permissions: ["risks:read", "risks:create", "risks:update", "changes:read", "reports:read"],
    isSystem: true,
  },
  {
    id: "change-editor",
    name: "Change Editor",
    description: "Raise, edit and progress changes; cannot approve, reject or delete",
    permissions: [
      "changes:read",
      "changes:create",
      "changes:update",
      "changes:transition",
      "risks:read",
      "reports:read",
    ],
    isSystem: true,
  },
  {
    id: "read-only",
    name: "Read Only",
    description: "View-only access to risks, changes and reports",
    permissions: ["risks:read", "changes:read", "reports:read"],
    isSystem: true,
  },
];

/* --------------------------------- Users --------------------------------- */

export type UserStatus = "Invited" | "Active" | "Suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  roleIds: string[];
  status: UserStatus;
  /** ISO datetime of the last sign-in, or null if the user has never signed in. */
  lastActiveAt: string | null;
  /** ISO datetime. */
  createdAt: string;
  /** ISO datetime. */
  updatedAt: string;
}

/** Payload for invite/update — server owns id, initials, status and timestamps. */
export interface UserInput {
  name: string;
  email: string;
  roleIds: string[];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || "·";
}

/* -------------------------------- Session -------------------------------- */

/** The authenticated principal. `permissions` is the server-computed union of
    the user's roles — the client treats it as the single source of truth. */
export interface Session {
  user: User;
  /** The user's roles (id + name only — enough for display without admin rights). */
  roles: { id: string; name: string }[];
  permissions: Permission[];
  /** Bearer token for subsequent requests (HTTP mode); null in mock mode. */
  token: string | null;
}

export function hasPermission(session: Session | null, permission: Permission): boolean {
  return session?.permissions.includes(permission) ?? false;
}
