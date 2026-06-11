import { createHttpAuthServices } from "./http/httpAuth";
import { createMockAuthServices } from "./mock/mockAuth";
import type { AuthServices } from "./authServices";
import { apiBaseUrl } from "./index";

/* ----------------------------------------------------------------------------
   Auth service factory — mirrors ./index.ts: VITE_API_BASE_URL switches the
   auth layer from the localStorage mock to the real backend.
   -------------------------------------------------------------------------- */

export const authServices: AuthServices = apiBaseUrl
  ? createHttpAuthServices(apiBaseUrl)
  : createMockAuthServices();
