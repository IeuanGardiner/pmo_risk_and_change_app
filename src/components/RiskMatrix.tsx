import { LEVEL_STYLES, T } from "../theme/tokens";
import type { MatrixGrid } from "../types/config";
import type { Rating, Risk } from "../types/domain";
import { IMPACTS, LIKELIHOODS, RISK_LEVELS } from "../types/lookups";

const RATINGS: Rating[] = [1, 2, 3, 4, 5];
const RATINGS_DESC: Rating[] = [5, 4, 3, 2, 1];

/** Interactive 5×5 risk matrix — each populated cell shows how many risks sit
    in that band; clicking it opens the register filtered to that cell. */
export function RiskMatrix({
  risks,
  grid,
  onPickCell,
}: {
  risks: Risk[];
  grid: MatrixGrid;
  onPickCell?: (likelihood: Rating, impact: Rating) => void;
}) {
  const countAt = (impact: Rating, likelihood: Rating) =>
    risks.filter((r) => r.impact === impact && r.likelihood === likelihood).length;

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: 10.5,
          color: T.textTer,
          fontWeight: 700,
          letterSpacing: 1,
          textAlign: "center",
          paddingTop: 8,
        }}
      >
        IMPACT →
      </div>
      <div style={{ flex: 1 }}>
        {RATINGS_DESC.map((impact) => (
          <div
            key={impact}
            style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}
          >
            <div
              style={{
                width: 70,
                fontSize: 9.5,
                color: T.textTer,
                textAlign: "right",
                paddingRight: 4,
              }}
            >
              {IMPACTS[impact]}
            </div>
            {RATINGS.map((likelihood) => {
              const level = grid[impact][likelihood];
              const s = LEVEL_STYLES[level];
              const count = countAt(impact, likelihood);
              return (
                <div
                  key={likelihood}
                  style={{
                    flex: 1,
                    aspectRatio: "1.4",
                    background: s.bg,
                    border: `1.5px solid ${s.c}`,
                    borderRadius: 5,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {count > 0 && (
                    <button
                      onClick={() => onPickCell?.(likelihood, impact)}
                      title={`${count} risk${count === 1 ? "" : "s"} — open in register`}
                      aria-label={`${count} risk${count === 1 ? "" : "s"} at likelihood ${likelihood}, impact ${impact}`}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: s.c,
                        color: "#fff",
                        fontSize: 12.5,
                        fontWeight: 700,
                        fontFamily: T.font,
                        display: "grid",
                        placeItems: "center",
                        cursor: onPickCell ? "pointer" : "default",
                        border: "1.5px solid #fff",
                      }}
                    >
                      {count}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display: "flex", gap: 4, marginLeft: 74 }}>
          {RATINGS.map((l) => (
            <div key={l} style={{ flex: 1, fontSize: 9.5, color: T.textTer, textAlign: "center" }}>
              {LIKELIHOODS[l]}
            </div>
          ))}
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 10.5,
            color: T.textTer,
            fontWeight: 700,
            letterSpacing: 1,
            marginTop: 4,
            marginLeft: 74,
          }}
        >
          LIKELIHOOD →
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10 }}>
          {RISK_LEVELS.map((lv) => (
            <div key={lv} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <span
                style={{ width: 11, height: 11, borderRadius: 3, background: LEVEL_STYLES[lv].c }}
              />
              {lv}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
