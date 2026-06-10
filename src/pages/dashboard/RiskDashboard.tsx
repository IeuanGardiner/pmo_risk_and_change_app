import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { RiskMatrix } from "../../components/RiskMatrix";
import { Btn, Card, PageHeader, Pill, RiskStatusText, SectionTitle } from "../../components/ui";
import { useAppData } from "../../store/AppData";
import { CHART_COLORS, LEVEL_STYLES, T } from "../../theme/tokens";
import type { Risk } from "../../types/domain";
import { RISK_LEVELS } from "../../types/lookups";
import { countByCategory, countByMonth, drawdownSeries } from "../../utils/chartData";
import { formatDateTime, gbp } from "../../utils/format";

export function RiskDashboard() {
  const { risks } = useAppData();
  const navigate = useNavigate();

  const open = useMemo(() => risks.filter((r) => r.status !== "Closed"), [risks]);
  const lastUpdated = risks.reduce((a, r) => (r.updatedAt > a ? r.updatedAt : a), "");

  const kpis = useMemo(() => {
    const subs: Record<string, string> = {
      Critical: "Immediate action",
      High: "Review this week",
      Medium: "Monitor closely",
      Low: "Routine review",
    };
    return [
      { label: "Total Risks", n: open.length, sub: "Active risks", c: T.brand },
      ...RISK_LEVELS.map((lv) => ({
        label: lv,
        n: open.filter((r) => r.level === lv).length,
        sub: subs[lv],
        c: LEVEL_STYLES[lv].c,
      })),
    ];
  }, [open]);

  const totalEst = risks.reduce((a, r) => a + r.estimatedTotal, 0);
  const totalReleased = risks.reduce((a, r) => a + r.releasedTotal, 0);
  const totalRealised = risks.reduce((a, r) => a + r.realisedTotal, 0);

  const byCat = useMemo(
    () =>
      countByCategory(open.filter((r) => r.scope === "Project")).map((e, i) => ({
        ...e,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [open],
  );
  const newByMonth = useMemo(() => countByMonth(risks.map((r) => r.createdAt)), [risks]);
  const drawdown = useMemo(() => drawdownSeries(open), [open]);

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Risk Dashboard"
        subtitle={`Last updated ${formatDateTime(lastUpdated)}`}
        action={
          <Btn variant="dark" icon={Plus} onClick={() => navigate("/risks/new")}>
            Add Risk
          </Btn>
        }
      />

      {/* KPIs */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 18 }}
      >
        {kpis.map((k) => (
          <Card key={k.label} style={{ padding: 16, borderTop: `3px solid ${k.c}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12.5, color: T.textSec, fontWeight: 600 }}>{k.label}</div>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: k.c }} />
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: T.text, lineHeight: 1.2, marginTop: 4 }}>
              {k.n}
            </div>
            <div style={{ fontSize: 11.5, color: T.textTer }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Matrix + Top priority */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(380px,1fr) 1.3fr",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Card style={{ padding: 18 }}>
          <SectionTitle>Risk Matrix</SectionTitle>
          <RiskMatrix risks={open} onPick={(ref) => navigate(`/risks/${ref}`)} />
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle sub="Sorted by severity · Click a row for detail">
            Top Priority Risks
          </SectionTitle>
          <MiniTable
            risks={[...open].sort((a, b) => b.score - a.score).slice(0, 5)}
            onPick={(ref) => navigate(`/risks/${ref}`)}
          />
        </Card>
      </div>

      {/* Distribution + Cost */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 14 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle sub="Open project risks by category">Risk Distribution</SectionTitle>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center" }}
          >
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={byCat} dataKey="value" innerRadius={42} outerRadius={68} paddingAngle={2}>
                  {byCat.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {byCat.map((e) => (
                <div
                  key={e.name}
                  style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: e.fill }} />
                  <span style={{ color: T.textSec }}>{e.name}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 600 }}>{e.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "10px 0 2px" }}>
            New risks logged by month
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={newByMonth}>
              <CartesianGrid vertical={false} stroke={T.strokeSubtle} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="v" name="New risks" fill={T.brand} radius={[3, 3, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <SectionTitle>Cost Profile</SectionTitle>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 8 }}
          >
            {[
              { l: "Total Estimated Risk", v: totalEst, c: T.critical, s: "Across all open risks" },
              { l: "Total Released", v: totalReleased, c: T.brand, s: "Risks closed / retired" },
              { l: "Total Realised", v: totalRealised, c: T.high, s: "Costs incurred to date" },
            ].map((x) => (
              <div
                key={x.l}
                style={{ padding: 12, background: T.bg, borderRadius: 6, borderLeft: `3px solid ${x.c}` }}
              >
                <div style={{ fontSize: 11, color: T.textSec }}>{x.l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: x.c }}>{gbp(x.v)}</div>
                <div style={{ fontSize: 10.5, color: T.textTer }}>{x.s}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "4px 0" }}>
            Risk Drawdown (£m)
          </div>
          <ResponsiveContainer width="100%" height={185}>
            <LineChart data={drawdown}>
              <CartesianGrid vertical={false} stroke={T.strokeSubtle} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.textTer }} axisLine={false} tickLine={false} width={24} />
              <Tooltip formatter={(v: number) => `£${v.toFixed(2)}m`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="est" name="Estimated" stroke={T.brand} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rel" name="Released" stroke={T.low} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="real" name="Realised" stroke={T.high} strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function MiniTable({ risks, onPick }: { risks: Risk[]; onPick: (ref: string) => void }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr
          style={{
            textAlign: "left",
            color: T.textTer,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {["Risk", "Category", "Level", "Owner", "Status"].map((h) => (
            <th key={h} style={{ padding: "6px 8px", fontWeight: 600 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {risks.map((r) => (
          <tr
            key={r.riskReference}
            className="rs-row"
            onClick={() => onPick(r.riskReference)}
            style={{ borderTop: `1px solid ${T.strokeSubtle}`, cursor: "pointer" }}
          >
            <td style={{ padding: "9px 8px" }}>
              <div style={{ fontWeight: 600, color: T.text }}>{r.title}</div>
              <div style={{ fontSize: 11, color: T.textTer }}>{r.riskReference}</div>
            </td>
            <td style={{ padding: "9px 8px", color: T.textSec }}>{r.category}</td>
            <td style={{ padding: "9px 8px" }}>
              <Pill level={r.level} small />
            </td>
            <td style={{ padding: "9px 8px", color: T.textSec }}>{r.owner}</td>
            <td style={{ padding: "9px 8px" }}>
              <RiskStatusText status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
