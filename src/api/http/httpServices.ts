import type {
  AppUser,
  ChangeRequest,
  Project,
  RegulatoryPeriod,
  Risk,
} from "../../types/domain";
import type { ChangeService, ReferenceService, RiskService, Services } from "../services";

/* ============================================================================
   HTTP implementation — talks to the real backend. Activated by setting
   VITE_API_BASE_URL. The endpoint contract is documented in README.md.
   ========================================================================== */

async function request<V>(baseUrl: string, path: string, init?: RequestInit): Promise<V> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  if (res.status === 204) return undefined as V;
  return (await res.json()) as V;
}

export function createHttpServices(baseUrl: string): Services {
  const api = <V,>(path: string, init?: RequestInit) => request<V>(baseUrl, path, init);

  const risks: RiskService = {
    list: () => api<Risk[]>("/api/risks"),
    get: (ref) => api<Risk | null>(`/api/risks/${encodeURIComponent(ref)}`),
    create: (input) => api<Risk>("/api/risks", { method: "POST", body: JSON.stringify(input) }),
    update: (ref, patch) =>
      api<Risk>(`/api/risks/${encodeURIComponent(ref)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    close: (ref) => api<Risk>(`/api/risks/${encodeURIComponent(ref)}/close`, { method: "POST" }),
  };

  const changes: ChangeService = {
    list: () => api<ChangeRequest[]>("/api/changes"),
    get: (ref) => api<ChangeRequest | null>(`/api/changes/${encodeURIComponent(ref)}`),
    create: (input) =>
      api<ChangeRequest>("/api/changes", { method: "POST", body: JSON.stringify(input) }),
    update: (ref, patch) =>
      api<ChangeRequest>(`/api/changes/${encodeURIComponent(ref)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    transition: (ref, action, note) =>
      api<ChangeRequest>(`/api/changes/${encodeURIComponent(ref)}/transition`, {
        method: "POST",
        body: JSON.stringify({ action, note }),
      }),
  };

  const reference: ReferenceService = {
    projects: () => api<Project[]>("/api/projects"),
    regulatoryPeriods: () => api<RegulatoryPeriod[]>("/api/regulatory-periods"),
    currentUser: () => api<AppUser>("/api/me"),
  };

  return { risks, changes, reference };
}
