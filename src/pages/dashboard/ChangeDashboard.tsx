import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Btn, Card, ChangeStatusPill, EmptyState, PageHeader, PriorityText, SectionTitle,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAppData } from "../../store/AppData";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "../../theme/tokens";
import type { ChangeRequest, ChangeStatus } from "../../types/domain";
import { CHANGE_STATUSES } from "../../types/lookups";
import { costByCategory, countByMonth } from "../../utils/chartData";
import { currencySymbol, formatDateTime, money, scheduleDays } from "../../utils/format";

export function ChangeDashboard() {
  const { changes } = useAppData();
  const colors = useTheme().chartColors;
  const navigate = useNavigate();
  usePageTitle("Change Dashboard");

  // Resolved fills for the pipeline bars, mirroring CHANGE_STATUS_STYLES (which
  // can't be used directly — its var() colours don't resolve in SVG fills).
  const statusFill: Record<ChangeStatus, string> = {
    Draft: colors.textSec,
    Submitted: colors.brand,
    "Under Review": colors.purple,
    Approved: colors.low,
    Rejected: colors.critical,
    Implemented: colors.teal,
  };

  const lastUpdated = changes.reduce((a, c) => (c.updatedAt > a ? c.updatedAt : a), "");

  const { kpis, pipeline } = useMemo(() => {
    const byStatus = (s: string) => changes.filter((c) => c.status === s).length;
    return {
      kpis: [
        { label: "Total Changes", n: changes.length, sub: "All change requests", c: T.brand },
        {
          label: "Pending Approval",
          n: byStatus("Submitted") + byStatus("Under Review"),
          sub: "Submitted / in review",
          c: T.purple,
        },
        { label: "Approved", n: byStatus("Approved"), sub: "Awaiting implementation", c: T.low },
        { label: "Implemented", n: byStatus("Implemented"), sub: "Delivered changes", c: T.teal },
        { label: "Rejected", n: byStatus("Rejected"), sub: "Not progressed", c: T.critical },
      ],
      pipeline: CHANGE_STATUSES.map((s) => ({ name: s, value: byStatus(s) })),
    };
  }, [changes]);

  const approvedCost = changes
    .filter((c) => c.status === "Approved" || c.status === "Implemented")
    .reduce((a, c) => a + c.costImpact, 0);
  const pendingCost = changes
    .filter((c) => c.status === "Submitted" || c.status === "Under Review")
    .reduce((a, c) => a + c.costImpact, 0);
  const netSchedule = changes
    .filter((c) => c.status !== "Rejected" && c.status !== "Draft")
    .reduce((a, c) => a + c.scheduleImpactDays, 0);

  const byCat = useMemo(() => costByCategory(changes.filter((c) => c.status !== "Rejected")), [changes]);
  const raisedByMonth = useMemo(() => countByMonth(changes.map((c) => c.createdAt)), [changes]);
  const recent = useMemo(
    () => [...changes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [changes],
  );

  if (changes.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader title="Change Dashboard" />
        <Card>
          <EmptyState
            action={
              <Btn variant="dark" icon={Plus} onClick={() => navigate("/changes/new")}>
                Raise Change
              </Btn>
            }
          >
            No change requests raised yet — raise the first change to populate the dashboard.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Change Dashboard"
        subtitle={`Last updated ${formatDateTime(lastUpdated)}`}
        action={
          <Btn variant="dark" icon={Plus} onClick={() => navigate("/changes/new")}>
            Raise Change
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

      {/* Pipeline + cost impact */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 14, marginBottom: 18 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle sub="Where every change sits in the workflow">Change Pipeline</SectionTitle>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={pipeline} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid horizontal={false} stroke={colors.strokeSubtle} />
              <XAxis type="number" tick={{ fontSize: 11, fill: colors.textTer }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: colors.textSec }} axisLine={false} tickLine={false} width={86} />
              <Tooltip />
              <Bar dataKey="value" name="Changes" radius={[0, 3, 3, 0]} barSize={16}>
                {pipeline.map((e, i) => (
                  <Cell key={i} fill={statusFill[e.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "8px 0 2px" }}>
            Changes raised by month
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={raisedByMonth}>
              <CartesianGrid vertical={false} stroke={colors.strokeSubtle} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: colors.textTer }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.textTer }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="v" name="Raised" fill={colors.purple} radius={[3, 3, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 18 }}>
          <SectionTitle>Cost &amp; Schedule Impact</SectionTitle>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 8 }}
          >
            {[
              { l: "Approved Cost Impact", v: money(approvedCost), c: T.low, s: "Approved + implemented" },
              { l: "Pending Cost Impact", v: money(pendingCost), c: T.purple, s: "Awaiting decision" },
              { l: "Net Schedule Impact", v: scheduleDays(netSchedule), c: T.high, s: "Active changes, days" },
            ].map((x) => (
              <div
                key={x.l}
                style={{ padding: 12, background: T.bg, borderRadius: 6, borderLeft: `3px solid ${x.c}` }}
              >
                <div style={{ fontSize: 11, color: T.textSec }}>{x.l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: x.c }}>{x.v}</div>
                <div style={{ fontSize: 10.5, color: T.textTer }}>{x.s}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "4px 0" }}>
            Cost impact by category ({currencySymbol()})
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={byCat}>
              <CartesianGrid vertical={false} stroke={colors.strokeSubtle} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.textTer }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.textTer }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => money(v)} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="value" name="Cost impact" radius={[3, 3, 0, 0]} barSize={26}>
                {byCat.map((e, i) => (
                  <Cell key={i} fill={e.value < 0 ? colors.low : colors.brand} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent changes */}
      <Card style={{ padding: 18 }}>
        <SectionTitle sub="Most recently updated · Click a row for detail">
          Recent Change Activity
        </SectionTitle>
        <RecentTable changes={recent} onPick={(ref) => navigate(`/changes/${ref}`)} />
      </Card>
    </div>
  );
}

function RecentTable({
  changes,
  onPick,
}: {
  changes: ChangeRequest[];
  onPick: (ref: string) => void;
}) {
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
          {["Change", "Category", "Priority", "Cost Impact", "Schedule", "Status", "Updated"].map((h) => (
            <th key={h} style={{ padding: "6px 8px", fontWeight: 600 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => (
          <tr
            key={c.changeReference}
            className="rs-row"
            onClick={() => onPick(c.changeReference)}
            style={{ borderTop: `1px solid ${T.strokeSubtle}`, cursor: "pointer" }}
          >
            <td style={{ padding: "9px 8px" }}>
              <div style={{ fontWeight: 600, color: T.text }}>{c.title}</div>
              <div style={{ fontSize: 11, color: T.textTer }}>{c.changeReference}</div>
            </td>
            <td style={{ padding: "9px 8px", color: T.textSec }}>{c.category}</td>
            <td style={{ padding: "9px 8px" }}>
              <PriorityText priority={c.priority} />
            </td>
            <td style={{ padding: "9px 8px", color: c.costImpact < 0 ? T.low : T.text, fontWeight: 600 }}>
              {money(c.costImpact)}
            </td>
            <td style={{ padding: "9px 8px", color: T.textSec }}>{scheduleDays(c.scheduleImpactDays)}</td>
            <td style={{ padding: "9px 8px" }}>
              <ChangeStatusPill status={c.status} small />
            </td>
            <td style={{ padding: "9px 8px", color: T.textSec }}>{formatDateTime(c.updatedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
