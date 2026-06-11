import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Pencil, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { authServices } from "../../api/auth";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { Btn, Card, EmptyState, Field, Input, PageHeader, Spinner } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { T } from "../../theme/tokens";
import type { Role, User, UserInput, UserStatus } from "../../types/auth";
import { formatDateTime } from "../../utils/format";

/* ----------------------------------------------------------------------------
   User administration (requires users:manage). Invite users, assign roles,
   suspend/reactivate and remove. The service layer enforces the safety rails
   (last admin protected, no self-suspend/remove, unique emails).
   -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<UserStatus, { c: string; bg: string }> = {
  Active: { c: T.low, bg: T.lowBg },
  Invited: { c: T.brand, bg: T.brandBg },
  Suspended: { c: T.critical, bg: T.criticalBg },
};

const EMPTY_FORM: UserInput = { name: "", email: "", roleIds: [] };

function UserForm({
  title,
  initial,
  roles,
  busy,
  onSubmit,
  onClose,
}: {
  title: string;
  initial: UserInput;
  roles: Role[];
  busy: boolean;
  onSubmit: (input: UserInput) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserInput>(initial);
  const [touched, setTouched] = useState(false);

  const errors = {
    name: form.name.trim() ? undefined : "Name is required",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ? undefined
      : "A valid email is required",
    roles: form.roleIds.length > 0 ? undefined : "Assign at least one role",
  };
  const valid = !errors.name && !errors.email && !errors.roles;

  const toggleRole = (id: string) =>
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter((r) => r !== id) : [...f.roleIds, id],
    }));

  return (
    <Modal open title={title} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name" required error={touched ? errors.name : undefined}>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Full name"
          />
        </Field>
        <Field label="Email" required error={touched ? errors.email : undefined}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="user@example.com"
          />
        </Field>
        <Field label="Roles" required error={touched ? errors.roles : undefined}>
          <div
            style={{
              border: `1px solid ${T.stroke}`,
              borderRadius: 4,
              padding: "4px 10px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {roles.map((r) => (
              <label
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "7px 0",
                  borderTop: `1px solid ${T.strokeSubtle}`,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.roleIds.includes(r.id)}
                  onChange={() => toggleRole(r.id)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  <span style={{ fontWeight: 600, color: T.text }}>{r.name}</span>
                  <span style={{ color: T.textTer, fontSize: 12 }}> — {r.description}</span>
                </span>
              </label>
            ))}
          </div>
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="default" onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            loading={busy}
            onClick={() => {
              setTouched(true);
              if (valid) onSubmit({ ...form, name: form.name.trim(), email: form.email.trim() });
            }}
          >
            Save
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export function UsersPage() {
  usePageTitle("Users");
  const { user: me } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [busy, setBusy] = useState(false);

  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [suspending, setSuspending] = useState<User | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [userList, roleList] = await Promise.all([
        authServices.users.list(),
        authServices.roles.list(),
      ]);
      setUsers(userList);
      setRoles(roleList);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const roleName = useMemo(() => {
    const byId = new Map(roles.map((r) => [r.id, r.name]));
    return (id: string) => byId.get(id) ?? id;
  }, [roles]);

  const upsert = (rec: User) =>
    setUsers((prev) =>
      prev.some((u) => u.id === rec.id) ? prev.map((u) => (u.id === rec.id ? rec : u)) : [...prev, rec],
    );

  const run = async (action: () => Promise<void>, onDone?: () => void) => {
    setBusy(true);
    try {
      await action();
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: "grid", placeItems: "center", height: "100%" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Users"
        subtitle="Invite users and control their access through roles"
        action={
          <Btn variant="dark" icon={UserPlus} onClick={() => setInviting(true)}>
            Invite User
          </Btn>
        }
      />

      {loadError ? (
        <Card>
          <EmptyState action={<Btn variant="primary" onClick={() => void load()}>Retry</Btn>}>
            {loadError}
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: T.textSec, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {["User", "Roles", "Status", "Last Active", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me?.id;
                const ss = STATUS_STYLES[u.status];
                return (
                  <tr key={u.id} style={{ borderTop: `1px solid ${T.strokeSubtle}` }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: T.brand,
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {u.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: T.text }}>
                            {u.name}
                            {self && <span style={{ color: T.textTer, fontWeight: 500 }}> (you)</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: T.textTer }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {u.roleIds.map((id) => (
                          <span
                            key={id}
                            style={{
                              border: `1px solid ${T.stroke}`,
                              borderRadius: 4,
                              padding: "1px 7px",
                              fontSize: 11,
                              fontWeight: 600,
                              color: T.textSec,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {roleName(id)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          color: ss.c,
                          background: ss.bg,
                          border: `1px solid ${ss.c}33`,
                          borderRadius: 4,
                          padding: "1px 7px",
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: T.textSec }}>
                      {u.lastActiveAt ? formatDateTime(u.lastActiveAt) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn variant="subtle" icon={Pencil} title="Edit user" onClick={() => setEditing(u)} />
                        {u.status === "Suspended" ? (
                          <Btn
                            variant="subtle"
                            icon={RotateCcw}
                            title="Reactivate user"
                            loading={busy}
                            onClick={() =>
                              void run(async () => {
                                upsert(await authServices.users.reactivate(u.id));
                                toast.success(`${u.name} reactivated`);
                              })
                            }
                          />
                        ) : (
                          <Btn
                            variant="subtle"
                            icon={Ban}
                            title={self ? "You cannot suspend your own account" : "Suspend user"}
                            disabled={self}
                            onClick={() => setSuspending(u)}
                          />
                        )}
                        <Btn
                          variant="subtle"
                          icon={Trash2}
                          title={self ? "You cannot remove your own account" : "Remove user"}
                          disabled={self}
                          onClick={() => setRemoving(u)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <EmptyState>No users yet.</EmptyState>}
        </Card>
      )}

      {inviting && (
        <UserForm
          title="Invite user"
          initial={EMPTY_FORM}
          roles={roles}
          busy={busy}
          onClose={() => setInviting(false)}
          onSubmit={(input) =>
            void run(async () => {
              upsert(await authServices.users.invite(input));
              toast.success(`${input.name} invited`);
            }, () => setInviting(false))
          }
        />
      )}

      {editing && (
        <UserForm
          title={`Edit ${editing.name}`}
          initial={{ name: editing.name, email: editing.email, roleIds: editing.roleIds }}
          roles={roles}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={(input) =>
            void run(async () => {
              upsert(await authServices.users.update(editing.id, input));
              toast.success(`${input.name} updated`);
            }, () => setEditing(null))
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(suspending)}
        title={`Suspend ${suspending?.name ?? ""}?`}
        message="Suspended users cannot sign in until reactivated. Their records and history are kept."
        confirmLabel="Suspend"
        busy={busy}
        onCancel={() => setSuspending(null)}
        onConfirm={() => {
          const target = suspending;
          if (!target) return;
          void run(async () => {
            upsert(await authServices.users.suspend(target.id));
            toast.success(`${target.name} suspended`);
          }, () => setSuspending(null));
        }}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name ?? ""}?`}
        message="This permanently removes the user's account and access. This cannot be undone — consider suspending instead."
        confirmLabel="Remove User"
        busy={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const target = removing;
          if (!target) return;
          void run(async () => {
            await authServices.users.remove(target.id);
            setUsers((prev) => prev.filter((u) => u.id !== target.id));
            toast.success(`${target.name} removed`);
          }, () => setRemoving(null));
        }}
      />
    </div>
  );
}
