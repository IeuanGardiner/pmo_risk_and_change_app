import { LEVEL_STYLES, T } from "../../theme/tokens";
import type { MatrixGrid } from "../../types/config";
import type { Rating, RiskLevel } from "../../types/domain";
import { RISK_LEVELS } from "../../types/lookups";

const RATINGS: Rating[] = [1, 2, 3, 4, 5];
const CYCLE: RiskLevel[] = ["Low", "Medium", "High", "Critical"];

/* ----------------------------------------------------------------------------
   Editable 5×5 scoring matrix — click any cell to cycle its band
   (Low → Medium → High → Critical). Saving recalculates every stored risk.
   -------------------------------------------------------------------------- */
export function MatrixEditor({
  grid,
  onChange,
}: {
  grid: MatrixGrid;
  onChange: (next: MatrixGrid) => void;
}) {
  const cycle = (impact: Rating, likelihood: Rating) => {
    const current = grid[impact][likelihood];
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    onChange({
      ...grid,
      [impact]: { ...grid[impact], [likelihood]: next },
    });
  };

  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
        <tbody>
          {([5, 4, 3, 2, 1] as Rating[]).map((impact) => (
            <tr key={impact}>
              <td style={{ padding: 3, color: T.textTer, fontWeight: 600, width: 22 }}>
                I{impact}
              </td>
              {RATINGS.map((likelihood) => {
                const level = grid[impact][likelihood];
                const s = LEVEL_STYLES[level];
                return (
                  <td key={likelihood} style={{ padding: 3 }}>
                    <button
                      onClick={() => cycle(impact, likelihood)}
                      aria-label={`Impact ${impact}, likelihood ${likelihood}: ${level}. Click to change.`}
                      title="Click to cycle Low → Medium → High → Critical"
                      style={{
                        width: "100%",
                        background: s.bg,
                        border: `1px solid ${s.c}`,
                        color: s.c,
                        borderRadius: 4,
                        textAlign: "center",
                        padding: "6px 0",
                        fontWeight: 700,
                        fontFamily: T.font,
                        fontSize: 11.5,
                        cursor: "pointer",
                      }}
                    >
                      {level}
                    </button>
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
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10 }}>
        {RISK_LEVELS.map((lv) => (
          <div key={lv} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: LEVEL_STYLES[lv].c }} />
            {lv}
          </div>
        ))}
      </div>
    </>
  );
}
