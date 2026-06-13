import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { services } from "../api";
import type { AppConfig } from "../types/config";
import { DEFAULT_CONFIG } from "../types/config";
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
import { setCurrency } from "../utils/format";

/* ============================================================================
   AppData — single client-side cache over the service layer. Every mutation
   goes through the service (mock or HTTP) and the cache is updated from the
   service's response, so the UI behaves identically against a real backend.
   ========================================================================== */

interface AppDataValue {
  loading: boolean;
  error: string | null;
  /** All risks, including archived. Prefer `activeRisks` for dashboards/forms. */
  risks: Risk[];
  activeRisks: Risk[];
  changes: ChangeRequest[];
  /** All projects, including archived. Prefer `activeProjects` for pickers. */
  projects: Project[];
  /** Not archived — the maintainable, "live" set. */
  activeProjects: Project[];
  /** Not archived and not Cancelled — the set offered in record pickers. */
  pickerProjects: Project[];
  /** All issues, including archived. */
  issues: Issue[];
  /** Not archived — the live set for dashboards and registers. */
  activeIssues: Issue[];
  config: AppConfig;
  user: AppUser | null;
  refresh: () => Promise<void>;
  createRisk: (input: RiskInput) => Promise<Risk>;
  updateRisk: (ref: string, patch: Partial<RiskInput>) => Promise<Risk>;
  addRiskEvent: (ref: string, event: RiskEventInput) => Promise<Risk>;
  addRiskAction: (ref: string, input: RiskActionInput) => Promise<Risk>;
  updateRiskAction: (
    ref: string,
    actionId: string,
    patch: Partial<RiskActionInput>,
  ) => Promise<Risk>;
  deleteRiskAction: (ref: string, actionId: string) => Promise<Risk>;
  addRiskReview: (ref: string, input: RiskReviewInput) => Promise<Risk>;
  closeRisk: (ref: string) => Promise<Risk>;
  archiveRisk: (ref: string) => Promise<Risk>;
  restoreRisk: (ref: string) => Promise<Risk>;
  createChange: (input: ChangeInput) => Promise<ChangeRequest>;
  updateChange: (ref: string, patch: Partial<ChangeInput>) => Promise<ChangeRequest>;
  transitionChange: (
    ref: string,
    action: ChangeTransitionAction,
    note?: string,
    date?: string,
  ) => Promise<ChangeRequest>;
  deleteChange: (ref: string) => Promise<void>;
  updateConfig: (next: AppConfig) => Promise<AppConfig>;
  uploadLogo: (file: File) => Promise<{ url: string }>;
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<Project>;
  archiveProject: (id: string) => Promise<Project>;
  restoreProject: (id: string) => Promise<Project>;
  createIssue: (input: IssueInput) => Promise<Issue>;
  updateIssue: (ref: string, patch: Partial<IssueInput>) => Promise<Issue>;
  archiveIssue: (ref: string) => Promise<Issue>;
  restoreIssue: (ref: string) => Promise<Issue>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [user, setUser] = useState<AppUser | null>(null);
  // Monotonic counters — incremented before each side-effect refetch so that only
  // the response matching the most recent request updates state (guards against
  // two overlapping mutations whose refetches interleave).
  const refreshRisksSeq = useRef(0);
  const refreshChangesSeq = useRef(0);
  // Ref kept in sync with `changes` state so stable callbacks can read current
  // values without declaring `changes` as a dependency.
  const changesRef = useRef(changes);
  useEffect(() => { changesRef.current = changes; }, [changes]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [riskList, changeList, projectList, issueList, cfg, currentUser] = await Promise.all([
        services.risks.list(),
        services.changes.list(),
        services.projects.list(),
        services.issues.list(),
        services.config.get(),
        services.reference.currentUser(),
      ]);
      setCurrency(cfg.currency);
      setRisks(riskList);
      setChanges(changeList);
      setProjects(projectList);
      setIssues(issueList);
      setConfig(cfg);
      setUser(currentUser);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsertRisk = useCallback((rec: Risk) =>
    setRisks((prev) => {
      const exists = prev.some((r) => r.riskReference === rec.riskReference);
      return exists
        ? prev.map((r) => (r.riskReference === rec.riskReference ? rec : r))
        : [...prev, rec];
    }), []);

  const upsertChange = useCallback((rec: ChangeRequest) =>
    setChanges((prev) => {
      const exists = prev.some((c) => c.changeReference === rec.changeReference);
      return exists
        ? prev.map((c) => (c.changeReference === rec.changeReference ? rec : c))
        : [...prev, rec];
    }), []);

  const upsertProject = useCallback((rec: Project) =>
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === rec.id);
      return exists ? prev.map((p) => (p.id === rec.id ? rec : p)) : [...prev, rec];
    }), []);

  const upsertIssue = useCallback((rec: Issue) =>
    setIssues((prev) => {
      const exists = prev.some((i) => i.issueReference === rec.issueReference);
      return exists
        ? prev.map((i) => (i.issueReference === rec.issueReference ? rec : i))
        : [...prev, rec];
    }), []);

  /** Risk↔change links are bidirectional; refetch risks so both sides agree. */
  const refreshRisks = useCallback(async () => {
    const seq = ++refreshRisksSeq.current;
    const list = await services.risks.list();
    if (seq === refreshRisksSeq.current) setRisks(list);
  }, []);

  /** Risk/change↔issue links are bidirectional; refetch changes so both sides agree. */
  const refreshChanges = useCallback(async () => {
    const seq = ++refreshChangesSeq.current;
    const list = await services.changes.list();
    if (seq === refreshChangesSeq.current) setChanges(list);
  }, []);


  // Stable mutation callbacks extracted so consumers don't re-render on
  // unrelated state changes.
  const createRisk = useCallback(async (input: RiskInput): Promise<Risk> => {
    const rec = await services.risks.create(input);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const updateRisk = useCallback(async (ref: string, patch: Partial<RiskInput>): Promise<Risk> => {
    const rec = await services.risks.update(ref, patch);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const addRiskEvent = useCallback(async (ref: string, event: RiskEventInput): Promise<Risk> => {
    const rec = await services.risks.addEvent(ref, event);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const addRiskAction = useCallback(async (ref: string, input: RiskActionInput): Promise<Risk> => {
    const rec = await services.risks.addAction(ref, input);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const updateRiskAction = useCallback(async (
    ref: string,
    actionId: string,
    patch: Partial<RiskActionInput>,
  ): Promise<Risk> => {
    const rec = await services.risks.updateAction(ref, actionId, patch);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const deleteRiskAction = useCallback(async (ref: string, actionId: string): Promise<Risk> => {
    const rec = await services.risks.deleteAction(ref, actionId);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const addRiskReview = useCallback(async (ref: string, input: RiskReviewInput): Promise<Risk> => {
    const rec = await services.risks.addReview(ref, input);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const closeRisk = useCallback(async (ref: string): Promise<Risk> => {
    const rec = await services.risks.close(ref);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const archiveRisk = useCallback(async (ref: string): Promise<Risk> => {
    const rec = await services.risks.archive(ref);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const restoreRisk = useCallback(async (ref: string): Promise<Risk> => {
    const rec = await services.risks.restore(ref);
    upsertRisk(rec);
    return rec;
  }, [upsertRisk]);

  const createChange = useCallback(async (input: ChangeInput): Promise<ChangeRequest> => {
    const rec = await services.changes.create(input);
    upsertChange(rec);
    if (input.linkedRiskRefs.length) await refreshRisks();
    return rec;
  }, [upsertChange, refreshRisks]);

  const updateChange = useCallback(async (ref: string, patch: Partial<ChangeInput>): Promise<ChangeRequest> => {
    const rec = await services.changes.update(ref, patch);
    upsertChange(rec);
    if (patch.linkedRiskRefs) await refreshRisks();
    return rec;
  }, [upsertChange, refreshRisks]);

  const transitionChange = useCallback(async (
    ref: string,
    action: ChangeTransitionAction,
    note?: string,
    date?: string,
  ): Promise<ChangeRequest> => {
    const rec = await services.changes.transition(ref, action, note, date);
    upsertChange(rec);
    return rec;
  }, [upsertChange]);

  const deleteChange = useCallback(async (ref: string): Promise<void> => {
    const hadLinks = changesRef.current.find((c) => c.changeReference === ref)?.linkedRiskRefs.length;
    await services.changes.delete(ref);
    setChanges((prev) => prev.filter((c) => c.changeReference !== ref));
    if (hadLinks) await refreshRisks();
  }, [refreshRisks]);

  const updateConfig = useCallback(async (next: AppConfig): Promise<AppConfig> => {
    const cfg = await services.config.update(next);
    setCurrency(cfg.currency);
    setConfig(cfg);
    await refreshRisks();
    return cfg;
  }, [refreshRisks]);

  const uploadLogo = useCallback(
    (file: File) => services.config.uploadLogo(file),
    [],
  );

  const createProject = useCallback(async (input: ProjectInput): Promise<Project> => {
    const rec = await services.projects.create(input);
    upsertProject(rec);
    return rec;
  }, [upsertProject]);

  const updateProject = useCallback(async (id: string, patch: Partial<ProjectInput>): Promise<Project> => {
    const rec = await services.projects.update(id, patch);
    upsertProject(rec);
    return rec;
  }, [upsertProject]);

  const archiveProject = useCallback(async (id: string): Promise<Project> => {
    const rec = await services.projects.archive(id);
    upsertProject(rec);
    return rec;
  }, [upsertProject]);

  const restoreProject = useCallback(async (id: string): Promise<Project> => {
    const rec = await services.projects.restore(id);
    upsertProject(rec);
    return rec;
  }, [upsertProject]);

  const createIssue = useCallback(async (input: IssueInput): Promise<Issue> => {
    const rec = await services.issues.create(input);
    upsertIssue(rec);
    if (input.linkedRiskRefs.length) await refreshRisks();
    if (input.linkedChangeRefs.length) await refreshChanges();
    return rec;
  }, [upsertIssue, refreshRisks, refreshChanges]);

  const updateIssue = useCallback(async (ref: string, patch: Partial<IssueInput>): Promise<Issue> => {
    const rec = await services.issues.update(ref, patch);
    upsertIssue(rec);
    if (patch.linkedRiskRefs) await refreshRisks();
    if (patch.linkedChangeRefs) await refreshChanges();
    return rec;
  }, [upsertIssue, refreshRisks, refreshChanges]);

  const archiveIssue = useCallback(async (ref: string): Promise<Issue> => {
    const rec = await services.issues.archive(ref);
    upsertIssue(rec);
    return rec;
  }, [upsertIssue]);

  const restoreIssue = useCallback(async (ref: string): Promise<Issue> => {
    const rec = await services.issues.restore(ref);
    upsertIssue(rec);
    return rec;
  }, [upsertIssue]);

  const activeRisks = useMemo(() => risks.filter((r) => !r.archived), [risks]);
  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const pickerProjects = useMemo(
    () => activeProjects.filter((p) => p.status !== "Cancelled"),
    [activeProjects],
  );
  const activeIssues = useMemo(() => issues.filter((i) => !i.archived), [issues]);

  const value = useMemo<AppDataValue>(
    () => ({
      loading,
      error,
      risks,
      activeRisks,
      changes,
      projects,
      activeProjects,
      pickerProjects,
      issues,
      activeIssues,
      config,
      user,
      refresh,
      createRisk,
      updateRisk,
      addRiskEvent,
      addRiskAction,
      updateRiskAction,
      deleteRiskAction,
      addRiskReview,
      closeRisk,
      archiveRisk,
      restoreRisk,
      createChange,
      updateChange,
      transitionChange,
      deleteChange,
      updateConfig,
      uploadLogo,
      createProject,
      updateProject,
      archiveProject,
      restoreProject,
      createIssue,
      updateIssue,
      archiveIssue,
      restoreIssue,
    }),
    [
      loading, error, risks, activeRisks, changes, projects, activeProjects, pickerProjects,
      issues, activeIssues,
      config, user, refresh,
      createRisk, updateRisk, addRiskEvent, addRiskAction, updateRiskAction, deleteRiskAction,
      addRiskReview, closeRisk, archiveRisk, restoreRisk,
      createChange, updateChange, transitionChange, deleteChange, updateConfig, uploadLogo,
      createProject, updateProject, archiveProject, restoreProject,
      createIssue, updateIssue, archiveIssue, restoreIssue,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
