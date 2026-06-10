import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  Btn, Card, ChangeStatusPill, EmptyState, Input, PageHeader, Pill, PriorityText, SectionTitle,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { CHANGE_STATUS_STYLES, T } from "../../theme/tokens";
import type { ChangeTransitionAction } from "../../types/domain";
import { profileRangeLabel } from "../../utils/calendar";
import { profileSeries } from "../../utils/chartData";
import { formatDate, formatDateTime, money, moneyFull, scheduleDays } from "../../utils/format";

/** Workflow actions offered for each status. */
const ACTIONS_BY_STATUS: Record<string, { action: ChangeTransitionAction; label: string; variant: "primary" | "dark" | "danger" | "success" }[]> = {
  Draft: [{ action: "submit", label: "Submit for Approval", variant: "primary" }],
  Submitted: [
    { action: "startReview", label: "Start Review", variant: "dark" },
    { action: "approve", label: "Approve", variant: "success" },
    { action: "reject", label: "Reject", variant: "danger" },
  ],
  "Under Review": [
    { action: "approve", label: "Approve", variant: "success" },
    { action: "reject", label: "Reject", variant: "danger" },
  ],
  Approved: [{ action: "implement", label: "Mark Implemented", variant: "primary" }],
  Rejected: [{ action: "reopen", label: "Reopen as Draft", variant: "dark" }],
  Implemented: [],
};

export function ChangeDetail() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { changes, risks, projects, transitionChange, deleteChange } = useAppData();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const change = changes.find((c) => c.changeReference === ref);
  usePageTitle(change ? `Change ${change.changeReference}` : "Change not found");

  const profileData = useMemo(
    () => (change ? profileSeries(change.costProfile) : []),
    [change],
  );

  if (!change) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader
          title="Change not found"
          action={<Btn icon={ArrowLeft} onClick={() => navigate("/changes")}>Back</Btn>}
        />
        <Card>
          <EmptyState>No change request with reference “{ref}” exists.</EmptyState>
        </Card>
      </div>
    );
  }

  const s = CHANGE_STATUS_STYLES[change.status];
  const linkedRisks = risks.filter((r) => change.linkedRiskRefs.includes(r.riskReference));
  const project = projects.find((p) => p.id === change.projectId);
  const actions = ACTIONS_BY_STATUS[change.status] ?? [];

  const run = async (action: ChangeTransitionAction) => {
    setBusy(true);
    try {
      const rec = await transitionChange(change.changeReference, action, note.trim() || undefined);
      setNote("");
      toast.success(`${rec.changeReference} moved to "${rec.status}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Workflow action failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteChange(change.changeReference);
      toast.success(`Draft ${change.changeReference} deleted`);
      navigate("/changes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const detailRows: [string, string][] = [
    ["Category", change.category],
    ["Scope", change.scope],
    ["Priority", change.priority],
    ["Status", change.status],
    ["Raised By", change.raisedBy],
    ["Owner", change.owner],
    ["Project", project ? `${project.name} (${project.code})` : "— Programme —"],
    ["Required By", formatDate(change.requiredBy)],
    ["Cost Impact", moneyFull(change.costImpact)],
    ["Cost Profile", profileRangeLabel(change.costProfile)],
    ["Schedule Impact", scheduleDays(change.scheduleImpactDays)],
  ];

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete draft ${change.changeReference}?`}
        message="This permanently removes the draft change request and unlinks it from any risks. This cannot be undone."
        confirmLabel="Delete Draft"
        busy={deleting}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />

      <PageHeader
        title={`Change Detail – ${change.changeReference}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={ArrowLeft} onClick={() => navigate("/changes")}>
              Back
            </Btn>
            <Btn
              variant="default"
              icon={Pencil}
              onClick={() => navigate(`/changes/${change.changeReference}/edit`)}
            >
              Edit
            </Btn>
            {change.status === "Draft" && (
              <Btn variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                Delete Draft
              </Btn>
            )}
          </div>
        }
      />

      {/* Banner */}
      <Card style={{ padding: 16, borderLeft: `4px solid ${s.c}`, background: s.bg, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ChangeStatusPill status={change.status} />
          <PriorityText priority={change.priority} />
          <span style={{ fontWeight: 700, color: s.c, fontSize: 15 }}>
            {change.changeReference} – {change.title}
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.textSec, marginTop: 6 }}>
          Raised by {change.raisedBy} · Owner {change.owner} · Created{" "}
          {formatDate(change.createdAt)} · Last updated {formatDateTime(change.updatedAt)}
        </div>
      </Card>

      {/* Workflow actions */}
      {actions.length > 0 && (
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Workflow:</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Input
                placeholder="Decision note (optional)…"
                aria-label="Decision note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {actions.map((a) => (
              <Btn key={a.action} variant={a.variant} onClick={() => void run(a.action)} loading={busy}>
                {a.label}
              </Btn>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Change Details</SectionTitle>
            {detailRows.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: `1px solid ${T.strokeSubtle}`,
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <span style={{ color: T.textSec, flexShrink: 0 }}>{k}</span>
                <span style={{ fontWeight: 600, color: T.text, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Full decision trail">Approval History</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {change.approvalHistory.map((h, i) => {
                const hs = CHANGE_STATUS_STYLES[h.status];
                const last = i === change.approvalHistory.length - 1;
                return (
                  <div key={i} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: hs.c,
                          border: "2px solid #fff",
                          boxShadow: `0 0 0 1.5px ${hs.c}`,
                          marginTop: 3,
                        }}
                      />
                      {!last && <div style={{ width: 2, flex: 1, background: T.strokeSubtle }} />}
                    </div>
                    <div style={{ paddingBottom: last ? 0 : 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                        {h.status}
                        <span style={{ color: T.textTer, fontWeight: 500 }}> · {h.actor}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: T.textTer }}>{formatDateTime(h.date)}</div>
                      {h.note && (
                        <div style={{ fontSize: 12.5, color: T.textSec, marginTop: 3 }}>{h.note}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Description</SectionTitle>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>{change.description}</div>
          </Card>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Justification</SectionTitle>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>{change.justification}</div>
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Risks this change responds to">Linked Risks</SectionTitle>
            {linkedRisks.length === 0 ? (
              <div style={{ fontSize: 13, color: T.textTer }}>No linked risks.</div>
            ) : (
              linkedRisks.map((r) => (
                <div
                  key={r.riskReference}
                  className="rs-row"
                  onClick={() => navigate(`/risks/${r.riskReference}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 4px",
                    borderTop: `1px solid ${T.strokeSubtle}`,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: T.textTer, fontWeight: 600 }}>{r.riskReference}</span>
                  <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{r.title}</span>
                  <span style={{ color: T.textSec, fontWeight: 600 }}>{money(r.estimatedTotal)}</span>
                  <Pill level={r.level} small />
                </div>
              ))
            )}
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub={`Cost impact spread · ${profileRangeLabel(change.costProfile)}`}>
              Cost Impact Profile
            </SectionTitle>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={profileData}>
                <CartesianGrid vertical={false} stroke={T.strokeSubtle} />
                <XAxis
                  dataKey="m"
                  tick={{ fontSize: 11, fill: T.textTer }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => money(v)} />
                <Tooltip formatter={(v: number) => moneyFull(v)} />
                <Bar dataKey="v" name="Cost impact" fill={T.brand} radius={[3, 3, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
