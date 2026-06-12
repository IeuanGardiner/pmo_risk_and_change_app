import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./design-system/tokens/tokens.css";
import "./design-system/components/styles.css";
import {
  applyThemeToDocument,
  loadCachedBranding,
  loadThemePreference,
  resolveScheme,
} from "./theme/branding";

// Pre-paint: apply the last-known scheme + accent before React renders so the
// app never flashes the default branding/colour scheme on a cold load.
const cached = loadCachedBranding();
applyThemeToDocument(resolveScheme(loadThemePreference(cached.defaultTheme)), cached.brandColor);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
