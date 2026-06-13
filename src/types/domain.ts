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

/** How soon a risk could materialise (PMO "proximity"). */
export type RiskProximity =
  | "Imminent"
  | "Within 3 months"
  | "3-6 months"
  | "6-12 months"
  | "Beyond 12 months";

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
 *  - "Released"  it won't happen (in full or in part) — value handed back to
 *                the budget. A downward estimate revision is a partial release.
 */
export type RiskEventType = "Realised" | "Released";

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

/* ---- Response strategy & mitigation action plan -------------------------- */

/** PRINCE2-style response types (ISO 31000 "treatment options"). */
export type RiskResponseStrategy = "Avoid" | "Reduce" | "Transfer" | "Accept" | "Share";

export type RiskActionStatus = "Not Started" | "In Progress" | "Complete" | "Cancelled";

/** A discrete, chaseable mitigation action against a risk. */
export interface RiskAction {
  /** Server-owned. */
  id: string;
  title: string;
  owner: string;
  /** ISO date (yyyy-mm-dd) or null. */
  dueDate: string | null;
  status: RiskActionStatus;
  /** Server-stamped when status transitions into "Complete"; cleared on reopen. */
  completedDate: string | null;
  notes: string;
  /** ISO datetime, server-owned. */
  createdAt: string;
  /** ISO datetime, server-owned. */
  updatedAt: string;
}

/** Payload for adding/patching an action (server owns id/completedDate/timestamps). */
export interface RiskActionInput {
  title: string;
  owner: string;
  dueDate: string | null;
  status: RiskActionStatus;
  notes: string;
}

/* ---- Review log ----------------------------------------------------------- */

/** A formal, logged risk review with an optional re-score. Append-only. */
export interface RiskReview {
  /** Server-owned. */
  id: string;
  /** ISO date the review was held. */
  date: string;
  /** Server-stamped from the current user. */
  reviewer: string;
  comment: string;
  /** Server-stamped snapshot of the risk before the review. */
  previousLikelihood: Rating;
  previousImpact: Rating;
  /** The assessment after the review (applied to the risk). */
  likelihood: Rating;
  impact: Rating;
  /** What the review set the risk's next review date to. */
  nextReviewDate: string | null;
  /** ISO datetime, server-owned. */
  createdAt: string;
}

/** Payload for logging a review (server stamps id, reviewer, the previous
    ratings snapshot and createdAt). */
export interface RiskReviewInput {
  date: string;
  comment: string;
  likelihood: Rating;
  impact: Rating;
  nextReviewDate: string | null;
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
  /** Post-mitigation (target/residual) likelihood — optional, both-or-neither. */
  targetLikelihood: Rating | null;
  /** Post-mitigation (target/residual) impact — optional, both-or-neither. */
  targetImpact: Rating | null;
  /** Derived: targetLikelihood × targetImpact when both set, else null. Server-owned. */
  targetScore: number | null;
  /** Derived from the matrix when both target ratings are set, else null. Server-owned. */
  targetLevel: RiskLevel | null;
  /** How soon the risk could materialise. */
  proximity: RiskProximity | null;
  /** Potential programme-time impact in days (default 0). */
  scheduleImpactDays: number;
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
  costProfile: CostProfile;
  /** Update / draw-down ledger — appended via the risk event endpoint. */
  events: RiskEvent[];
  /** Chosen response strategy (PRINCE2 response types). */
  responseStrategy: RiskResponseStrategy | null;
  /** Mitigation action plan — maintained via the risk action endpoints. */
  actions: RiskAction[];
  /** Formal review log — appended via the risk review endpoint. Append-only. */
  reviews: RiskReview[];
  mitigation: string;
  comments: string;
  linkedChangeRefs: string[];
  linkedIssueRefs: string[];
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
  | "targetScore"
  | "targetLevel"
  | "realisedTotal"
  | "releasedTotal"
  | "events"
  | "actions"
  | "reviews"
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
  linkedIssueRefs: string[];
  approvalHistory: ChangeApprovalEvent[];
  /** What the change affects (from config.changeImpactAreas); may be empty. */
  impactAreas: string[];
  /** When implementation is planned for — ISO date (yyyy-mm-dd) or null. */
  plannedImplementationDate: string | null;
  /** SERVER-OWNED: stamped by the "implement" transition only (cleared on reopen). */
  actualImplementationDate: string | null;
  /** ISO date (yyyy-mm-dd) or null. */
  requiredBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChangeInput = Omit<
  ChangeRequest,
  | "changeReference"
  | "status"
  | "approvalHistory"
  | "actualImplementationDate"
  | "createdAt"
  | "updatedAt"
>;

/* ------------------------------- Reference ------------------------------- */

export type ProjectStatus = "Pipeline" | "Active" | "On Hold" | "Complete" | "Cancelled";

export interface Project {
  id: string;
  /** Short reference, unique (e.g. PRJ-001). */
  code: string;
  name: string;
  /** From config.projectTypes lookup. */
  type: string | null;
  client: string | null;
  projectManager: string | null;
  /** Defaults to "Active" on create. Independent of `archived`. */
  status: ProjectStatus;
  /** ISO date yyyy-mm-dd. */
  startDate: string | null;
  /** ISO date yyyy-mm-dd. */
  endDate: string | null;
  /** Project/contract value, in the display currency. */
  value: number | null;
  description: string;
  /** Archived projects stay resolvable on old records but are hidden from pickers. */
  archived: boolean;
  /** ISO datetime, server-owned. */
  createdAt: string;
  /** ISO datetime, server-owned. */
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "archived" | "createdAt" | "updatedAt">;

export interface AppUser {
  initials: string;
  name: string;
  role: string;
}

/* --------------------------------- Issue --------------------------------- */

export type IssueStatus = "Open" | "In Progress" | "Closed";

export interface Issue {
  /** Server-assigned: "I001", "I002", … */
  issueReference: string;
  scope: Scope;
  title: string;
  description: string;
  /** From config.issueCategories. */
  category: string;
  /** Reuses the same priority levels as ChangeRequest. */
  priority: ChangePriority;
  status: IssueStatus;
  owner: string;
  raisedBy: string;
  /** null for Program scope. */
  projectId: string | null;
  /** Simple monetary estimate — no calendar profile. */
  estimatedCost: number;
  /** ISO date yyyy-mm-dd or null. */
  targetResolutionDate: string | null;
  linkedRiskRefs: string[];
  linkedChangeRefs: string[];
  /** Soft-deleted; hidden from the default register view. */
  archived: boolean;
  /** ISO datetime, server-owned. */
  createdAt: string;
  /** ISO datetime, server-owned. */
  updatedAt: string;
}

export type IssueInput = Omit<
  Issue,
  "issueReference" | "archived" | "createdAt" | "updatedAt"
>;
