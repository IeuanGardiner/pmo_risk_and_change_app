import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Archive, RotateCcw, Pencil } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  Btn, Card, EmptyState, PageHeader, Pill, PriorityText, SectionTitle, Select,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { ISSUE_STATUS_STYLES, PRIORITY_COLORS, T, alpha } from "../../theme/tokens";
import type { IssueStatus } from "../../types/domain";
import { ISSUE_STATUSES } from "../../types/lookups";
import { formatDate, formatDateTime, money, moneyFull } from "../../utils/format";

const IssueStatusPill = ({ status }: { status: IssueStatus }) => {
  const s = ISSUE_STATUS_STYLES[status];
  return (
    <span
      style={{
        color: s.c,
        background: s.bg,
        border: `1px solid ${alpha(s.c, 20)}`,
        borderRadius: 4,
        padding: "3px 9px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
};

export function IssueDetail() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { issues, risks, changes, projects, updateIssue, archiveIssue, restoreIssue } = useAppData();
  const { can } = useAuth();
  const toast = useToast();

  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const issue = issues.find((i) => i.issueReference === ref);
  usePageTitle(issue ? `Issue ${issue.issueReference}` : "Issue not found");

  if (!issue) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader
          title="Issue not found"
          action={<Btn icon={ArrowLeft} onClick={() => navigate("/issues")}>Back</Btn>}
        />
        <Card>
          <EmptyState>No issue with reference "{ref}" exists.</EmptyState>
        </Card>
      </div>
    );
  }

  const priorityColor = PRIORITY_COLORS[issue.priority];
  const linkedRisks = risks.filter((r) => issue.linkedRiskRefs.includes(r.riskReference));
  const linkedChanges = changes.filter((c) => issue.linkedChangeRefs.includes(c.changeReference));
  const project = projects.find((p) => p.id === issue.projectId);

  const onStatusChange = async (newStatus: string) => {
    setStatusBusy(true);
    try {
      await updateIssue(issue.issueReference, { status: newStatus as IssueStatus });
      toast.success(`Status updated to "${newStatus}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setStatusBusy(false);
    }
  };

  const onArchive = async () => {
    setArchiving(true);
    try {
      await archiveIssue(issue.issueReference);
      toast.success(`${issue.issueReference} archived`);
      setConfirmArchive(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setArchiving(false);
    }
  };

  const onRestore = async () => {
    setRestoring(true);
    try {
      await restoreIssue(issue.issueReference);
      toast.success(`${issue.issueReference} restored`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  const detailRows: [string, ReactNode][] = [
    ["Category", issue.category],
    ["Scope", issue.scope],
    ["Priority", <PriorityText priority={issue.priority} />],
    [
      "Status",
      <div style={{ minWidth: 160 }}>
        <Select
          value={issue.status}
          onChange={(v) => void onStatusChange(v)}
          options={ISSUE_STATUSES}
          disabled={statusBusy || issue.archived}
        />
      </div>,
    ],
    ["Owner", issue.owner],
    ["Raised By", issue.raisedBy],
    [
      "Project",
      project
        ? `${project.name} (${project.code})${project.client ? ` · ${project.client}` : ""}`
        : issue.scope === "Program" ? "— Programme —" : "—",
    ],
    ["Estimated Cost", moneyFull(issue.estimatedCost)],
    ["Target Resolution", formatDate(issue.targetResolutionDate)],
    ["Created", formatDate(issue.createdAt)],
    ["Last Updated", formatDateTime(issue.updatedAt)],
  ];

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <ConfirmDialog
        open={confirmArchive}
        title={`Archive ${issue.issueReference}?`}
        message="The issue will be hidden from the default register view. It can be restored at any time."
        confirmLabel="Archive Issue"
        busy={archiving}
        onConfirm={() => void onArchive()}
        onCancel={() => setConfirmArchive(false)}
      />

      <PageHeader
        title={`Issue ${issue.issueReference}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={ArrowLeft} onClick={() => navigate("/issues")}>
              Back
            </Btn>
            {can("risks:update") && !issue.archived && (
              <Btn
                variant="default"
                icon={Pencil}
                onClick={() => navigate(`/issues/${issue.issueReference}/edit`)}
              >
                Edit
              </Btn>
            )}
            {can("risks:archive") && (
              issue.archived ? (
                <Btn
                  variant="default"
                  icon={RotateCcw}
                  loading={restoring}
                  onClick={() => void onRestore()}
                >
                  Restore
                </Btn>
              ) : (
                <Btn
                  variant="danger"
                  icon={Archive}
                  onClick={() => setConfirmArchive(true)}
                >
                  Archive
                </Btn>
              )
            )}
          </div>
        }
      />

      {/* Archived banner */}
      {issue.archived && (
        <Card
          style={{
            padding: 14,
            marginBottom: 16,
            background: T.bg,
            border: `1px solid ${T.stroke}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12.5, color: T.textSec, fontWeight: 600 }}>
            This issue is archived and hidden from the default register view.
          </span>
        </Card>
      )}

      {/* Priority banner */}
      <Card
        style={{
          padding: 16,
          borderLeft: `4px solid ${priorityColor}`,
          background: alpha(priorityColor, 8),
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <IssueStatusPill status={issue.status} />
          <PriorityText priority={issue.priority} />
          <span style={{ fontWeight: 700, color: priorityColor, fontSize: 15 }}>
            {issue.issueReference} – {issue.title}
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.textSec, marginTop: 6 }}>
          Raised by {issue.raisedBy} · Owner {issue.owner} · Created{" "}
          {formatDate(issue.createdAt)} · Last updated {formatDateTime(issue.updatedAt)}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Issue Details</SectionTitle>
            {detailRows.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Description</SectionTitle>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
              {issue.description}
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Risks this issue relates to">Linked Risks</SectionTitle>
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
            <SectionTitle sub="Changes raised against this issue">Linked Changes</SectionTitle>
            {linkedChanges.length === 0 ? (
              <div style={{ fontSize: 13, color: T.textTer }}>No linked changes.</div>
            ) : (
              linkedChanges.map((c) => (
                <div
                  key={c.changeReference}
                  className="rs-row"
                  onClick={() => navigate(`/changes/${c.changeReference}`)}
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
                  <span style={{ color: T.textTer, fontWeight: 600 }}>{c.changeReference}</span>
                  <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{c.title}</span>
                  <span style={{ color: T.textSec, fontWeight: 600 }}>{money(c.costImpact)}</span>
                  <PriorityText priority={c.priority} />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
