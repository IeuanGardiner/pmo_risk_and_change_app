import { Card, PageHeader, SectionTitle } from "../../components/ui";
import { isMockMode } from "../../api";
import { useAppData } from "../../store/AppData";
import { LEVEL_STYLES, T } from "../../theme/tokens";
import {
  CHANGE_CATEGORIES, GRID, PROGRAM_RISK_CATEGORIES, PROJECT_RISK_CATEGORIES, WORKSTREAMS,
} from "../../types/lookups";
import type { Rating } from "../../types/domain";

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

export function SettingsPage() {
  const { projects, periods, user } = useAppData();
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  const chip = (label: string) => (
    <span
      key={label}
      style={{
        padding: "4px 10px",
        borderRadius: 14,
        background: T.bg,
        border: `1px solid ${T.stroke}`,
        fontSize: 12,
        color: T.textSec,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Settings"
        subtitle="Environment, scoring model and reference data"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Data Source</SectionTitle>
            <div
              style={{
                padding: 14,
                borderRadius: 6,
                background: isMockMode ? T.mediumBg : T.lowBg,
                border: `1px solid ${isMockMode ? T.medium : T.low}33`,
                fontSize: 13,
                color: T.textSec,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, color: isMockMode ? T.medium : T.low, marginBottom: 4 }}>
                {isMockMode ? "Mock data (in-memory)" : "Live API"}
              </div>
              {isMockMode ? (
                <>
                  The app is running on the built-in mock service layer. Set{" "}
                  <code style={{ background: T.bg, padding: "1px 5px", borderRadius: 3 }}>
                    VITE_API_BASE_URL
                  </code>{" "}
                  in a <code style={{ background: T.bg, padding: "1px 5px", borderRadius: 3 }}>.env</code>{" "}
                  file to switch every service to live HTTP calls — the REST contract is in the
                  README.
                </>
              ) : (
                <>
                  Connected to <strong>{apiBase}</strong>.
                </>
              )}
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle>Signed In</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: T.brand,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {user?.initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: T.textTer }}>{user?.role}</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Reference data served by the backend">Projects &amp; Periods</SectionTitle>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: `1px solid ${T.strokeSubtle}`,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600, color: T.text }}>{p.name}</span>
                <span style={{ color: T.textTer }}>{p.code}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {periods.map((p) => chip(p.label))}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle sub="GRID[impact][likelihood] — drives the calculated level">
              Scoring Model (5×5)
            </SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <tbody>
                {[5, 4, 3, 2, 1].map((impact) => (
                  <tr key={impact}>
                    <td style={{ padding: 3, color: T.textTer, fontWeight: 600, width: 22 }}>
                      I{impact}
                    </td>
                    {RATINGS.map((likelihood) => {
                      const level = GRID[impact as Rating][likelihood];
                      const s = LEVEL_STYLES[level];
                      return (
                        <td key={likelihood} style={{ padding: 3 }}>
                          <div
                            style={{
                              background: s.bg,
                              border: `1px solid ${s.c}`,
                              color: s.c,
                              borderRadius: 4,
                              textAlign: "center",
                              padding: "6px 0",
                              fontWeight: 700,
                            }}
                          >
                            {level}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td />
                  {RATINGS.map((l) => (
                    <td key={l} style={{ padding: 3, textAlign: "center", color: T.textTer, fontWeight: 600 }}>
                      L{l}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Configured lookups — will be served by the backend">
              Categories &amp; Workstreams
            </SectionTitle>
            <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "6px 0" }}>
              Project risk categories
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PROJECT_RISK_CATEGORIES.map(chip)}
            </div>
            <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "12px 0 6px" }}>
              Programme risk categories
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PROGRAM_RISK_CATEGORIES.map(chip)}
            </div>
            <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "12px 0 6px" }}>
              Workstreams
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{WORKSTREAMS.map(chip)}</div>
            <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, margin: "12px 0 6px" }}>
              Change categories
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CHANGE_CATEGORIES.map(chip)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
