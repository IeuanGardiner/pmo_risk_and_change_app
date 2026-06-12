import type {
  ChangePriority,
  ChangeStatus,
  Rating,
  RiskActionStatus,
  RiskEventType,
  RiskLevel,
  RiskProximity,
  RiskResponseStrategy,
} from "./domain";
import type { MatrixGrid } from "./config";

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

export const calcScore = (likelihood: Rating, impact: Rating): number => likelihood * impact;

/** Level from the *configured* band matrix (AppConfig.matrix). Mirrors the
    server-side calculation; the grid is passed in so client risk-appetite
    customisations apply everywhere. */
export const calcLevel = (grid: MatrixGrid, likelihood: Rating, impact: Rating): RiskLevel =>
  grid[impact]?.[likelihood] ?? "Low";

export const RISK_LEVELS: RiskLevel[] = ["Critical", "High", "Medium", "Low"];

/** Proximity scale — how soon the risk could materialise (soonest first). */
export const RISK_PROXIMITIES: RiskProximity[] = [
  "Imminent",
  "Within 3 months",
  "3-6 months",
  "6-12 months",
  "Beyond 12 months",
];

/* ---- Risk workflow ------------------------------------------------------- */
/** The status the close workflow drives risks into. */
export const CLOSED_STATUS = "Closed";
/** The status new risks are created in. */
export const OPEN_STATUS = "Open";
export const isClosed = (status: string): boolean => status === CLOSED_STATUS;

export const RISK_EVENT_TYPES: RiskEventType[] = ["Realised", "Released", "Reduced"];
export const RISK_EVENT_LABELS: Record<RiskEventType, string> = {
  Realised: "Realised — the risk happened",
  Released: "Released — value handed back",
  Reduced: "Reduced — estimate revised down",
};

/* ---- Response strategies & action statuses ------------------------------- */
export const RISK_RESPONSE_STRATEGIES: RiskResponseStrategy[] = [
  "Avoid",
  "Reduce",
  "Transfer",
  "Accept",
  "Share",
];

export const RESPONSE_STRATEGY_HELP: Record<RiskResponseStrategy, string> = {
  Avoid: "Eliminate the risk by changing scope, approach or conditions",
  Reduce: "Lower the likelihood or impact through controls and mitigation actions",
  Transfer: "Shift the financial or contractual exposure to another party (e.g. insurance, warranty)",
  Accept: "Acknowledge the risk and carry the exposure — record the rationale",
  Share: "Distribute the risk with another party under a shared-risk arrangement",
};

export const RISK_ACTION_STATUSES: RiskActionStatus[] = [
  "Not Started",
  "In Progress",
  "Complete",
  "Cancelled",
];

/* ---- Change lookups ------------------------------------------------------ */
export const CHANGE_PRIORITIES: ChangePriority[] = ["Urgent", "High", "Standard", "Low"];
export const CHANGE_STATUSES: ChangeStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "Implemented",
];
