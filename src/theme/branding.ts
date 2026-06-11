import type { BrandingConfig, ThemeMode } from "../types/config";
import { DEFAULT_BRANDING, sanitizeBranding } from "../types/config";

/* ============================================================================
   Branding + theme persistence helpers.

   Two small pieces of state live in localStorage so the app can paint with the
   right identity *before* the config service responds (avoiding a flash of the
   default branding / wrong colour scheme):

   - the last-known branding (name, logo, accent), cached whenever config loads
   - the user's explicit colour-scheme preference (light/dark/system)

   applyThemeToDocument() writes the resolved values onto <html> and is called
   both from the pre-paint bootstrap (main.tsx) and from ThemeProvider.
   ========================================================================== */

const BRANDING_CACHE_KEY = "riskshield.branding.v1";
const THEME_PREF_KEY = "riskshield.theme.v1";

export function loadCachedBranding(): BrandingConfig {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    return raw ? sanitizeBranding(JSON.parse(raw)) : { ...DEFAULT_BRANDING };
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export function cacheBranding(branding: BrandingConfig): void {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {
    /* storage unavailable — branding still applies in-memory this session */
  }
}

export function loadThemePreference(fallback: ThemeMode): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_PREF_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveThemePreference(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_PREF_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** A preference plus the OS setting collapse to the concrete scheme to render. */
export function resolveScheme(pref: ThemeMode): "light" | "dark" {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

/** Apply the active scheme + accent colour to <html>. Idempotent. */
export function applyThemeToDocument(scheme: "light" | "dark", brandColor: string): void {
  const root = document.documentElement;
  root.dataset.theme = scheme;
  root.style.setProperty("--brand", brandColor);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", scheme === "dark" ? "#121317" : brandColor);
}
