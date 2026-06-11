import type { ChangePriority, ChangeStatus, RiskEventType, RiskLevel } from "../types/domain";

/* ----------------------------------------------------------------------------
   Design tokens. Every colour points at a CSS custom property declared in
   src/index.css, so the same token object drives both the light and dark
   schemes and picks up the per-deployment accent colour automatically. Values
   are used directly in inline styles (where var() resolves natively).

   NB: these strings are var() references, so they must NOT be concatenated with
   a hex alpha suffix (e.g. `${T.brand}33`) — use color-mix(...) instead. For
   Recharts SVG props (fill/stroke), which do not resolve var() in presentation
   attributes, use the resolved palette from useThemeColors() rather than T.
   -------------------------------------------------------------------------- */
export const T = {
  font: '"Segoe UI", "Segoe UI Web (West European)", -apple-system, system-ui, sans-serif',
  // neutrals
  bg: "var(--bg)",
  surface: "var(--surface)",
  stroke: "var(--stroke)",
  strokeSubtle: "var(--stroke-subtle)",
  text: "var(--text)",
  textSec: "var(--text-sec)",
  textTer: "var(--text-ter)",
  // brand
  brand: "var(--brand)",
  brandHover: "var(--brand-hover)",
  brandBg: "var(--brand-bg)",
  sidebar: "var(--sidebar)",
  sidebarItem: "var(--sidebar-item)",
  sidebarText: "var(--sidebar-text)",
  logo: "var(--logo)",
  // severity
  critical: "var(--critical)",
  criticalBg: "var(--critical-bg)",
  high: "var(--high)",
  highBg: "var(--high-bg)",
  medium: "var(--medium)",
  mediumBg: "var(--medium-bg)",
  low: "var(--low)",
  lowBg: "var(--low-bg)",
  // generic accents
  purple: "var(--purple)",
  teal: "var(--teal)",
  // depth
  shadow2: "var(--shadow-2)",
  shadow8: "var(--shadow-8)",
} as const;

/* CSS variable names backing the tokens above. Used by useThemeColors() to
   resolve concrete colours for Recharts (which can't consume var() in SVG
   presentation attributes) and kept in lock-step with src/index.css. */
export const CSS_VARS = {
  bg: "--bg",
  surface: "--surface",
  stroke: "--stroke",
  strokeSubtle: "--stroke-subtle",
  text: "--text",
  textSec: "--text-sec",
  textTer: "--text-ter",
  brand: "--brand",
  critical: "--critical",
  high: "--high",
  medium: "--medium",
  low: "--low",
  purple: "--purple",
  teal: "--teal",
} as const;

/** Hard-coded fallbacks (light scheme) used if a variable can't be resolved,
    e.g. during SSR or before the stylesheet applies. */
export const TOKEN_FALLBACKS: Record<keyof typeof CSS_VARS, string> = {
  bg: "#F5F5F5",
  surface: "#FFFFFF",
  stroke: "#E1DFDD",
  strokeSubtle: "#EDEBE9",
  text: "#242424",
  textSec: "#616161",
  textTer: "#8A8886",
  brand: "#0F6CBD",
  critical: "#B10E1C",
  high: "#D9620B",
  medium: "#C19C00",
  low: "#0E7A0B",
  purple: "#8764B8",
  teal: "#038387",
};

/** Translucent variant of a colour. Works with var() token values (a hex-alpha
    suffix like `${T.brand}33` does not, since the token is now a var() ref). */
export const alpha = (color: string, pct: number): string =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const LEVEL_STYLES: Record<RiskLevel, { c: string; bg: string }> = {
  Critical: { c: T.critical, bg: T.criticalBg },
  High: { c: T.high, bg: T.highBg },
  Medium: { c: T.medium, bg: T.mediumBg },
  Low: { c: T.low, bg: T.lowBg },
};

/** Statuses are client-configurable, so colour by the well-known states and
    fall back to the brand colour for any custom "open" status. */
export const riskStatusColor = (status: string): string =>
  status === "Closed" ? T.textSec : T.brand;

/** Draw-down ledger event styling. */
export const RISK_EVENT_STYLES: Record<RiskEventType, { c: string; bg: string; label: string }> = {
  Realised: { c: T.critical, bg: T.criticalBg, label: "Realised" },
  Released: { c: T.low, bg: T.lowBg, label: "Released" },
  Reduced: { c: T.brand, bg: T.brandBg, label: "Reduced" },
};

export const CHANGE_STATUS_STYLES: Record<ChangeStatus, { c: string; bg: string }> = {
  Draft: { c: T.textSec, bg: "#F0F0F0" },
  Submitted: { c: T.brand, bg: T.brandBg },
  "Under Review": { c: T.purple, bg: "#F5F1FA" },
  Approved: { c: T.low, bg: T.lowBg },
  Rejected: { c: T.critical, bg: T.criticalBg },
  Implemented: { c: T.teal, bg: "#EBF5F5" },
};

export const PRIORITY_COLORS: Record<ChangePriority, string> = {
  Urgent: T.critical,
  High: T.high,
  Standard: T.brand,
  Low: T.textSec,
};

export const CHART_COLORS = [
  "#B10E1C", "#0F6CBD", "#D9620B", "#C19C00", "#0E7A0B", "#8764B8", "#038387",
];
