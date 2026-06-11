import type { AppConfig } from "../../types/config";
import { DEFAULT_CONFIG, sanitizeConfig } from "../../types/config";
import type {
  ChangeInput,
  ChangeRequest,
  ChangeStatus,
  ChangeTransitionAction,
  CostProfile,
  Project,
  Risk,
  RiskInput,
} from "../../types/domain";
import { calcLevel, calcScore } from "../../types/lookups";
import { isMonthKey, MAX_PROFILE_MONTHS } from "../../utils/calendar";
import type {
  ChangeService,
  ConfigService,
  ProjectService,
  ReferenceService,
  RiskService,
  Services,
} from "../services";
import { CURRENT_USER, PROJECTS, SEED_CHANGES, SEED_RISKS } from "./seed";

/* ============================================================================
   Mock implementation — in-memory store with simulated network latency so the
   UI exercises real loading states. Configuration is persisted to
   localStorage so client customisations survive a reload. Swapped out for the
   HTTP services when VITE_API_BASE_URL is set (see ../index.ts).
   ========================================================================== */

const LATENCY_MS = 350;
const delay = <V,>(value: V): Promise<V> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V;
const nowIso = () => new Date().toISOString();

const nextRef = (prefix: string, existing: string[]): string => {
  const max = existing.reduce((acc, ref) => {
    const n = parseInt(ref.replace(/^\D+/, ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
};

/* ---- Config persistence (versioned; bump the key on breaking changes) ---- */
const CONFIG_STORAGE_KEY = "riskshield.config.v1";

function loadStoredConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return clone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw) as { version?: number; config?: unknown };
    return sanitizeConfig(parsed.config);
  } catch {
    return clone(DEFAULT_CONFIG);
  }
}

function persistConfig(config: AppConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ version: 1, config }));
  } catch {
    // Storage unavailable (private mode, quota) — config still applies in-memory.
  }
}

/* Logo upload constraints — mirrored by the backend contract in the README. */
export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_ACCEPT = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

/** Validate an uploaded logo (type + size). Returns an error message or null. */
export function logoUploadError(file: File): string | null {
  if (!LOGO_ACCEPT.includes(file.type)) return "Logo must be a PNG, JPEG, SVG or WebP image";
  if (file.size > LOGO_MAX_BYTES) return "Logo must be 512 KB or smaller";
  return null;
}

/** Reject obviously broken profiles before they reach the store. */
const profileError = (p: CostProfile | undefined): string | null => {
  if (!p) return null;
  if (!isMonthKey(p.startMonth)) return "Cost profile start month must be in yyyy-mm format";
  if (p.periods.length < 1 || p.periods.length > MAX_PROFILE_MONTHS) {
    return `Cost profile must cover between 1 and ${MAX_PROFILE_MONTHS} months`;
  }
  return null;
};

/* ---- Workflow rules: which action is legal from which status ------------- */
export const TRANSITIONS: Record<ChangeTransitionAction, { from: ChangeStatus[]; to: ChangeStatus }> = {
  submit: { from: ["Draft"], to: "Submitted" },
  startReview: { from: ["Submitted"], to: "Under Review" },
  approve: { from: ["Under Review", "Submitted"], to: "Approved" },
  reject: { from: ["Under Review", "Submitted"], to: "Rejected" },
  implement: { from: ["Approved"], to: "Implemented" },
  reopen: { from: ["Rejected"], to: "Draft" },
};

export function createMockServices(): Services {
  let config: AppConfig = loadStoredConfig();
  let risks: Risk[] = clone(SEED_RISKS).map((r) => ({
    ...r,
    level: calcLevel(config.matrix, r.likelihood, r.impact),
  }));
  let changes: ChangeRequest[] = clone(SEED_CHANGES);
  let projects: Project[] = clone(PROJECTS);

  const setArchived = (ref: string, archived: boolean): Promise<Risk> => {
    const existing = risks.find((r) => r.riskReference === ref);
    if (!existing) return Promise.reject(new Error(`Risk ${ref} not found`));
    const merged: Risk = { ...existing, archived, updatedAt: nowIso() };
    risks = risks.map((r) => (r.riskReference === ref ? merged : r));
    return delay(clone(merged));
  };

  const riskService: RiskService = {
    list: () => delay(clone(risks)),
    get: (ref) => delay(clone(risks.find((r) => r.riskReference === ref) ?? null)),
    create: (input: RiskInput) => {
      const invalid = profileError(input.costProfile);
      if (invalid) return Promise.reject(new Error(invalid));
      const rec: Risk = {
        ...input,
        riskReference: nextRef("R", risks.map((r) => r.riskReference)),
        score: calcScore(input.likelihood, input.impact),
        level: calcLevel(config.matrix, input.likelihood, input.impact),
        archived: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      risks = [...risks, rec];
      return delay(clone(rec));
    },
    update: (ref, patch) => {
      const existing = risks.find((r) => r.riskReference === ref);
      if (!existing) return Promise.reject(new Error(`Risk ${ref} not found`));
      const invalid = profileError(patch.costProfile);
      if (invalid) return Promise.reject(new Error(invalid));
      const merged: Risk = {
        ...existing,
        ...patch,
        score: calcScore(patch.likelihood ?? existing.likelihood, patch.impact ?? existing.impact),
        level: calcLevel(
          config.matrix,
          patch.likelihood ?? existing.likelihood,
          patch.impact ?? existing.impact,
        ),
        updatedAt: nowIso(),
      };
      risks = risks.map((r) => (r.riskReference === ref ? merged : r));
      return delay(clone(merged));
    },
    close: (ref) => riskService.update(ref, { status: "Closed" }),
    archive: (ref) => setArchived(ref, true),
    restore: (ref) => setArchived(ref, false),
  };

  const changeService: ChangeService = {
    list: () => delay(clone(changes)),
    get: (ref) => delay(clone(changes.find((c) => c.changeReference === ref) ?? null)),
    create: (input: ChangeInput) => {
      const invalid = profileError(input.costProfile);
      if (invalid) return Promise.reject(new Error(invalid));
      const rec: ChangeRequest = {
        ...input,
        changeReference: nextRef("C", changes.map((c) => c.changeReference)),
        status: "Draft",
        approvalHistory: [{ status: "Draft", actor: CURRENT_USER.name, date: nowIso() }],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      changes = [...changes, rec];
      syncRiskLinks(rec.changeReference, rec.linkedRiskRefs);
      return delay(clone(rec));
    },
    update: (ref, patch) => {
      const existing = changes.find((c) => c.changeReference === ref);
      if (!existing) return Promise.reject(new Error(`Change ${ref} not found`));
      const invalid = profileError(patch.costProfile);
      if (invalid) return Promise.reject(new Error(invalid));
      const merged: ChangeRequest = { ...existing, ...patch, updatedAt: nowIso() };
      changes = changes.map((c) => (c.changeReference === ref ? merged : c));
      if (patch.linkedRiskRefs) syncRiskLinks(ref, patch.linkedRiskRefs);
      return delay(clone(merged));
    },
    transition: (ref, action, note) => {
      const existing = changes.find((c) => c.changeReference === ref);
      if (!existing) return Promise.reject(new Error(`Change ${ref} not found`));
      const rule = TRANSITIONS[action];
      if (!rule.from.includes(existing.status)) {
        return Promise.reject(
          new Error(`Cannot ${action} a change in status "${existing.status}"`),
        );
      }
      const merged: ChangeRequest = {
        ...existing,
        status: rule.to,
        approvalHistory: [
          ...existing.approvalHistory,
          { status: rule.to, actor: CURRENT_USER.name, date: nowIso(), note },
        ],
        updatedAt: nowIso(),
      };
      changes = changes.map((c) => (c.changeReference === ref ? merged : c));
      return delay(clone(merged));
    },
    delete: (ref) => {
      const existing = changes.find((c) => c.changeReference === ref);
      if (!existing) return Promise.reject(new Error(`Change ${ref} not found`));
      if (existing.status !== "Draft") {
        return Promise.reject(
          new Error(`Only Draft changes can be deleted — ${ref} is "${existing.status}"`),
        );
      }
      changes = changes.filter((c) => c.changeReference !== ref);
      syncRiskLinks(ref, []);
      return delay(undefined);
    },
  };

  /** Keep risk.linkedChangeRefs in step with change.linkedRiskRefs. */
  function syncRiskLinks(changeRef: string, linkedRiskRefs: string[]) {
    risks = risks.map((r) => {
      const shouldLink = linkedRiskRefs.includes(r.riskReference);
      const isLinked = r.linkedChangeRefs.includes(changeRef);
      if (shouldLink && !isLinked) {
        return { ...r, linkedChangeRefs: [...r.linkedChangeRefs, changeRef] };
      }
      if (!shouldLink && isLinked) {
        return { ...r, linkedChangeRefs: r.linkedChangeRefs.filter((c) => c !== changeRef) };
      }
      return r;
    });
  }

  const patchProject = (id: string, patch: Partial<Project>): Promise<Project> => {
    const existing = projects.find((p) => p.id === id);
    if (!existing) return Promise.reject(new Error(`Project ${id} not found`));
    const merged: Project = { ...existing, ...patch };
    projects = projects.map((p) => (p.id === id ? merged : p));
    return delay(clone(merged));
  };

  const projectService: ProjectService = {
    list: () => delay(clone(projects)),
    create: (input) => {
      const rec: Project = {
        id: nextRef("prj-", projects.map((p) => p.id)),
        name: input.name.trim(),
        code: input.code.trim(),
        archived: false,
      };
      projects = [...projects, rec];
      return delay(clone(rec));
    },
    update: (id, patch) => patchProject(id, patch),
    archive: (id) => patchProject(id, { archived: true }),
    restore: (id) => patchProject(id, { archived: false }),
  };

  const configService: ConfigService = {
    get: () => delay(clone(config)),
    update: (next) => {
      config = sanitizeConfig(next);
      persistConfig(config);
      // The matrix may have changed — recompute every stored risk level, just
      // as a real backend must on PUT /api/config.
      risks = risks.map((r) => ({
        ...r,
        level: calcLevel(config.matrix, r.likelihood, r.impact),
      }));
      return delay(clone(config));
    },
    uploadLogo: (file) => {
      const error = logoUploadError(file);
      if (error) return Promise.reject(new Error(error));
      // No backend in mock mode — inline the image as a data URL so it survives
      // a reload via the localStorage-persisted config.
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: String(reader.result) });
        reader.onerror = () => reject(new Error("Could not read the selected file"));
        reader.readAsDataURL(file);
      });
    },
  };

  const referenceService: ReferenceService = {
    currentUser: () => delay(clone(CURRENT_USER)),
  };

  return {
    risks: riskService,
    changes: changeService,
    projects: projectService,
    config: configService,
    reference: referenceService,
  };
}
