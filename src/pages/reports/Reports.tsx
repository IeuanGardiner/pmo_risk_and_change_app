import { useMemo } from "react";
import { Download } from "lucide-react";
import { Btn, Card, EmptyState, PageHeader, SectionTitle } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAppData } from "../../store/AppData";
import { LEVEL_STYLES, CHANGE_STATUS_STYLES, T } from "../../theme/tokens";
import { CHANGE_STATUSES, RISK_LEVELS } from "../../types/lookups";
import { downloadCsv } from "../../utils/csv";
import { money } from "../../utils/format";

export function Reports() {
  const { activeRisks, changes } = useAppData();
  usePageTitle("Reports");

  /* ---- Risk exposure by category ---- */
  const riskByCategory = useMemo(() => {
    const m = new Map<
      string,
      { count: number; est: number; realised: number; released: number }
    >();
    for (const r of activeRisks) {
      const e = m.get(r.category) ?? { count: 0, est: 0, realised: 0, released: 0 };
      e.count += 1;
      e.est += r.estimatedTotal;
      e.realised += r.realisedTotal;
      e.released += r.releasedTotal;
      m.set(r.category, e);
    }
    return [...m.entries()].sort((a, b) => b[1].est - a[1].est);
  }, [activeRisks]);

  /* ---- Risk counts by level/status ---- */
  const riskByLevel = useMemo(
    () =>
      RISK_LEVELS.map((lv) => ({
        level: lv,
        open: activeRisks.filter((r) => r.level === lv && r.status !== "Closed").length,
        closed: activeRisks.filter((r) => r.level === lv && r.status === "Closed").length,
        est: activeRisks
          .filter((r) => r.level === lv && r.status !== "Closed")
          .reduce((a, r) => a + r.estimatedTotal, 0),
      })),
    [activeRisks],
  );

  /* ---- Changes by status ---- */
  const changeByStatus = useMemo(
    () =>
      CHANGE_STATUSES.map((s) => {
        const list = changes.filter((c) => c.status === s);
        return {
          status: s,
          count: list.length,
          cost: list.reduce((a, c) => a + c.costImpact, 0),
          days: list.reduce((a, c) => a + c.scheduleImpactDays, 0),
        };
      }),
    [changes],
  );

  const exportRisks = () =>
    downloadCsv(
      "report-risk-exposure.csv",
      ["Category", "Risks", "Estimated", "Realised", "Released", "Open Exposure"],
      riskByCategory.map(([cat, v]) => [
        cat, v.count, v.est, v.realised, v.released,
        Math.max(v.est - v.realised - v.released, 0),
      ]),
    );

  const exportChanges = () =>
    downloadCsv(
      "report-change-summary.csv",
      ["Status", "Changes", "Cost Impact", "Schedule Days"],
      changeByStatus.map((r) => [r.status, r.count, r.cost, r.days]),
    );

  const th = {
    padding: "10px 14px",
    fontWeight: 600,
    textAlign: "left" as const,
    color: T.textTer,
    fontSize: 11,
    textTransform: "uppercase" as const,
    background: T.bg,
  };
  const td = { padding: "10px 14px", fontSize: 13, color: T.textSec };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Reports"
        subtitle="Summary positions across the risk and change registers — export any table as CSV"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <SectionTitle sub="Active risks, by category">Risk Exposure</SectionTitle>
            <Btn variant="default" icon={Download} onClick={exportRisks}>
              CSV
            </Btn>
          </div>
          {riskByCategory.length === 0 ? (
            <EmptyState>No risks recorded yet.</EmptyState>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Category", "Risks", "Estimated", "Realised", "Released", "Open Exposure"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskByCategory.map(([cat, v]) => (
                  <tr key={cat} style={{ borderTop: `1px solid ${T.strokeSubtle}` }}>
                    <td style={{ ...td, fontWeight: 600, color: T.text }}>{cat}</td>
                    <td style={td}>{v.count}</td>
                    <td style={{ ...td, fontWeight: 600, color: T.text }}>{money(v.est)}</td>
                    <td style={{ ...td, color: T.critical }}>{money(v.realised)}</td>
                    <td style={{ ...td, color: T.low }}>{money(v.released)}</td>
                    <td style={{ ...td, fontWeight: 600, color: T.brand }}>
                      {money(Math.max(v.est - v.realised - v.released, 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card style={{ padding: 18 }}>
          <SectionTitle sub="Open vs closed, with open exposure">Risks by Level</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Level", "Open", "Closed", "Open Exposure"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riskByLevel.map((r) => (
                <tr key={r.level} style={{ borderTop: `1px solid ${T.strokeSubtle}` }}>
                  <td style={{ ...td, fontWeight: 700, color: LEVEL_STYLES[r.level].c }}>{r.level}</td>
                  <td style={td}>{r.open}</td>
                  <td style={td}>{r.closed}</td>
                  <td style={{ ...td, fontWeight: 600, color: T.text }}>{money(r.est)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <SectionTitle sub="Pipeline position with net cost and schedule impact">
            Change Summary
          </SectionTitle>
          <Btn variant="default" icon={Download} onClick={exportChanges}>
            CSV
          </Btn>
        </div>
        {changes.length === 0 ? (
          <EmptyState>No change requests recorded yet.</EmptyState>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Status", "Changes", "Cost Impact", "Schedule Impact"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changeByStatus.map((r) => (
                <tr key={r.status} style={{ borderTop: `1px solid ${T.strokeSubtle}` }}>
                  <td style={{ ...td, fontWeight: 700, color: CHANGE_STATUS_STYLES[r.status].c }}>
                    {r.status}
                  </td>
                  <td style={td}>{r.count}</td>
                  <td style={{ ...td, fontWeight: 600, color: r.cost < 0 ? T.low : T.text }}>
                    {money(r.cost)}
                  </td>
                  <td style={td}>{r.days === 0 ? "—" : `${r.days > 0 ? "+" : ""}${r.days} days`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
