import type { ChangeRequest, CostProfile, Risk, RiskEvent, RiskEventType } from "../types/domain";
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

/** Contiguous month timeline spanning every profile (and any extra anchor
    months, e.g. ledger event dates), earliest start to latest end. */
export function buildTimeline(
  profiles: CostProfile[],
  extraMonths: MonthKey[] = [],
): TimelinePoint[] {
  const ranges: { start: MonthKey; end: MonthKey }[] = [];
  for (const p of profiles) {
    if (isMonthKey(p.startMonth) && p.periods.length > 0) {
      ranges.push({ start: p.startMonth, end: addMonths(p.startMonth, p.periods.length - 1) });
    }
  }
  for (const m of extraMonths) if (isMonthKey(m)) ranges.push({ start: m, end: m });
  if (ranges.length === 0) return [];
  let min = ranges[0].start;
  let max = ranges[0].end;
  for (const r of ranges) {
    if (monthDiff(min, r.start) < 0) min = r.start;
    if (monthDiff(max, r.end) > 0) max = r.end;
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

/** The calendar month ("yyyy-mm") a ledger event falls in. */
const eventMonth = (e: RiskEvent): MonthKey => e.date.slice(0, 7);

/** Cumulative value of events of a given type that occurred on or before `key`. */
function cumulativeTo(events: RiskEvent[], type: RiskEventType, key: MonthKey): number {
  return events
    .filter((e) => e.type === type && isMonthKey(eventMonth(e)) && monthDiff(eventMonth(e), key) >= 0)
    .reduce((a, e) => a + e.amount, 0);
}

export interface DrawdownPoint {
  m: string;
  /** Remaining open exposure: estimate less everything drawn down. */
  exposure: number;
  realised: number;
  released: number;
  reduced: number;
}

/** Portfolio drawdown across the shared timeline (in millions). Realised,
    released and reduced lines step at the months the ledger events actually
    occurred — never smeared — and exposure draws down accordingly. */
export function drawdownSeries(risks: Risk[]): DrawdownPoint[] {
  const events = risks.flatMap((r) => r.events);
  const timeline = buildTimeline(
    risks.map((r) => r.costProfile),
    events.map(eventMonth),
  );
  if (timeline.length === 0) return [];
  const totalEst = risks.reduce((a, r) => a + r.estimatedTotal, 0);

  return timeline.map((t) => {
    const realised = cumulativeTo(events, "Realised", t.key);
    const released = cumulativeTo(events, "Released", t.key);
    const reduced = cumulativeTo(events, "Reduced", t.key);
    return {
      m: t.label,
      exposure: Math.max(totalEst - realised - released - reduced, 0) / 1e6,
      realised: realised / 1e6,
      released: released / 1e6,
      reduced: reduced / 1e6,
    };
  });
}

export interface RiskDrawdownPoint {
  m: string;
  /** Planned provision remaining per the cost profile (forecast reference). */
  forecast: number;
  /** Live open exposure: estimate less ledger draw-down. */
  exposure: number;
  realised: number;
  released: number;
}

/** Single risk: forecast provision vs live exposure and cumulative ledger
    draw-down, over the union of the profile and its event dates (in millions). */
export function riskDrawdown(risk: Risk): RiskDrawdownPoint[] {
  const timeline = buildTimeline([risk.costProfile], risk.events.map(eventMonth));
  if (timeline.length === 0) return [];
  let cumSpend = 0;
  return timeline.map((t) => {
    cumSpend += valueAt(risk.costProfile, t.key);
    const realised = cumulativeTo(risk.events, "Realised", t.key);
    const released = cumulativeTo(risk.events, "Released", t.key);
    const reduced = cumulativeTo(risk.events, "Reduced", t.key);
    return {
      m: t.label,
      forecast: Math.max(risk.estimatedTotal - cumSpend, 0) / 1e6,
      exposure: Math.max(risk.estimatedTotal - realised - released - reduced, 0) / 1e6,
      realised: realised / 1e6,
      released: released / 1e6,
    };
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
