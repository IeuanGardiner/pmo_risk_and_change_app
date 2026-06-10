import { T } from "../theme/tokens";
import type { CostProfile, DistributionMethod } from "../types/domain";
import { PERIOD_MONTHS } from "../types/lookups";
import { gbpFull } from "../utils/format";
import { Field, Input, SubHead } from "./ui";

export const evenPeriods = (total: number): number[] =>
  Array.from({ length: 12 }, () => Math.round((total || 0) / 12));

/* ----------------------------------------------------------------------------
   12-period cost editor (wireframe 04 "Add Risk Cost"). Shared by the risk
   and change forms: Even distribution splits the total automatically; Custom
   unlocks each period input.
   -------------------------------------------------------------------------- */
export function PeriodBreakdown({
  profile,
  total,
  onChange,
}: {
  profile: CostProfile;
  total: number;
  onChange: (next: CostProfile) => void;
}) {
  const setDistribution = (distribution: DistributionMethod) => {
    onChange({
      distribution,
      periods: distribution === "Even" ? evenPeriods(total) : [...profile.periods],
    });
  };

  const setPeriod = (idx: number, value: string) => {
    const periods = profile.periods.map((p, i) => (i === idx ? +value || 0 : p));
    onChange({ ...profile, periods });
  };

  const sum = profile.periods.reduce((a, v) => a + v, 0);

  return (
    <>
      <div style={{ display: "flex", gap: 6, margin: "16px 0 8px" }}>
        {(["Even", "Custom"] as DistributionMethod[]).map((d) => (
          <div
            key={d}
            onClick={() => setDistribution(d)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              background: profile.distribution === d ? T.brand : T.bg,
              color: profile.distribution === d ? "#fff" : T.textSec,
            }}
          >
            {d} Distribution
          </div>
        ))}
      </div>
      <SubHead>12-Period Breakdown</SubHead>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {PERIOD_MONTHS.map((m, idx) => (
          <Field key={m} label={`${m} (Period ${idx + 1})`}>
            <Input
              type="number"
              placeholder="0.00"
              value={profile.periods[idx] || ""}
              disabled={profile.distribution === "Even"}
              onChange={(e) => setPeriod(idx, e.target.value)}
            />
          </Field>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 22,
          padding: 14,
          background: T.brandBg,
          borderRadius: 6,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>Summary</div>
          <div style={{ fontSize: 11.5, color: T.textSec }}>
            Total distributed across all periods
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{gbpFull(sum)}</div>
      </div>
    </>
  );
}
