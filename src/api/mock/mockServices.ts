import type {
  ChangeInput,
  ChangeRequest,
  ChangeStatus,
  ChangeTransitionAction,
  Risk,
  RiskInput,
} from "../../types/domain";
import { calcLevel, calcScore } from "../../types/lookups";
import type { ChangeService, ReferenceService, RiskService, Services } from "../services";
import {
  CURRENT_USER,
  PROJECTS,
  REGULATORY_PERIODS,
  SEED_CHANGES,
  SEED_RISKS,
} from "./seed";

/* ============================================================================
   Mock implementation — in-memory store with simulated network latency so the
   UI exercises real loading states. Swapped out for the HTTP services when
   VITE_API_BASE_URL is set (see ../index.ts).
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
  let risks: Risk[] = clone(SEED_RISKS);
  let changes: ChangeRequest[] = clone(SEED_CHANGES);

  const riskService: RiskService = {
    list: () => delay(clone(risks)),
    get: (ref) => delay(clone(risks.find((r) => r.riskReference === ref) ?? null)),
    create: (input: RiskInput) => {
      const rec: Risk = {
        ...input,
        riskReference: nextRef("R", risks.map((r) => r.riskReference)),
        score: calcScore(input.likelihood, input.impact),
        level: calcLevel(input.likelihood, input.impact),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      risks = [...risks, rec];
      return delay(clone(rec));
    },
    update: (ref, patch) => {
      const existing = risks.find((r) => r.riskReference === ref);
      if (!existing) return Promise.reject(new Error(`Risk ${ref} not found`));
      const merged: Risk = {
        ...existing,
        ...patch,
        score: calcScore(patch.likelihood ?? existing.likelihood, patch.impact ?? existing.impact),
        level: calcLevel(patch.likelihood ?? existing.likelihood, patch.impact ?? existing.impact),
        updatedAt: nowIso(),
      };
      risks = risks.map((r) => (r.riskReference === ref ? merged : r));
      return delay(clone(merged));
    },
    close: (ref) => riskService.update(ref, { status: "Closed" }),
  };

  const changeService: ChangeService = {
    list: () => delay(clone(changes)),
    get: (ref) => delay(clone(changes.find((c) => c.changeReference === ref) ?? null)),
    create: (input: ChangeInput) => {
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

  const referenceService: ReferenceService = {
    projects: () => delay(clone(PROJECTS)),
    regulatoryPeriods: () => delay(clone(REGULATORY_PERIODS)),
    currentUser: () => delay(clone(CURRENT_USER)),
  };

  return { risks: riskService, changes: changeService, reference: referenceService };
}
