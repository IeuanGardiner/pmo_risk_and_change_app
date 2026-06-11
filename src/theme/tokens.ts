import type { ChangePriority, ChangeStatus, RiskEventType, RiskLevel } from "../types/domain";

/* ---- Fluent-aligned design tokens (from the Figma wireframes) ----------- */
export const T = {
  font: '"Segoe UI", "Segoe UI Web (West European)", -apple-system, system-ui, sans-serif',
  // neutrals
  bg: "#F5F5F5",
  surface: "#FFFFFF",
  stroke: "#E1DFDD",
  strokeSubtle: "#EDEBE9",
  text: "#242424",
  textSec: "#616161",
  textTer: "#8A8886",
  // brand
  brand: "#0F6CBD",
  brandHover: "#115EA3",
  brandBg: "#EFF6FC",
  sidebar: "#1B1E2B",
  sidebarItem: "#2A2E3F",
  sidebarText: "#C9CDD9",
  logo: "#E84A4A",
  // severity
  critical: "#B10E1C",
  criticalBg: "#FDF3F4",
  high: "#D9620B",
  highBg: "#FDF6F0",
  medium: "#C19C00",
  mediumBg: "#FBF8EC",
  low: "#0E7A0B",
  lowBg: "#F1F8F1",
  // generic accents
  purple: "#8764B8",
  teal: "#038387",
  // depth
  shadow2: "0 1px 2px rgba(0,0,0,0.07), 0 0px 2px rgba(0,0,0,0.06)",
  shadow8: "0 3.2px 7.2px rgba(0,0,0,0.10), 0 0.6px 1.8px rgba(0,0,0,0.08)",
} as const;

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
