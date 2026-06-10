import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Download, Plus } from "lucide-react";
import {
  Btn, Card, EmptyState, PageHeader, Pill, RiskStatusText, Select,
} from "../../components/ui";
import { useAppData } from "../../store/AppData";
import { LEVEL_STYLES, T } from "../../theme/tokens";
import type { RiskLevel, Scope } from "../../types/domain";
import { IMPACTS, LIKELIHOODS, RISK_STATUSES } from "../../types/lookups";
import { downloadCsv } from "../../utils/csv";
import { formatDate } from "../../utils/format";

type LevelTab = "All" | RiskLevel;
const TABS: LevelTab[] = ["All", "Critical", "High", "Medium", "Low"];

export function RiskRegister() {
  const { risks, projects } = useAppData();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>("Project");
  const [level, setLevel] = useState<LevelTab>("All");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");

  const inScope = useMemo(() => risks.filter((r) => r.scope === scope), [risks, scope]);
  const rows = useMemo(
    () =>
      inScope
        .filter((r) => level === "All" || r.level === level)
        .filter((r) => !status || r.status === status)
        .filter((r) => !projectId || r.projectId === projectId)
        .sort((a, b) => b.score - a.score || a.riskReference.localeCompare(b.riskReference)),
    [inScope, level, status, projectId],
  );
  const tabCount = (t: LevelTab) =>
    inScope.filter((r) => t === "All" || r.level === t).length;

  const projectName = (id: string | null) =>
    projects.find((p) => p.id === id)?.code ?? "—";

  const exportCsv = () =>
    downloadCsv(
      `risk-register-${scope.toLowerCase()}.csv`,
      ["Reference", "Title", "Scope", "Category", "Workstream", "Level", "Score", "Likelihood", "Impact", "Owner", "Status", "Target Date", "Project", "Estimated £", "Released £", "Realised £"],
      rows.map((r) => [
        r.riskReference, r.title, r.scope, r.category, r.workstream ?? "", r.level, r.score,
        LIKELIHOODS[r.likelihood], IMPACTS[r.impact], r.owner, r.status, r.targetDate ?? "",
        scope === "Project" ? projectName(r.projectId) : r.regulatoryPeriod,
        r.estimatedTotal, r.releasedTotal, r.realisedTotal,
      ]),
    );

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Risk Register"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={Download} onClick={exportCsv}>
              Export
            </Btn>
            <Btn variant="dark" icon={Plus} onClick={() => navigate("/risks/new")}>
              Add Risk
            </Btn>
          </div>
        }
      />

      {/* Scope toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["Project", "Program"] as Scope[]).map((s) => (
          <div
            key={s}
            onClick={() => {
              setScope(s);
              setLevel("All");
              setProjectId("");
            }}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: scope === s ? T.sidebar : T.surface,
              color: scope === s ? "#fff" : T.textSec,
              border: `1px solid ${scope === s ? T.sidebar : T.stroke}`,
            }}
          >
            {s} Risks
          </div>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: `1px solid ${T.stroke}`,
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {TABS.map((t) => (
            <div
              key={t}
              onClick={() => setLevel(t)}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                color: level === t ? "#fff" : T.textSec,
                background:
                  level === t ? (t === "All" ? T.brand : LEVEL_STYLES[t].c) : T.bg,
              }}
            >
              {t} ({tabCount(t)})
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {scope === "Project" && (
              <div style={{ width: 200 }}>
                <Select
                  value={projectId}
                  onChange={setProjectId}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="All projects"
                />
              </div>
            )}
            <div style={{ width: 160 }}>
              <Select
                value={status}
                onChange={setStatus}
                options={RISK_STATUSES}
                placeholder="All statuses"
              />
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: T.textTer,
                fontSize: 11,
                textTransform: "uppercase",
                background: T.bg,
              }}
            >
              {["#", "Risk", "Category", "Level", "Likelihood", "Impact", "Owner", "Target", "Status", scope === "Project" ? "Project" : "Period", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.riskReference}
                className="rs-row"
                onClick={() => navigate(`/risks/${r.riskReference}`)}
                style={{ borderTop: `1px solid ${T.strokeSubtle}`, cursor: "pointer" }}
              >
                <td style={{ padding: "11px 14px", color: T.textTer, fontWeight: 600 }}>
                  {r.riskReference}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600, color: T.text }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: T.textTer }}>
                    {r.workstream ?? r.category}
                  </div>
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{r.category}</td>
                <td style={{ padding: "11px 14px" }}>
                  <Pill level={r.level} small />
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>
                  {LIKELIHOODS[r.likelihood]}
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{IMPACTS[r.impact]}</td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{r.owner}</td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{formatDate(r.targetDate)}</td>
                <td style={{ padding: "11px 14px" }}>
                  <RiskStatusText status={r.status} />
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec, fontWeight: 600 }}>
                  {scope === "Project" ? projectName(r.projectId) : r.regulatoryPeriod}
                </td>
                <td style={{ padding: "11px 14px", color: T.brand }}>
                  <ArrowRight size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState>No risks match the current filters.</EmptyState>}
      </Card>
    </div>
  );
}
