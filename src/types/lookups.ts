import type { ChangePriority, ChangeStatus, Rating, RiskLevel, RiskStatus } from "./domain";

/* ---- Likelihood / impact scales ---------------------------------------- */
export const IMPACTS: Record<Rating, string> = {
  5: "Catastrophic",
  4: "Major",
  3: "Moderate",
  2: "Minor",
  1: "Negligible",
};
export const LIKELIHOODS: Record<Rating, string> = {
  1: "Rare",
  2: "Unlikely",
  3: "Possible",
  4: "Likely",
  5: "Almost Certain",
};

/* ---- 5×5 band matrix: GRID[impact][likelihood] -> level ------------------
   Impact-weighted and monotonic. Mirrors the server-side calculation. */
export const GRID: Record<Rating, Record<Rating, RiskLevel>> = {
  5: { 1: "High", 2: "Critical", 3: "Critical", 4: "Critical", 5: "Critical" },
  4: { 1: "Medium", 2: "High", 3: "High", 4: "Critical", 5: "Critical" },
  3: { 1: "Low", 2: "Medium", 3: "High", 4: "High", 5: "Critical" },
  2: { 1: "Low", 2: "Low", 3: "Medium", 4: "Medium", 5: "High" },
  1: { 1: "Low", 2: "Low", 3: "Low", 4: "Medium", 5: "Medium" },
};

export const calcScore = (likelihood: Rating, impact: Rating): number => likelihood * impact;
export const calcLevel = (likelihood: Rating, impact: Rating): RiskLevel =>
  GRID[impact]?.[likelihood] ?? "Low";

export const RISK_LEVELS: RiskLevel[] = ["Critical", "High", "Medium", "Low"];
export const RISK_STATUSES: RiskStatus[] = ["Open", "Mitigating", "Monitoring", "Closed"];

/* ---- Categories / workstreams ------------------------------------------- */
export const PROJECT_RISK_CATEGORIES = [
  "Safety",
  "Structural",
  "Supply",
  "Regulatory",
  "Quality",
  "Commercial",
  "Schedule",
];
export const PROGRAM_RISK_CATEGORIES = [
  "Supply Chain",
  "Economic",
  "Regulatory",
  "Environmental",
  "Resourcing",
  "Political",
];
export const WORKSTREAMS = [
  "Civils & Structures",
  "Mechanical",
  "Electrical & ICA",
  "Process",
  "Commissioning",
  "Commercial",
  "Consents & Environment",
];

/* ---- Change lookups ------------------------------------------------------ */
export const CHANGE_CATEGORIES = [
  "Scope",
  "Design",
  "Schedule",
  "Cost",
  "Regulatory",
  "Process",
];
export const CHANGE_PRIORITIES: ChangePriority[] = ["Urgent", "High", "Standard", "Low"];
export const CHANGE_STATUSES: ChangeStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "Implemented",
];

export const PERIOD_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
