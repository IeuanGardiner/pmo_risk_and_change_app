import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [user, setUser] = useState<AppUser | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [riskList, changeList, projectList, cfg, currentUser] = await Promise.all([
        services.risks.list(),
        services.changes.list(),
        services.projects.list(),
        services.config.get(),
        services.reference.currentUser(),
      ]);
      setCurrency(cfg.currency);
      setRisks(riskList);
      setChanges(changeList);
      setProjects(projectList);
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

  const upsertRisk = (rec: Risk) =>
    setRisks((prev) => {
      const exists = prev.some((r) => r.riskReference === rec.riskReference);
      return exists
        ? prev.map((r) => (r.riskReference === rec.riskReference ? rec : r))
        : [...prev, rec];
    });

  const upsertChange = (rec: ChangeRequest) =>
    setChanges((prev) => {
      const exists = prev.some((c) => c.changeReference === rec.changeReference);
      return exists
        ? prev.map((c) => (c.changeReference === rec.changeReference ? rec : c))
        : [...prev, rec];
    });

  const upsertProject = (rec: Project) =>
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === rec.id);
      return exists ? prev.map((p) => (p.id === rec.id ? rec : p)) : [...prev, rec];
    });

  /** Risk↔change links are bidirectional; refetch risks so both sides agree. */
  const refreshRisks = async () => setRisks(await services.risks.list());

  const activeRisks = useMemo(() => risks.filter((r) => !r.archived), [risks]);
  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const pickerProjects = useMemo(
    () => activeProjects.filter((p) => p.status !== "Cancelled"),
    [activeProjects],
  );

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
      config,
      user,
      refresh,
      createRisk: async (input) => {
        const rec = await services.risks.create(input);
        upsertRisk(rec);
        return rec;
      },
      updateRisk: async (ref, patch) => {
        const rec = await services.risks.update(ref, patch);
        upsertRisk(rec);
        return rec;
      },
      addRiskEvent: async (ref, event) => {
        const rec = await services.risks.addEvent(ref, event);
        upsertRisk(rec);
        return rec;
      },
      addRiskAction: async (ref, input) => {
        const rec = await services.risks.addAction(ref, input);
        upsertRisk(rec);
        return rec;
      },
      updateRiskAction: async (ref, actionId, patch) => {
        const rec = await services.risks.updateAction(ref, actionId, patch);
        upsertRisk(rec);
        return rec;
      },
      deleteRiskAction: async (ref, actionId) => {
        const rec = await services.risks.deleteAction(ref, actionId);
        upsertRisk(rec);
        return rec;
      },
      addRiskReview: async (ref, input) => {
        const rec = await services.risks.addReview(ref, input);
        upsertRisk(rec);
        return rec;
      },
      closeRisk: async (ref) => {
        const rec = await services.risks.close(ref);
        upsertRisk(rec);
        return rec;
      },
      archiveRisk: async (ref) => {
        const rec = await services.risks.archive(ref);
        upsertRisk(rec);
        return rec;
      },
      restoreRisk: async (ref) => {
        const rec = await services.risks.restore(ref);
        upsertRisk(rec);
        return rec;
      },
      createChange: async (input) => {
        const rec = await services.changes.create(input);
        upsertChange(rec);
        if (input.linkedRiskRefs.length) await refreshRisks();
        return rec;
      },
      updateChange: async (ref, patch) => {
        const rec = await services.changes.update(ref, patch);
        upsertChange(rec);
        if (patch.linkedRiskRefs) await refreshRisks();
        return rec;
      },
      transitionChange: async (ref, action, note, date) => {
        const rec = await services.changes.transition(ref, action, note, date);
        upsertChange(rec);
        return rec;
      },
      deleteChange: async (ref) => {
        const hadLinks = changes.find((c) => c.changeReference === ref)?.linkedRiskRefs.length;
        await services.changes.delete(ref);
        setChanges((prev) => prev.filter((c) => c.changeReference !== ref));
        if (hadLinks) await refreshRisks();
      },
      updateConfig: async (next) => {
        const cfg = await services.config.update(next);
        setCurrency(cfg.currency);
        setConfig(cfg);
        // A matrix change re-bands every stored risk server-side — refetch.
        await refreshRisks();
        return cfg;
      },
      uploadLogo: (file) => services.config.uploadLogo(file),
      createProject: async (input) => {
        const rec = await services.projects.create(input);
        upsertProject(rec);
        return rec;
      },
      updateProject: async (id, patch) => {
        const rec = await services.projects.update(id, patch);
        upsertProject(rec);
        return rec;
      },
      archiveProject: async (id) => {
        const rec = await services.projects.archive(id);
        upsertProject(rec);
        return rec;
      },
      restoreProject: async (id) => {
        const rec = await services.projects.restore(id);
        upsertProject(rec);
        return rec;
      },
    }),
    [loading, error, risks, activeRisks, changes, projects, activeProjects, pickerProjects, config, user, refresh],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
