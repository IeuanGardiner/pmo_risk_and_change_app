import { createHttpServices } from "./http/httpServices";
import { createMockServices } from "./mock/mockServices";
import type { Services } from "./services";

/* ----------------------------------------------------------------------------
   Service factory. Set VITE_API_BASE_URL (see .env.example) to point every
   service at a real backend; leave it empty to use the in-memory mock layer.
   -------------------------------------------------------------------------- */

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

/** Normalised API root, or null in mock mode. Also used by ./auth.ts. */
export const apiBaseUrl = baseUrl ? baseUrl.replace(/\/$/, "") : null;

export const services: Services = apiBaseUrl
  ? createHttpServices(apiBaseUrl)
  : createMockServices();

export const isMockMode = !apiBaseUrl;
