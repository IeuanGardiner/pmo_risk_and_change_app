import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Lock, Plus, Trash2 } from "lucide-react";
import { authServices } from "../../api/auth";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import {
  Btn, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Spinner, TextArea,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { T } from "../../theme/tokens";
import type { Permission, PermissionGroup, Role, RoleInput, User } from "../../types/auth";
import { PERMISSIONS } from "../../types/auth";

/* ----------------------------------------------------------------------------
   Role administration (requires roles:manage). System roles are locked but
   can be duplicated as a starting point; custom roles are fully editable and
   deletable once no user holds them. New roles start with no permissions —
   least privilege by default.
   -------------------------------------------------------------------------- */

const GROUPS: PermissionGroup[] = ["Risks", "Changes", "Reports", "Administration"];

/** Either an existing role being viewed/edited, or a new unsaved draft. */
type Draft = { roleId: string | null; input: RoleInput };

const NEW_ROLE: RoleInput = { name: "", description: "", permissions: [] };

export function RolesPage() {
  usePageTitle("Roles & Permissions");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [touched, setTouched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [roleList, userList] = await Promise.all([
        authServices.roles.list(),
        authServices.users.list(),
      ]);
      setRoles(roleList);
      setUsers(userList);
      setDraft((d) => d ?? selectRole(roleList[0]));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assignedCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of users) for (const id of u.roleIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return (roleId: string) => counts.get(roleId) ?? 0;
  }, [users]);

  function selectRole(role: Role | undefined): Draft | null {
    if (!role) return null;
    return {
      roleId: role.id,
      input: { name: role.name, description: role.description, permissions: [...role.permissions] },
    };
  }

  const selected = draft?.roleId ? roles.find((r) => r.id === draft.roleId) ?? null : null;
  const isNew = draft !== null && draft.roleId === null;
  const editable = isNew || (selected !== null && !selected.isSystem);

  const nameError = draft && !draft.input.name.trim() ? "Role name is required" : undefined;
  const permError =
    draft && draft.input.permissions.length === 0 ? "Select at least one permission" : undefined;

  const togglePermission = (p: Permission) => {
    if (!editable || !draft) return;
    setDraft({
      ...draft,
      input: {
        ...draft.input,
        permissions: draft.input.permissions.includes(p)
          ? draft.input.permissions.filter((x) => x !== p)
          : [...draft.input.permissions, p],
      },
    });
  };

  const save = async () => {
    setTouched(true);
    if (!draft || nameError || permError) return;
    setBusy(true);
    try {
      if (isNew) {
        const rec = await authServices.roles.create(draft.input);
        setRoles((prev) => [...prev, rec]);
        setDraft(selectRole(rec));
        toast.success(`Role "${rec.name}" created`);
      } else if (selected) {
        const rec = await authServices.roles.update(selected.id, draft.input);
        setRoles((prev) => prev.map((r) => (r.id === rec.id ? rec : r)));
        setDraft(selectRole(rec));
        toast.success(`Role "${rec.name}" updated`);
      }
      setTouched(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    const target = deleting;
    if (!target) return;
    setBusy(true);
    try {
      await authServices.roles.remove(target.id);
      const remaining = roles.filter((r) => r.id !== target.id);
      setRoles(remaining);
      setDraft(selectRole(remaining[0]));
      toast.success(`Role "${target.name}" deleted`);
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = (role: Role) => {
    setTouched(false);
    setDraft({
      roleId: null,
      input: {
        name: `Copy of ${role.name}`,
        description: role.description,
        permissions: [...role.permissions],
      },
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: "grid", placeItems: "center", height: "100%" }}>
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader title="Roles & Permissions" />
        <Card>
          <EmptyState action={<Btn variant="primary" onClick={() => void load()}>Retry</Btn>}>
            {loadError}
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Roles bundle fine-grained permissions; users can hold several roles"
        action={
          <Btn
            variant="dark"
            icon={Plus}
            onClick={() => {
              setTouched(false);
              setDraft({ roleId: null, input: { ...NEW_ROLE, permissions: [] } });
            }}
          >
            New Role
          </Btn>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        {/* Role list */}
        <Card>
          {roles.map((r) => {
            const active = draft?.roleId === r.id;
            const count = assignedCount(r.id);
            return (
              <button
                key={r.id}
                onClick={() => {
                  setTouched(false);
                  setDraft(selectRole(r));
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "11px 14px",
                  background: active ? T.brandBg : "none",
                  border: "none",
                  borderLeft: `3px solid ${active ? T.brand : "transparent"}`,
                  borderBottom: `1px solid ${T.strokeSubtle}`,
                  cursor: "pointer",
                  fontFamily: T.font,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{r.name}</span>
                  {r.isSystem && <Lock size={11} style={{ color: T.textTer }} />}
                </div>
                <div style={{ fontSize: 11.5, color: T.textTer, marginTop: 2 }}>
                  {r.permissions.length} permission{r.permissions.length === 1 ? "" : "s"} ·{" "}
                  {count} user{count === 1 ? "" : "s"}
                </div>
              </button>
            );
          })}
          {isNew && (
            <div
              style={{
                padding: "11px 14px",
                background: T.brandBg,
                borderLeft: `3px solid ${T.brand}`,
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
              }}
            >
              {draft.input.name.trim() || "New role (unsaved)"}
            </div>
          )}
        </Card>

        {/* Editor */}
        {draft ? (
          <Card style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <SectionTitle
                sub={
                  isNew
                    ? "New roles start with no permissions — grant only what is needed"
                    : selected?.isSystem
                      ? "System role — locked. Duplicate it to create an editable copy."
                      : "Custom role"
                }
              >
                {isNew ? "New role" : selected?.name}
              </SectionTitle>
              <div style={{ display: "flex", gap: 8 }}>
                {selected && (
                  <Btn variant="default" icon={Copy} onClick={() => duplicate(selected)}>
                    Duplicate
                  </Btn>
                )}
                {selected && !selected.isSystem && (
                  <Btn
                    variant="danger"
                    icon={Trash2}
                    disabled={assignedCount(selected.id) > 0}
                    title={
                      assignedCount(selected.id) > 0
                        ? "Reassign this role's users before deleting it"
                        : "Delete role"
                    }
                    onClick={() => setDeleting(selected)}
                  >
                    Delete
                  </Btn>
                )}
                {editable && (
                  <Btn variant="primary" loading={busy} onClick={() => void save()}>
                    {isNew ? "Create Role" : "Save Changes"}
                  </Btn>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 28px", marginTop: 6 }}>
              <Field label="Name" required error={touched ? nameError : undefined}>
                <Input
                  value={draft.input.name}
                  disabled={!editable}
                  onChange={(e) => setDraft({ ...draft, input: { ...draft.input, name: e.target.value } })}
                  placeholder="e.g. Portfolio Analyst"
                />
              </Field>
              <Field label="Description">
                <TextArea
                  value={draft.input.description}
                  disabled={!editable}
                  style={{ minHeight: 38 }}
                  onChange={(e) =>
                    setDraft({ ...draft, input: { ...draft.input, description: e.target.value } })
                  }
                  placeholder="What this role is for"
                />
              </Field>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                Permissions
              </div>
              {touched && permError && (
                <div role="alert" style={{ fontSize: 11.5, color: T.critical, fontWeight: 600 }}>
                  {permError}
                </div>
              )}
              {GROUPS.map((group) => (
                <div key={group} style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.textTer,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {group}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 28px" }}>
                    {PERMISSIONS.filter((p) => p.group === group).map((p) => (
                      <label
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "6px 0",
                          fontSize: 13,
                          cursor: editable ? "pointer" : "default",
                          opacity: editable ? 1 : 0.75,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={draft.input.permissions.includes(p.id)}
                          disabled={!editable}
                          onChange={() => togglePermission(p.id)}
                          style={{ marginTop: 2 }}
                        />
                        <span>
                          <span style={{ fontWeight: 600, color: T.text }}>{p.label}</span>
                          <span style={{ display: "block", fontSize: 11.5, color: T.textTer }}>
                            {p.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState>Select a role to view its permissions.</EmptyState>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete role "${deleting?.name ?? ""}"?`}
        message="This permanently deletes the role. Roles assigned to users cannot be deleted."
        confirmLabel="Delete Role"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
