import { T } from "../theme/tokens";
import type { CostProfile, DistributionMethod } from "../types/domain";
import {
  addMonths,
  clampDuration,
  DURATION_PRESETS,
  evenSpread,
  MAX_PROFILE_MONTHS,
  monthKeyLabel,
  resizePeriods,
} from "../utils/calendar";
import { moneyFull, parseNum } from "../utils/format";
import { Field, Input, SubHead } from "./ui";

/* ----------------------------------------------------------------------------
   Calendar-anchored cost editor, shared by the risk and change forms. The
   profile starts at a chosen month and runs 1–60 months: Even distribution
   splits the total automatically; Custom unlocks each month's input.
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
  const months = profile.periods.length;

  const rebuild = (next: Partial<CostProfile> & { months?: number }) => {
    const distribution = next.distribution ?? profile.distribution;
    const startMonth = next.startMonth ?? profile.startMonth;
    const count = clampDuration(next.months ?? months);
    onChange({
      distribution,
      startMonth,
      periods:
        distribution === "Even" ? evenSpread(total, count) : resizePeriods(profile.periods, count),
    });
  };

  const setPeriod = (idx: number, value: string) => {
    const periods = profile.periods.map((p, i) => (i === idx ? parseNum(value) : p));
    onChange({ ...profile, periods });
  };

  const sum = profile.periods.reduce((a, v) => a + v, 0);
  const delta = Math.round((sum - total) * 100) / 100;
  const mismatched = profile.distribution === "Custom" && Math.abs(delta) > 1;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 28px", margin: "16px 0" }}>
        <Field label="Profile Start Month" required>
          <Input
            type="month"
            value={profile.startMonth}
            onChange={(e) => e.target.value && rebuild({ startMonth: e.target.value })}
          />
        </Field>
        <Field label={`Duration (months, max ${MAX_PROFILE_MONTHS})`} required>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Input
              type="number"
              min={1}
              max={MAX_PROFILE_MONTHS}
              inputMode="numeric"
              aria-label="Duration in months"
              value={months}
              onChange={(e) => rebuild({ months: parseNum(e.target.value) })}
              style={{ width: 90 }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              {DURATION_PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => rebuild({ months: n })}
                  style={{
                    padding: "5px 9px",
                    borderRadius: 5,
                    fontSize: 11.5,
                    fontWeight: 600,
                    fontFamily: T.font,
                    cursor: "pointer",
                    border: "none",
                    background: months === n ? T.brand : T.bg,
                    color: months === n ? "#fff" : T.textSec,
                  }}
                >
                  {n >= 12 ? `${n / 12}y` : `${n}m`}
                </button>
              ))}
            </div>
          </div>
        </Field>
      </div>

      <div style={{ display: "flex", gap: 6, margin: "0 0 12px" }}>
        {(["Even", "Custom"] as DistributionMethod[]).map((d) => (
          <button
            key={d}
            onClick={() => rebuild({ distribution: d })}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: "pointer",
              border: "none",
              background: profile.distribution === d ? T.brand : T.bg,
              color: profile.distribution === d ? "#fff" : T.textSec,
            }}
          >
            {d} Distribution
          </button>
        ))}
      </div>

      <SubHead>
        Monthly Breakdown · {monthKeyLabel(profile.startMonth)} –{" "}
        {monthKeyLabel(addMonths(profile.startMonth, months - 1))}
      </SubHead>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
          gap: 10,
          maxHeight: 340,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {profile.periods.map((p, idx) => (
          <Field key={idx} label={monthKeyLabel(addMonths(profile.startMonth, idx))}>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={p === 0 ? "" : p}
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
          background: mismatched ? T.criticalBg : T.brandBg,
          borderRadius: 6,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: mismatched ? T.critical : T.brand }}>
            {mismatched ? "Distribution doesn't match the total" : "Summary"}
          </div>
          <div style={{ fontSize: 11.5, color: T.textSec }}>
            {mismatched
              ? `Distributed ${moneyFull(sum)} of ${moneyFull(total)} (${delta > 0 ? "+" : ""}${moneyFull(delta)})`
              : `Total distributed across ${months} ${months === 1 ? "month" : "months"}`}
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: mismatched ? T.critical : T.text }}>
          {moneyFull(sum)}
        </div>
      </div>
    </>
  );
}
