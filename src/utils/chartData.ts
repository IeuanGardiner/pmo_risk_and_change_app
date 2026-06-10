import type { ChangeRequest, Risk } from "../types/domain";
import { PERIOD_MONTHS } from "../types/lookups";

/* ----------------------------------------------------------------------------
   Chart series derived from live data — these recompute automatically when
   the backend supplies real records.
   -------------------------------------------------------------------------- */

export interface MonthCount {
  m: string;
  v: number;
}

/** Counts of records per calendar month over the `window` months ending at the
    most recent createdAt in the data set. */
export function countByMonth(createdDates: string[], window = 8): MonthCount[] {
  if (createdDates.length === 0) return [];
  const latest = createdDates.reduce((a, b) => (a > b ? a : b));
  const end = new Date(latest);
  const buckets: { key: string; label: string }[] = [];
  for (let i = window - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-GB", { month: "short" }),
    });
  }
  const counts = new Map(buckets.map((b) => [b.key, 0]));
  for (const iso of createdDates) {
    const d = new Date(iso);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((b) => ({ m: b.label, v: counts.get(b.key) ?? 0 }));
}

export interface DrawdownPoint {
  m: string;
  est: number;
  rel: number;
  real: number;
}

/** Risk pot drawdown across the 12 periods (£m): estimated exposure remaining
    vs cumulative released / realised. */
export function drawdownSeries(risks: Risk[]): DrawdownPoint[] {
  const totalEst = risks.reduce((a, r) => a + r.estimatedTotal, 0);
  const estPerPeriod = PERIOD_MONTHS.map((_, p) =>
    risks.reduce((a, r) => a + (r.costProfile.periods[p] ?? 0), 0),
  );
  const relPerPeriod = risks.reduce((a, r) => a + r.releasedTotal, 0) / 12;
  const realPerPeriod = risks.reduce((a, r) => a + r.realisedTotal, 0) / 12;

  let cumEst = 0;
  return PERIOD_MONTHS.map((m, p) => {
    cumEst += estPerPeriod[p];
    return {
      m,
      est: Math.max(totalEst - cumEst, 0) / 1e6,
      rel: (relPerPeriod * (p + 1)) / 1e6,
      real: (realPerPeriod * (p + 1)) / 1e6,
    };
  });
}

export interface NameValue {
  name: string;
  value: number;
}

export function countByCategory(risks: Risk[]): NameValue[] {
  const m = new Map<string, number>();
  for (const r of risks) m.set(r.category, (m.get(r.category) ?? 0) + 1);
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function costByCategory(changes: ChangeRequest[]): NameValue[] {
  const m = new Map<string, number>();
  for (const c of changes) m.set(c.category, (m.get(c.category) ?? 0) + c.costImpact);
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
