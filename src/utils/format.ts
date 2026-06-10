/* ---- Money -------------------------------------------------------------- */
export const gbp = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${sign}£${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}£${(abs / 1e3).toFixed(0)}k`;
  return `${sign}£${abs.toFixed(0)}`;
};

export const gbpFull = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  return `${sign}£${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
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

/** Month key ("Jan", "Feb"…) from an ISO date, for chart bucketing. */
export const monthKey = (iso: string): string =>
  new Date(iso).toLocaleString("en-GB", { month: "short" });

/* ---- Misc ----------------------------------------------------------------- */
export const scheduleDays = (days: number): string =>
  days === 0 ? "—" : days > 0 ? `+${days}d` : `${days}d`;
