/* ============================================================================
   Domain model — shared between the mock layer and the HTTP layer.
   These shapes ARE the API contract: the backend should return JSON matching
   these interfaces (see README.md for the endpoint list).
   ========================================================================== */

export type Scope = "Project" | "Program";

/* ---------------------------------- Risk --------------------------------- */

/** Free text so deployments can tailor the workflow in Settings. The literal
    "Closed" is the one well-known state the close workflow depends on. */
export type RiskStatus = string;
export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type Rating = 1 | 2 | 3 | 4 | 5;

export type DistributionMethod = "Even" | "Custom";

/** Calendar-anchored cost spread: one entry per month from `startMonth`. */
export interface CostProfile {
  distribution: DistributionMethod;
  /** First month of the profile, "yyyy-mm". */
  startMonth: string;
  /** One entry per calendar month; length 1–60 (max 5 years). */
  periods: number[];
}

/* ---- Risk update ledger (the risk's change log) -------------------------- */

/**
 * A draw-down event against a risk:
 *  - "Realised"  the risk happened — this is the cost it incurred and when.
 *  - "Released"  it won't happen (in full or in part) — value handed back.
 *  - "Reduced"   the estimate has been revised down while the risk stays open.
 */
export type RiskEventType = "Realised" | "Released" | "Reduced";

export interface RiskEvent {
  id: string;
  type: RiskEventType;
  /** Positive monetary value of this event. */
  amount: number;
  /** When the event happened / was actioned — ISO date (yyyy-mm-dd). */
  date: string;
  note: string;
  actor: string;
  /** ISO datetime the ledger entry was recorded. */
  createdAt: string;
  /** True when this event also closed the risk. */
  closedRisk: boolean;
}

/** Payload for logging a new ledger event (server stamps id/actor/createdAt). */
export interface RiskEventInput {
  type: RiskEventType;
  amount: number;
  date: string;
  note: string;
  /** Close the risk as part of this event (e.g. full release / final realise). */
  closeRisk: boolean;
}

export interface Risk {
  riskReference: string;
  scope: Scope;
  title: string;
  description: string;
  category: string;
  workstream: string | null;
  owner: string;
  likelihood: Rating;
  impact: Rating;
  /** Derived: likelihood × impact (server-computed in HTTP mode). */
  score: number;
  /** Derived from the configured 5×5 band matrix (server-computed in HTTP mode). */
  level: RiskLevel;
  status: RiskStatus;
  /** ISO date (yyyy-mm-dd) or null. */
  targetDate: string | null;
  /** Next scheduled review, ISO date (yyyy-mm-dd) or null. */
  nextReviewDate: string | null;
  projectId: string | null;
  /** The forecast risk value, spread by `costProfile`. */
  estimatedTotal: number;
  /** Derived from the ledger (sum of "Realised" events). Server-computed. */
  realisedTotal: number;
  /** Derived from the ledger (sum of "Released" events). Server-computed. */
  releasedTotal: number;
  /** Derived from the ledger (sum of "Reduced" events). Server-computed. */
  reducedTotal: number;
  costProfile: CostProfile;
  /** Update / draw-down ledger — appended via the risk event endpoint. */
  events: RiskEvent[];
  mitigation: string;
  comments: string;
  linkedChangeRefs: string[];
  /** Soft-deleted; hidden from dashboards and default register views. */
  archived: boolean;
  /** ISO datetime. */
  createdAt: string;
  /** ISO datetime. */
  updatedAt: string;
}

/** Payload for create/update — derived, ledger + server-owned fields excluded. */
export type RiskInput = Omit<
  Risk,
  | "riskReference"
  | "score"
  | "level"
  | "realisedTotal"
  | "releasedTotal"
  | "reducedTotal"
  | "events"
  | "archived"
  | "createdAt"
  | "updatedAt"
>;

/* --------------------------------- Change -------------------------------- */

export type ChangeStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Implemented";

export type ChangePriority = "Urgent" | "High" | "Standard" | "Low";

export type ChangeTransitionAction =
  | "submit"
  | "startReview"
  | "approve"
  | "reject"
  | "implement"
  | "reopen";

export interface ChangeApprovalEvent {
  status: ChangeStatus;
  actor: string;
  /** ISO datetime. */
  date: string;
  note?: string;
}

export interface ChangeRequest {
  changeReference: string;
  scope: Scope;
  title: string;
  description: string;
  justification: string;
  category: string;
  priority: ChangePriority;
  status: ChangeStatus;
  raisedBy: string;
  owner: string;
  /** Net cost impact (negative = saving). */
  costImpact: number;
  costProfile: CostProfile;
  /** Net schedule impact in days (negative = acceleration). */
  scheduleImpactDays: number;
  projectId: string | null;
  linkedRiskRefs: string[];
  approvalHistory: ChangeApprovalEvent[];
  /** ISO date (yyyy-mm-dd) or null. */
  requiredBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChangeInput = Omit<
  ChangeRequest,
  "changeReference" | "status" | "approvalHistory" | "createdAt" | "updatedAt"
>;

/* ------------------------------- Reference ------------------------------- */

export interface Project {
  id: string;
  name: string;
  code: string;
  /** Archived projects stay resolvable on old records but are hidden from pickers. */
  archived: boolean;
}

export type ProjectInput = Omit<Project, "id" | "archived">;

export interface AppUser {
  initials: string;
  name: string;
  role: string;
}
