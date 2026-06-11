import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  Btn, Card, ChangeStatusPill, EmptyState, PageHeader, Pill, SectionTitle,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { LEVEL_STYLES, T } from "../../theme/tokens";
import { IMPACTS, LIKELIHOODS } from "../../types/lookups";
import { profileRangeLabel } from "../../utils/calendar";
import { riskDrawdown } from "../../utils/chartData";
import {
  currencySymbol, formatDate, formatDateTime, isOverdue, money, moneyFull,
} from "../../utils/format";

export function RiskDetail() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { risks, changes, projects, closeRisk, archiveRisk, restoreRisk } = useAppData();
  const { can } = useAuth();
  const toast = useToast();
  const [closing, setClosing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const risk = risks.find((r) => r.riskReference === ref);
  usePageTitle(risk ? `Risk ${risk.riskReference}` : "Risk not found");

  const profile = useMemo(() => (risk ? riskDrawdown(risk) : []), [risk]);

  if (!risk) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader
          title="Risk not found"
          action={<Btn icon={ArrowLeft} onClick={() => navigate("/risks")}>Back</Btn>}
        />
        <Card>
          <EmptyState>No risk with reference “{ref}” exists.</EmptyState>
        </Card>
      </div>
    );
  }

  const s = LEVEL_STYLES[risk.level];
  const linkedChanges = changes.filter((c) => risk.linkedChangeRefs.includes(c.changeReference));
  const project = projects.find((p) => p.id === risk.projectId);
  const reviewOverdue = risk.status !== "Closed" && isOverdue(risk.nextReviewDate);

  const detailRows: [string, string][] = [
    ["Category", risk.category],
    ["Workstream", risk.workstream ?? "—"],
    ["Scope", risk.scope],
    ["Likelihood", `${risk.likelihood} – ${LIKELIHOODS[risk.likelihood]}`],
    ["Impact", `${risk.impact} – ${IMPACTS[risk.impact]}`],
    ["Risk Score", `${risk.score} / 25`],
    ["Status", risk.status],
    ["Project", project ? `${project.name} (${project.code})` : "— Programme —"],
    ["Cost Profile", profileRangeLabel(risk.costProfile)],
    ["Target Resolution", formatDate(risk.targetDate)],
    ["Next Review", `${formatDate(risk.nextReviewDate)}${reviewOverdue ? " — overdue" : ""}`],
  ];

  const onClose = async () => {
    setClosing(true);
    try {
      await closeRisk(risk.riskReference);
      toast.success(`${risk.riskReference} closed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Close failed");
    } finally {
      setClosing(false);
    }
  };

  const onArchive = async () => {
    setArchiving(true);
    try {
      await archiveRisk(risk.riskReference);
      toast.success(`${risk.riskReference} archived — restore it any time from the register`);
      setConfirmArchive(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setArchiving(false);
    }
  };

  const onRestore = async () => {
    setArchiving(true);
    try {
      await restoreRisk(risk.riskReference);
      toast.success(`${risk.riskReference} restored`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <ConfirmDialog
        open={confirmArchive}
        title={`Archive ${risk.riskReference}?`}
        message="Archived risks are hidden from dashboards and the default register view, but keep their full history and can be restored at any time."
        confirmLabel="Archive Risk"
        busy={archiving}
        onConfirm={() => void onArchive()}
        onCancel={() => setConfirmArchive(false)}
      />

      <PageHeader
        title={`Risk Detail – ${risk.riskReference}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={ArrowLeft} onClick={() => navigate("/risks")}>
              Back
            </Btn>
            {risk.archived ? (
              can("risks:archive") && (
                <Btn variant="dark" icon={ArchiveRestore} onClick={() => void onRestore()} loading={archiving}>
                  Restore
                </Btn>
              )
            ) : (
              <>
                {can("risks:update") && (
                  <Btn
                    variant="default"
                    icon={Pencil}
                    onClick={() => navigate(`/risks/${risk.riskReference}/edit`)}
                  >
                    Edit
                  </Btn>
                )}
                {can("risks:archive") && (
                  <Btn variant="default" icon={Archive} onClick={() => setConfirmArchive(true)}>
                    Archive
                  </Btn>
                )}
                {risk.status !== "Closed" && can("risks:close") && (
                  <Btn variant="dark" icon={CheckCircle2} onClick={() => void onClose()} loading={closing}>
                    Close Risk
                  </Btn>
                )}
              </>
            )}
          </div>
        }
      />

      {risk.archived && (
        <Card
          style={{
            padding: 14,
            marginBottom: 16,
            background: T.bg,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Archive size={16} style={{ color: T.textTer }} />
          <span style={{ fontSize: 13, color: T.textSec }}>
            This risk is <strong>archived</strong> — it is excluded from dashboards, charts and the
            default register view.
          </span>
        </Card>
      )}

      {/* Banner */}
      <Card style={{ padding: 16, borderLeft: `4px solid ${s.c}`, background: s.bg, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill level={risk.level} />
          <span style={{ fontWeight: 700, color: s.c, fontSize: 15 }}>
            {risk.riskReference} – {risk.title}
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.textSec, marginTop: 6 }}>
          Owner: {risk.owner} · Created {formatDate(risk.createdAt)} · Last updated{" "}
          {formatDateTime(risk.updatedAt)} · Score: {risk.score}/25 · Target:{" "}
          {formatDate(risk.targetDate)}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Risk Details</SectionTitle>
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
              <span
                style={{
                  fontWeight: 600,
                  color: k === "Next Review" && reviewOverdue ? T.critical : T.text,
                  textAlign: "right",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Description</SectionTitle>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>{risk.description}</div>
          </Card>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Mitigation Plan</SectionTitle>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>{risk.mitigation}</div>
          </Card>
          {risk.comments && (
            <Card style={{ padding: 18 }}>
              <SectionTitle>Comments / Notes</SectionTitle>
              <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>{risk.comments}</div>
            </Card>
          )}
          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Change requests raised against this risk">
              Linked Changes
            </SectionTitle>
            {linkedChanges.length === 0 ? (
              <div style={{ fontSize: 13, color: T.textTer }}>No linked change requests.</div>
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
                  <ChangeStatusPill status={c.status} small />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      <Card style={{ padding: 18 }}>
        <SectionTitle sub={`Estimated exposure drawdown · ${profileRangeLabel(risk.costProfile)}`}>
          Cost Profile
        </SectionTitle>
        <div style={{ display: "flex", gap: 24, marginBottom: 10 }}>
          {([
            ["Estimated", risk.estimatedTotal, T.brand],
            ["Released", risk.releasedTotal, T.low],
            ["Realised", risk.realisedTotal, T.high],
          ] as const).map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 11.5, color: T.textSec }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{moneyFull(v)}</div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={profile}>
            <CartesianGrid vertical={false} stroke={T.strokeSubtle} />
            <XAxis
              dataKey="m"
              tick={{ fontSize: 11, fill: T.textTer }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} width={28} />
            <Tooltip formatter={(v: number) => `${currencySymbol()}${v.toFixed(2)}m`} />
            <Line
              type="monotone"
              dataKey="est"
              name={`Estimated (${currencySymbol()}m)`}
              stroke={T.brand}
              strokeWidth={2.4}
              dot={{ r: 2.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
