import { createHttpServices } from "./http/httpServices";
import { createMockServices } from "./mock/mockServices";
import type { Services } from "./services";

/* ----------------------------------------------------------------------------
   Service factory. Set VITE_API_BASE_URL (see .env.example) to point every
   service at a real backend; leave it empty to use the in-memory mock layer.
   -------------------------------------------------------------------------- */

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export const services: Services = baseUrl
  ? createHttpServices(baseUrl.replace(/\/$/, ""))
  : createMockServices();

export const isMockMode = !baseUrl;
