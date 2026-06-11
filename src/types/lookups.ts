import type { ChangePriority, ChangeStatus, Rating, RiskEventType, RiskLevel } from "./domain";
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
