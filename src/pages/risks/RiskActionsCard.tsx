import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Modal } from "../../components/Modal";
import { Btn, Card, Field, Input, SectionTitle, Select, TextArea } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { alpha, T } from "../../theme/tokens";
import type { Risk, RiskAction, RiskActionStatus } from "../../types/domain";
import { isOpenAction, RISK_ACTION_STATUSES } from "../../types/lookups";
import { formatDate, isOverdue } from "../../utils/format";

/* ----------------------------------------------------------------------------
   Mitigation action plan — the discrete, owned actions that deliver the risk's
   mitigation, each with a due date and status so overdue actions can be chased
   (they surface on the dashboard's "Attention Needed" panel).
   -------------------------------------------------------------------------- */

const STATUS_COLORS: Record<RiskActionStatus, string> = {
  "Not Started": T.textSec,
  "In Progress": T.brand,
  Complete: T.low,
  Cancelled: T.textTer,
};

interface ActionForm {
  title: string;
  owner: string;
  dueDate: string;
  status: RiskActionStatus;
  notes: string;
}

const emptyForm: ActionForm = {
  title: "",
  owner: "",
  dueDate: "",
  status: "Not Started",
  notes: "",
};

export function RiskActionsCard({ risk }: { risk: Risk }) {
  const { can } = useAuth();
  const { addRiskAction, updateRiskAction, deleteRiskAction } = useAppData();
  const toast = useToast();
  const canEdit = can("risks:update");

  // null = closed; { editing: null } = add; { editing: action } = edit.
  const [modal, setModal] = useState<{ editing: RiskAction | null } | null>(null);
  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RiskAction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const completeCount = risk.actions.filter((a) => a.status === "Complete").length;
  const countable = risk.actions.filter((a) => a.status !== "Cancelled").length;

  const setF = <K extends keyof ActionForm>(k: K, v: ActionForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const openAdd = () => {
    setForm(emptyForm);
    setAttempted(false);
    setModal({ editing: null });
  };

  const openEdit = (a: RiskAction) => {
    setForm({
      title: a.title,
      owner: a.owner,
      dueDate: a.dueDate ?? "",
      status: a.status,
      notes: a.notes,
    });
    setAttempted(false);
    setModal({ editing: a });
  };

  const save = async () => {
    if (!form.title.trim() || !form.owner.trim()) {
      setAttempted(true);
      return;
    }
    const input = {
      title: form.title.trim(),
      owner: form.owner.trim(),
      dueDate: form.dueDate || null,
      status: form.status,
      notes: form.notes.trim(),
    };
    setSaving(true);
    try {
      if (modal?.editing) {
        await updateRiskAction(risk.riskReference, modal.editing.id, input);
        toast.success("Action updated");
      } else {
        await addRiskAction(risk.riskReference, input);
        toast.success(`Action added to ${risk.riskReference}`);
      }
      setModal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the action failed");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (action: RiskAction, status: RiskActionStatus) => {
    if (status === action.status) return;
    setBusyId(action.id);
    try {
      await updateRiskAction(risk.riskReference, action.id, { status });
      toast.success(`Action marked "${status}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Updating the action failed");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteRiskAction(risk.riskReference, confirmDelete.id);
      toast.success("Action deleted");
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deleting the action failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card style={{ padding: 18 }}>
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this action?"
        message={`"${confirmDelete?.title ?? ""}" will be removed from the action plan. This cannot be undone.`}
        confirmLabel="Delete Action"
        busy={deleting}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(null)}
      />

      <Modal
        open={modal !== null}
        title={modal?.editing ? "Edit Action" : `Add Action – ${risk.riskReference}`}
        onClose={() => setModal(null)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label="Title"
            required
            error={attempted && !form.title.trim() ? "Enter an action title" : undefined}
          >
            <Input
              autoFocus
              placeholder="What needs to be done…"
              value={form.title}
              onChange={(e) => setF("title", e.target.value)}
            />
          </Field>
          <Field
            label="Owner"
            required
            error={attempted && !form.owner.trim() ? "Assign an owner" : undefined}
          >
            <Input
              placeholder="Who is chasing this…"
              value={form.owner}
              onChange={(e) => setF("owner", e.target.value)}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Due Date">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setF("dueDate", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(v) => setF("status", v as RiskActionStatus)}
                options={RISK_ACTION_STATUSES}
              />
            </Field>
          </div>
          <Field label="Notes">
            <TextArea
              style={{ minHeight: 64 }}
              placeholder="Progress, blockers, context…"
              value={form.notes}
              onChange={(e) => setF("notes", e.target.value)}
            />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="default" onClick={() => setModal(null)} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={() => void save()} loading={saving}>
              {modal?.editing ? "Save Action" : "Add Action"}
            </Btn>
          </div>
        </div>
      </Modal>

      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}
      >
        <SectionTitle
          sub={
            countable > 0
              ? `${completeCount} of ${countable} complete`
              : "Discrete, owned actions that deliver the mitigation plan"
          }
        >
          Mitigation Actions {risk.actions.length > 0 && `(${risk.actions.length})`}
        </SectionTitle>
        {canEdit && (
          <Btn variant="default" icon={Plus} onClick={openAdd} style={{ padding: "5px 11px", fontSize: 12 }}>
            Add Action
          </Btn>
        )}
      </div>

      {risk.actions.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textTer }}>No mitigation actions recorded.</div>
      ) : (
        risk.actions.map((a) => {
          const c = STATUS_COLORS[a.status];
          const overdue = isOpenAction(a) && isOverdue(a.dueDate);
          return (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 0",
                borderTop: `1px solid ${T.strokeSubtle}`,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  color: c,
                  background: alpha(c, 12),
                  border: `1px solid ${alpha(c, 20)}`,
                  borderRadius: 4,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {a.status}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: a.status === "Cancelled" ? T.textTer : T.text,
                    textDecoration: a.status === "Cancelled" ? "line-through" : undefined,
                  }}
                >
                  {a.title}
                </div>
                <div style={{ fontSize: 11.5, color: T.textTer }}>
                  {a.owner}
                  {a.notes && ` · ${a.notes}`}
                </div>
              </div>
              {a.status === "Complete" ? (
                <span style={{ fontSize: 12, color: T.textSec, whiteSpace: "nowrap" }}>
                  Done {formatDate(a.completedDate)}
                </span>
              ) : (
                a.dueDate && (
                  <span
                    style={{
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      color: overdue ? T.critical : T.textSec,
                      fontWeight: overdue ? 700 : 400,
                    }}
                  >
                    {overdue && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: T.critical,
                          marginRight: 5,
                        }}
                      />
                    )}
                    Due {formatDate(a.dueDate)}
                  </span>
                )
              )}
              {canEdit && (
                <>
                  <div style={{ width: 132, flexShrink: 0 }}>
                    <Select
                      value={a.status}
                      onChange={(v) => void setStatus(a, v as RiskActionStatus)}
                      options={RISK_ACTION_STATUSES}
                      disabled={busyId === a.id}
                    />
                  </div>
                  <IconBtn label={`Edit "${a.title}"`} onClick={() => openEdit(a)}>
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn label={`Delete "${a.title}"`} danger onClick={() => setConfirmDelete(a)}>
                    <Trash2 size={14} />
                  </IconBtn>
                </>
              )}
            </div>
          );
        })
      )}
    </Card>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        width: 28,
        height: 28,
        borderRadius: 5,
        border: `1px solid ${T.stroke}`,
        background: T.surface,
        color: danger ? T.critical : T.textSec,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
