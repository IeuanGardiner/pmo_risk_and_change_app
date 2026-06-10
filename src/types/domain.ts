/* ============================================================================
   Domain model — shared between the mock layer and the HTTP layer.
   These shapes ARE the API contract: the backend should return JSON matching
   these interfaces (see README.md for the endpoint list).
   ========================================================================== */

export type Scope = "Project" | "Program";

/* ---------------------------------- Risk --------------------------------- */

export type RiskStatus = "Open" | "Mitigating" | "Monitoring" | "Closed";
export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type Rating = 1 | 2 | 3 | 4 | 5;

export type DistributionMethod = "Even" | "Custom";

/** 12-period (Jan–Dec) cost spread for a financial year. */
export interface CostProfile {
  distribution: DistributionMethod;
  /** Always 12 entries, period 1 = Jan. */
  periods: number[];
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
  /** Derived from the 5×5 band matrix (server-computed in HTTP mode). */
  level: RiskLevel;
  status: RiskStatus;
  /** ISO date (yyyy-mm-dd) or null. */
  targetDate: string | null;
  projectId: string | null;
  regulatoryPeriod: string;
  estimatedTotal: number;
  releasedTotal: number;
  realisedTotal: number;
  costProfile: CostProfile;
  mitigation: string;
  comments: string;
  linkedChangeRefs: string[];
  /** ISO datetime. */
  createdAt: string;
  /** ISO datetime. */
  updatedAt: string;
}

/** Payload for create/update — derived + server-owned fields excluded. */
export type RiskInput = Omit<
  Risk,
  "riskReference" | "score" | "level" | "createdAt" | "updatedAt"
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
  /** Net cost impact in £ (negative = saving). */
  costImpact: number;
  costProfile: CostProfile;
  /** Net schedule impact in days (negative = acceleration). */
  scheduleImpactDays: number;
  projectId: string | null;
  regulatoryPeriod: string;
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
}

export interface RegulatoryPeriod {
  code: string;
  label: string;
}

export interface AppUser {
  initials: string;
  name: string;
  role: string;
}
