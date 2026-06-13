import type { AppConfig } from "../types/config";
import type {
  AppUser,
  ChangeInput,
  ChangeRequest,
  ChangeTransitionAction,
  Issue,
  IssueInput,
  Project,
  ProjectInput,
  Risk,
  RiskActionInput,
  RiskEventInput,
  RiskInput,
  RiskReviewInput,
} from "../types/domain";

/* ============================================================================
   Service interfaces — the seam between the UI and the backend.
   The UI only ever talks to these. Two implementations exist:
     - mock/   in-memory store with simulated latency (default)
     - http/   fetch calls against VITE_API_BASE_URL (real backend)
   ========================================================================== */

export interface RiskService {
  /** All risks, including archived ones. */
  list(): Promise<Risk[]>;
  get(ref: string): Promise<Risk | null>;
  create(input: RiskInput): Promise<Risk>;
  update(ref: string, patch: Partial<RiskInput>): Promise<Risk>;
  /** Append a draw-down event (realised / released / reduced) to the ledger.
      Recomputes derived totals and optionally closes the risk. */
  addEvent(ref: string, event: RiskEventInput): Promise<Risk>;
  /** Append a mitigation action to the risk's action plan. */
  addAction(ref: string, input: RiskActionInput): Promise<Risk>;
  /** Patch an action; completedDate is stamped/cleared on Complete transitions. */
  updateAction(ref: string, actionId: string, patch: Partial<RiskActionInput>): Promise<Risk>;
  deleteAction(ref: string, actionId: string): Promise<Risk>;
  /** Log a formal review: re-scores the risk and sets the next review date.
      Reviews are append-only — there are no update/delete endpoints. */
  addReview(ref: string, input: RiskReviewInput): Promise<Risk>;
  close(ref: string): Promise<Risk>;
  archive(ref: string): Promise<Risk>;
  restore(ref: string): Promise<Risk>;
}

export interface ChangeService {
  list(): Promise<ChangeRequest[]>;
  get(ref: string): Promise<ChangeRequest | null>;
  create(input: ChangeInput): Promise<ChangeRequest>;
  update(ref: string, patch: Partial<ChangeInput>): Promise<ChangeRequest>;
  /** Moves the change through its workflow (submit, approve, reject…).
      `date` is honoured only for "implement" (defaults to today when omitted). */
  transition(
    ref: string,
    action: ChangeTransitionAction,
    note?: string,
    date?: string,
  ): Promise<ChangeRequest>;
  /** Permanently removes a change. Only Draft changes may be deleted. */
  delete(ref: string): Promise<void>;
}

export interface ProjectService {
  /** All projects, including archived ones. */
  list(): Promise<Project[]>;
  create(input: ProjectInput): Promise<Project>;
  update(id: string, patch: Partial<ProjectInput>): Promise<Project>;
  archive(id: string): Promise<Project>;
  restore(id: string): Promise<Project>;
}

export interface ConfigService {
  get(): Promise<AppConfig>;
  /** Replaces the configuration. The server must recompute stored risk levels
      when the matrix changes. */
  update(config: AppConfig): Promise<AppConfig>;
  /** Stores an uploaded logo image and returns the URL to reference it by.
      Mock returns a data: URL; the backend persists the file and returns a
      served URL. The caller then saves that URL into branding.logoUrl. */
  uploadLogo(file: File): Promise<{ url: string }>;
}

export interface ReferenceService {
  currentUser(): Promise<AppUser>;
}

export interface IssueService {
  /** All issues, including archived ones. */
  list(): Promise<Issue[]>;
  get(ref: string): Promise<Issue | null>;
  create(input: IssueInput): Promise<Issue>;
  update(ref: string, patch: Partial<IssueInput>): Promise<Issue>;
  archive(ref: string): Promise<Issue>;
  restore(ref: string): Promise<Issue>;
}

export interface Services {
  risks: RiskService;
  changes: ChangeService;
  projects: ProjectService;
  config: ConfigService;
  reference: ReferenceService;
  issues: IssueService;
}
