import type { CostProfile } from "../types/domain";

/* ----------------------------------------------------------------------------
   Calendar month arithmetic for cost profiles. Profiles are anchored to a
   start month ("yyyy-mm") and run for 1–60 consecutive months. All maths is
   done on (year, month) integers — never Date objects — to avoid timezone
   drift.
   -------------------------------------------------------------------------- */

/** A calendar month in "yyyy-mm" form, e.g. "2026-07". */
export type MonthKey = string;

export const MAX_PROFILE_MONTHS = 60;
export const DURATION_PRESETS = [6, 12, 24, 36, 60];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const isMonthKey = (s: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

const toIndex = (key: MonthKey): number => {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
};

const fromIndex = (idx: number): MonthKey => {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
};

export const currentMonthKey = (): MonthKey => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const addMonths = (key: MonthKey, delta: number): MonthKey =>
  fromIndex(toIndex(key) + delta);

/** Whole months from `from` to `to` (positive when `to` is later). */
export const monthDiff = (from: MonthKey, to: MonthKey): number => toIndex(to) - toIndex(from);

/** "2026-07" -> "Jul 26". */
export const monthKeyLabel = (key: MonthKey): string => {
  if (!isMonthKey(key)) return key;
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${String(y % 100).padStart(2, "0")}`;
};

export const monthRange = (start: MonthKey, count: number): MonthKey[] =>
  Array.from({ length: Math.max(count, 0) }, (_, i) => addMonths(start, i));

/** Clamp a duration to 1–60 whole months; non-numeric input falls back to 12. */
export const clampDuration = (n: number): number => {
  if (!Number.isFinite(n)) return 12;
  return Math.min(Math.max(Math.round(n), 1), MAX_PROFILE_MONTHS);
};

/** Split `total` evenly over `months`, putting the rounding remainder in the
    last entry so the sum always equals the total exactly (to the penny). */
export const evenSpread = (total: number, months: number): number[] => {
  if (months < 1) return [];
  const base = Math.round((total / months) * 100) / 100;
  const periods = Array.from({ length: months }, () => base);
  periods[months - 1] = Math.round((total - base * (months - 1)) * 100) / 100;
  return periods;
};

/** Truncate or zero-pad an existing custom spread to a new duration. */
export const resizePeriods = (periods: number[], months: number): number[] =>
  Array.from({ length: months }, (_, i) => periods[i] ?? 0);

export const evenProfile = (total: number, startMonth: MonthKey, months: number): CostProfile => ({
  distribution: "Even",
  startMonth,
  periods: evenSpread(total, months),
});

/** The calendar months a profile covers, in order. */
export const profileMonths = (p: CostProfile): MonthKey[] =>
  monthRange(p.startMonth, p.periods.length);

/** "Jul 26 – Jun 27 · 12 months" for detail views. */
export const profileRangeLabel = (p: CostProfile): string => {
  const n = p.periods.length;
  if (n === 0 || !isMonthKey(p.startMonth)) return "—";
  const from = monthKeyLabel(p.startMonth);
  const to = monthKeyLabel(addMonths(p.startMonth, n - 1));
  return n === 1 ? `${from} · 1 month` : `${from} – ${to} · ${n} months`;
};
