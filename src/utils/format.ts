import type { CurrencyConfig } from "../types/config";
import { DEFAULT_CONFIG } from "../types/config";

/* ---- Money -------------------------------------------------------------- */
/* The active currency is module-level so chart tickFormatter closures and
   non-component helpers can format without threading React context. AppData
   calls setCurrency() before committing config to state, so every re-render
   already sees the new symbol. */
let currency: CurrencyConfig = DEFAULT_CONFIG.currency;

export const setCurrency = (c: CurrencyConfig): void => {
  currency = c;
};

export const currencySymbol = (): string => currency.symbol;

/** Abbreviated money: "£1.5M", "£250k", "£500". */
export const money = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${sign}${currency.symbol}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${currency.symbol}${(abs / 1e3).toFixed(0)}k`;
  return `${sign}${currency.symbol}${abs.toFixed(0)}`;
};

/** Full money with grouping: "£1,234,567". */
export const moneyFull = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  return `${sign}${currency.symbol}${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
};

/* ---- Numbers --------------------------------------------------------------- */
/** Parse free-text numeric input; NaN and empty become 0. */
export const parseNum = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/* ---- Dates --------------------------------------------------------------- */
const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** "2026-03-31" | ISO datetime -> "31 Mar 2026" (em-dash for null/invalid). */
export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${DATE_FMT.format(d)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

/** True when an ISO date (yyyy-mm-dd) is strictly before today. */
export const isOverdue = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

/* ---- Misc ----------------------------------------------------------------- */
export const scheduleDays = (days: number): string =>
  days === 0 ? "—" : days > 0 ? `+${days}d` : `${days}d`;
