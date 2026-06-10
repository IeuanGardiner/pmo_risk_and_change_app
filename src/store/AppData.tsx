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
   AppData — single client-side cache over the service layer. Every mutation
   goes through the service (mock or HTTP) and the cache is updated from the
   service's response, so the UI behaves identically against a real backend.
   ========================================================================== */

interface AppDataValue {
  loading: boolean;
  error: string | null;
  risks: Risk[];
  changes: ChangeRequest[];
  projects: Project[];
  periods: RegulatoryPeriod[];
  user: AppUser | null;
  refresh: () => Promise<void>;
  createRisk: (input: RiskInput) => Promise<Risk>;
  updateRisk: (ref: string, patch: Partial<RiskInput>) => Promise<Risk>;
  closeRisk: (ref: string) => Promise<Risk>;
  createChange: (input: ChangeInput) => Promise<ChangeRequest>;
  updateChange: (ref: string, patch: Partial<ChangeInput>) => Promise<ChangeRequest>;
  transitionChange: (
    ref: string,
    action: ChangeTransitionAction,
    note?: string,
  ) => Promise<ChangeRequest>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<RegulatoryPeriod[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [riskList, changeList, projectList, periodList, currentUser] = await Promise.all([
        services.risks.list(),
        services.changes.list(),
        services.reference.projects(),
        services.reference.regulatoryPeriods(),
        services.reference.currentUser(),
      ]);
      setRisks(riskList);
      setChanges(changeList);
      setProjects(projectList);
      setPeriods(periodList);
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

  /** Risk↔change links are bidirectional; refetch risks so both sides agree. */
  const refreshRisks = async () => setRisks(await services.risks.list());

  const value = useMemo<AppDataValue>(
    () => ({
      loading,
      error,
      risks,
      changes,
      projects,
      periods,
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
      closeRisk: async (ref) => {
        const rec = await services.risks.close(ref);
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
      transitionChange: async (ref, action, note) => {
        const rec = await services.changes.transition(ref, action, note);
        upsertChange(rec);
        return rec;
      },
    }),
    [loading, error, risks, changes, projects, periods, user, refresh],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
