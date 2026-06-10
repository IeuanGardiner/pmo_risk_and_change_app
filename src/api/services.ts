import type {
  AppUser,
  ChangeInput,
  ChangeRequest,
  ChangeTransitionAction,
  Project,
  RegulatoryPeriod,
  Risk,
  RiskInput,
} from "../types/domain";

/* ============================================================================
   Service interfaces — the seam between the UI and the backend.
   The UI only ever talks to these. Two implementations exist:
     - mock/   in-memory store with simulated latency (default)
     - http/   fetch calls against VITE_API_BASE_URL (real backend)
   ========================================================================== */

export interface RiskService {
  list(): Promise<Risk[]>;
  get(ref: string): Promise<Risk | null>;
  create(input: RiskInput): Promise<Risk>;
  update(ref: string, patch: Partial<RiskInput>): Promise<Risk>;
  close(ref: string): Promise<Risk>;
}

export interface ChangeService {
  list(): Promise<ChangeRequest[]>;
  get(ref: string): Promise<ChangeRequest | null>;
  create(input: ChangeInput): Promise<ChangeRequest>;
  update(ref: string, patch: Partial<ChangeInput>): Promise<ChangeRequest>;
  /** Moves the change through its workflow (submit, approve, reject…). */
  transition(ref: string, action: ChangeTransitionAction, note?: string): Promise<ChangeRequest>;
}

export interface ReferenceService {
  projects(): Promise<Project[]>;
  regulatoryPeriods(): Promise<RegulatoryPeriod[]>;
  currentUser(): Promise<AppUser>;
}

export interface Services {
  risks: RiskService;
  changes: ChangeService;
  reference: ReferenceService;
}
