import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive, ArchiveRestore, ArrowLeft, CheckCircle2, Pencil, Plus,
} from "lucide-react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  Btn, Card, ChangeStatusPill, EmptyState, PageHeader, Pill, RiskStatusText, SectionTitle,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { LEVEL_STYLES, RISK_EVENT_STYLES, T } from "../../theme/tokens";
import type { RiskEvent } from "../../types/domain";
import { IMPACTS, isClosed, LIKELIHOODS } from "../../types/lookups";
import { profileRangeLabel } from "../../utils/calendar";
import { riskDrawdown } from "../../utils/chartData";
import {
  currencySymbol, formatDate, formatDateTime, isOverdue, money, moneyFull,
} from "../../utils/format";
import { RiskUpdateDialog } from "./RiskUpdateDialog";

export function RiskDetail() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { risks, changes, projects, closeRisk, archiveRisk, restoreRisk } = useAppData();
  const { can } = useAuth();
  const toast = useToast();
  const [closing, setClosing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [update, setUpdate] = useState<{ closing: boolean } | null>(null);

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
  const closed = isClosed(risk.status);
  const linkedChanges = changes.filter((c) => risk.linkedChangeRefs.includes(c.changeReference));
  const project = projects.find((p) => p.id === risk.projectId);
  const reviewOverdue = !closed && isOverdue(risk.nextReviewDate);

  const remaining = Math.max(
    risk.estimatedTotal - risk.realisedTotal - risk.releasedTotal - risk.reducedTotal,
    0,
  );

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

  const onCloseRisk = async () => {
    // With nothing left to release, close directly; otherwise route through the
    // update workflow so the remaining exposure is released and recorded.
    if (remaining > 0) {
      setUpdate({ closing: true });
      return;
    }
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

      <RiskUpdateDialog
        open={update !== null}
        risk={risk}
        defaultType={update?.closing ? "Released" : "Realised"}
        prefillRemaining={update?.closing ?? false}
        defaultClose={update?.closing ?? false}
        onClose={() => setUpdate(null)}
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
                {!closed && (
                  <>
                    {can("risks:update") && (
                      <Btn variant="primary" icon={Plus} onClick={() => setUpdate({ closing: false })}>
                        Log Update
                      </Btn>
                    )}
                    {can("risks:close") && (
                      <Btn variant="dark" icon={CheckCircle2} onClick={() => void onCloseRisk()} loading={closing}>
                        Close Risk
                      </Btn>
                    )}
                  </>
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
          <span style={{ marginLeft: "auto" }}>
            <RiskStatusText status={risk.status} />
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

      {/* Cost position + drawdown */}
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle sub={`Live position vs forecast · ${profileRangeLabel(risk.costProfile)}`}>
          Cost Position
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {([
            ["Estimated", risk.estimatedTotal, T.text, "Forecast risk value"],
            ["Open Exposure", remaining, T.brand, "Still at risk"],
            ["Realised", risk.realisedTotal, RISK_EVENT_STYLES.Realised.c, "Cost incurred"],
            ["Released", risk.releasedTotal, RISK_EVENT_STYLES.Released.c, "Handed back"],
            ["Reduced", risk.reducedTotal, T.textSec, "Estimate revised down"],
          ] as const).map(([l, v, c, sub]) => (
            <div
              key={l}
              style={{ padding: 12, background: T.bg, borderRadius: 6, borderLeft: `3px solid ${c}` }}
            >
              <div style={{ fontSize: 11, color: T.textSec }}>{l}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: c }}>{moneyFull(v)}</div>
              <div style={{ fontSize: 10.5, color: T.textTer }}>{sub}</div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast provision"
              stroke={T.textTer}
              strokeWidth={1.6}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line type="monotone" dataKey="exposure" name="Open exposure" stroke={T.brand} strokeWidth={2.4} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="realised" name="Realised" stroke={RISK_EVENT_STYLES.Realised.c} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="released" name="Released" stroke={RISK_EVENT_STYLES.Released.c} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Risk change log */}
      <Card style={{ padding: 18 }}>
        <SectionTitle sub="Realised, released and reduced updates recorded against this risk">
          Risk Change Log {risk.events.length > 0 && `(${risk.events.length})`}
        </SectionTitle>
        <ChangeLog events={risk.events} createdAt={risk.createdAt} estimated={risk.estimatedTotal} />
      </Card>
    </div>
  );
}

/* Newest-first ledger timeline, with the risk's creation as the final entry. */
function ChangeLog({
  events,
  createdAt,
  estimated,
}: {
  events: RiskEvent[];
  createdAt: string;
  estimated: number;
}) {
  const ordered = [...events].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {ordered.map((e) => {
        const st = RISK_EVENT_STYLES[e.type];
        return (
          <div
            key={e.id}
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 0",
              borderTop: `1px solid ${T.strokeSubtle}`,
              fontSize: 13,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                alignSelf: "flex-start",
                color: st.c,
                background: st.bg,
                border: `1px solid ${st.c}33`,
                borderRadius: 4,
                padding: "2px 9px",
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              {e.type}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, color: st.c, fontSize: 14 }}>{moneyFull(e.amount)}</span>
                {e.closedRisk && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.textSec,
                      border: `1px solid ${T.stroke}`,
                      borderRadius: 3,
                      padding: "1px 5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Risk closed
                  </span>
                )}
                <span style={{ marginLeft: "auto", color: T.textTer, fontSize: 12 }}>
                  {formatDate(e.date)}
                </span>
              </div>
              {e.note && (
                <div style={{ fontSize: 12.5, color: T.textSec, marginTop: 3, lineHeight: 1.5 }}>
                  {e.note}
                </div>
              )}
              <div style={{ fontSize: 11, color: T.textTer, marginTop: 3 }}>by {e.actor}</div>
            </div>
          </div>
        );
      })}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "12px 0",
          borderTop: `1px solid ${T.strokeSubtle}`,
          fontSize: 13,
        }}
      >
        <span
          style={{
            flexShrink: 0,
            alignSelf: "flex-start",
            color: T.textSec,
            background: T.bg,
            border: `1px solid ${T.stroke}`,
            borderRadius: 4,
            padding: "2px 9px",
            fontSize: 11.5,
            fontWeight: 700,
          }}
        >
          Logged
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: T.text }}>
            Risk logged with an estimated value of {moneyFull(estimated)}
          </div>
          <div style={{ fontSize: 11, color: T.textTer, marginTop: 3 }}>{formatDate(createdAt)}</div>
        </div>
      </div>
    </div>
  );
}
