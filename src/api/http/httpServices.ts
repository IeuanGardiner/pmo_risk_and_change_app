import type { AppConfig } from "../../types/config";
import type { AppUser, ChangeRequest, Project, Risk } from "../../types/domain";
import type {
  ChangeService,
  ConfigService,
  ProjectService,
  ReferenceService,
  RiskService,
  Services,
} from "../services";
import { authHeaders } from "./authToken";

/* ============================================================================
   HTTP implementation — talks to the real backend. Activated by setting
   VITE_API_BASE_URL. The endpoint contract is documented in README.md.
   ========================================================================== */

async function request<V>(baseUrl: string, path: string, init?: RequestInit): Promise<V> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
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
    addEvent: (ref, event) =>
      api<Risk>(`/api/risks/${encodeURIComponent(ref)}/events`, {
        method: "POST",
        body: JSON.stringify(event),
      }),
    addAction: (ref, input) =>
      api<Risk>(`/api/risks/${encodeURIComponent(ref)}/actions`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateAction: (ref, actionId, patch) =>
      api<Risk>(
        `/api/risks/${encodeURIComponent(ref)}/actions/${encodeURIComponent(actionId)}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      ),
    deleteAction: (ref, actionId) =>
      api<Risk>(
        `/api/risks/${encodeURIComponent(ref)}/actions/${encodeURIComponent(actionId)}`,
        { method: "DELETE" },
      ),
    addReview: (ref, input) =>
      api<Risk>(`/api/risks/${encodeURIComponent(ref)}/reviews`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    close: (ref) => api<Risk>(`/api/risks/${encodeURIComponent(ref)}/close`, { method: "POST" }),
    archive: (ref) =>
      api<Risk>(`/api/risks/${encodeURIComponent(ref)}/archive`, { method: "POST" }),
    restore: (ref) =>
      api<Risk>(`/api/risks/${encodeURIComponent(ref)}/restore`, { method: "POST" }),
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
    transition: (ref, action, note, date) =>
      api<ChangeRequest>(`/api/changes/${encodeURIComponent(ref)}/transition`, {
        method: "POST",
        body: JSON.stringify({ action, note, date }),
      }),
    delete: (ref) =>
      api<void>(`/api/changes/${encodeURIComponent(ref)}`, { method: "DELETE" }),
  };

  const projects: ProjectService = {
    list: () => api<Project[]>("/api/projects"),
    create: (input) =>
      api<Project>("/api/projects", { method: "POST", body: JSON.stringify(input) }),
    update: (id, patch) =>
      api<Project>(`/api/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    archive: (id) =>
      api<Project>(`/api/projects/${encodeURIComponent(id)}/archive`, { method: "POST" }),
    restore: (id) =>
      api<Project>(`/api/projects/${encodeURIComponent(id)}/restore`, { method: "POST" }),
  };

  const config: ConfigService = {
    get: () => api<AppConfig>("/api/config"),
    update: (next) => api<AppConfig>("/api/config", { method: "PUT", body: JSON.stringify(next) }),
    uploadLogo: async (file) => {
      // Multipart upload — let the browser set the multipart boundary; do not
      // send the JSON Content-Type used by the rest of the API.
      const form = new FormData();
      form.append("logo", file);
      const res = await fetch(`${baseUrl}/api/branding/logo`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`POST /api/branding/logo failed (${res.status}): ${body}`);
      }
      return (await res.json()) as { url: string };
    },
  };

  const reference: ReferenceService = {
    currentUser: () => api<AppUser>("/api/me"),
  };

  return { risks, changes, projects, config, reference };
}
