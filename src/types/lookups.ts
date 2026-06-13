import type {
  ChangePriority,
  ChangeStatus,
  IssueStatus,
  Rating,
  RiskAction,
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

export const RISK_EVENT_TYPES: RiskEventType[] = ["Realised", "Released"];
export const RISK_EVENT_LABELS: Record<RiskEventType, string> = {
  Realised: "Realised — the risk happened",
  Released: "Released — value handed back",
};

/* ---- Response strategy & mitigation actions ------------------------------ */
export const RISK_RESPONSE_STRATEGIES: RiskResponseStrategy[] = [
  "Avoid",
  "Reduce",
  "Transfer",
  "Accept",
  "Share",
];

export const RESPONSE_STRATEGY_HELP: Record<RiskResponseStrategy, string> = {
  Avoid: "Change the plan so the risk cannot occur",
  Reduce: "Act to lower likelihood and/or impact",
  Transfer: "Pass the impact to a third party (insurance, contract)",
  Accept: "Tolerate the risk and monitor",
  Share: "Apportion the risk with another party",
};

export const RISK_ACTION_STATUSES: RiskActionStatus[] = [
  "Not Started",
  "In Progress",
  "Complete",
  "Cancelled",
];

/** Open = still chaseable (not finished, not abandoned). */
export const isOpenAction = (a: RiskAction): boolean =>
  a.status !== "Complete" && a.status !== "Cancelled";

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

/* ---- Issue lookups ------------------------------------------------------- */
export const ISSUE_STATUSES: IssueStatus[] = ["Open", "In Progress", "Closed"];
/** Issue priority reuses ChangePriority — aliased here for register sort accessors. */
export const ISSUE_PRIORITIES: ChangePriority[] = CHANGE_PRIORITIES;
