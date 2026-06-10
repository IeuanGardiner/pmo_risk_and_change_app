import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Btn, Card, ChangeStatusPill, EmptyState, PageHeader, Pill, SectionTitle,
} from "../../components/ui";
import { useAppData } from "../../store/AppData";
import { LEVEL_STYLES, T } from "../../theme/tokens";
import { IMPACTS, LIKELIHOODS, PERIOD_MONTHS } from "../../types/lookups";
import { formatDate, formatDateTime, gbp, gbpFull } from "../../utils/format";

export function RiskDetail() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { risks, changes, projects, closeRisk } = useAppData();
  const [closing, setClosing] = useState(false);

  const risk = risks.find((r) => r.riskReference === ref);

  const profile = useMemo(() => {
    if (!risk) return [];
    let remaining = risk.estimatedTotal;
    return PERIOD_MONTHS.map((m, i) => {
      remaining -= risk.costProfile.periods[i] ?? 0;
      return { m, est: Math.max(remaining, 0) / 1e6 };
    });
  }, [risk]);

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

  const detailRows: [string, string][] = [
    ["Category", risk.category],
    ["Workstream", risk.workstream ?? "—"],
    ["Scope", risk.scope],
    ["Likelihood", `${risk.likelihood} – ${LIKELIHOODS[risk.likelihood]}`],
    ["Impact", `${risk.impact} – ${IMPACTS[risk.impact]}`],
    ["Risk Score", `${risk.score} / 25`],
    ["Status", risk.status],
    ["Project", project ? `${project.name} (${project.code})` : "— Programme —"],
    ["Regulatory Period", risk.regulatoryPeriod],
    ["Target Resolution", formatDate(risk.targetDate)],
  ];

  const onClose = async () => {
    setClosing(true);
    try {
      await closeRisk(risk.riskReference);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title={`Risk Detail – ${risk.riskReference}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={ArrowLeft} onClick={() => navigate("/risks")}>
              Back
            </Btn>
            <Btn
              variant="default"
              icon={Pencil}
              onClick={() => navigate(`/risks/${risk.riskReference}/edit`)}
            >
              Edit
            </Btn>
            {risk.status !== "Closed" && (
              <Btn variant="dark" icon={CheckCircle2} onClick={onClose} disabled={closing}>
                {closing ? "Closing…" : "Close Risk"}
              </Btn>
            )}
          </div>
        }
      />

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
              <span style={{ fontWeight: 600, color: T.text, textAlign: "right" }}>{v}</span>
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
                  <span style={{ color: T.textSec, fontWeight: 600 }}>{gbp(c.costImpact)}</span>
                  <ChangeStatusPill status={c.status} small />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      <Card style={{ padding: 18 }}>
        <SectionTitle sub="Estimated exposure drawdown across the period">Cost Profile</SectionTitle>
        <div style={{ display: "flex", gap: 24, marginBottom: 10 }}>
          {([
            ["Estimated", risk.estimatedTotal, T.brand],
            ["Released", risk.releasedTotal, T.low],
            ["Realised", risk.realisedTotal, T.high],
          ] as const).map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 11.5, color: T.textSec }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{gbpFull(v)}</div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={profile}>
            <CartesianGrid vertical={false} stroke={T.strokeSubtle} />
            <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} width={28} />
            <Tooltip formatter={(v: number) => `£${v.toFixed(2)}m`} />
            <Line
              type="monotone"
              dataKey="est"
              name="Estimated (£m)"
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
