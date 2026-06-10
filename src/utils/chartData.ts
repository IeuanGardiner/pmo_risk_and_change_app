import type { ChangeRequest, CostProfile, Risk } from "../types/domain";
import {
  addMonths,
  isMonthKey,
  monthDiff,
  monthKeyLabel,
  monthRange,
  profileMonths,
  type MonthKey,
} from "./calendar";

/* ----------------------------------------------------------------------------
   Chart series derived from live data — these recompute automatically when
   the backend supplies real records. Profiles are calendar-anchored, so
   multi-record series are built over a shared month timeline (the contiguous
   union of every profile's coverage).
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

/* ---- Calendar timeline helpers ------------------------------------------- */

export interface TimelinePoint {
  key: MonthKey;
  label: string;
}

/** Contiguous month timeline spanning every profile, earliest start to latest
    end. Months not covered by a given profile contribute 0. */
export function buildTimeline(profiles: CostProfile[]): TimelinePoint[] {
  const valid = profiles.filter((p) => isMonthKey(p.startMonth) && p.periods.length > 0);
  if (valid.length === 0) return [];
  let min = valid[0].startMonth;
  let max = valid[0].startMonth;
  for (const p of valid) {
    const end = addMonths(p.startMonth, p.periods.length - 1);
    if (monthDiff(min, p.startMonth) < 0) min = p.startMonth;
    if (monthDiff(max, end) > 0) max = end;
  }
  return monthRange(min, monthDiff(min, max) + 1).map((key) => ({
    key,
    label: monthKeyLabel(key),
  }));
}

/** A profile's value in a given calendar month (0 outside its coverage). */
export function valueAt(profile: CostProfile, key: MonthKey): number {
  const idx = monthDiff(profile.startMonth, key);
  return idx >= 0 && idx < profile.periods.length ? (profile.periods[idx] ?? 0) : 0;
}

export interface DrawdownPoint {
  m: string;
  est: number;
  rel: number;
  real: number;
}

/** Portfolio drawdown across the shared timeline (in millions): estimated
    exposure remaining vs cumulative released / realised. */
export function drawdownSeries(risks: Risk[]): DrawdownPoint[] {
  const timeline = buildTimeline(risks.map((r) => r.costProfile));
  if (timeline.length === 0) return [];
  const totalEst = risks.reduce((a, r) => a + r.estimatedTotal, 0);
  const totalRel = risks.reduce((a, r) => a + r.releasedTotal, 0);
  const totalReal = risks.reduce((a, r) => a + r.realisedTotal, 0);

  let cumEst = 0;
  return timeline.map((t, i) => {
    cumEst += risks.reduce((a, r) => a + valueAt(r.costProfile, t.key), 0);
    const progress = (i + 1) / timeline.length;
    return {
      m: t.label,
      est: Math.max(totalEst - cumEst, 0) / 1e6,
      rel: (totalRel * progress) / 1e6,
      real: (totalReal * progress) / 1e6,
    };
  });
}

/** Single risk: estimated exposure remaining per month (in millions). */
export function riskDrawdown(risk: Risk): { m: string; est: number }[] {
  let remaining = risk.estimatedTotal;
  return profileMonths(risk.costProfile).map((key, i) => {
    remaining -= risk.costProfile.periods[i] ?? 0;
    return { m: monthKeyLabel(key), est: Math.max(remaining, 0) / 1e6 };
  });
}

/** Per-month values of a single profile, labelled with real months. */
export function profileSeries(profile: CostProfile): { m: string; v: number }[] {
  return profileMonths(profile).map((key, i) => ({
    m: monthKeyLabel(key),
    v: profile.periods[i] ?? 0,
  }));
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
