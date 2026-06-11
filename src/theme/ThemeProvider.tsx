import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BrandingConfig, ThemeMode } from "../types/config";
import { DEFAULT_BRANDING } from "../types/config";
import {
  applyThemeToDocument,
  cacheBranding,
  loadThemePreference,
  resolveScheme,
  saveThemePreference,
  systemPrefersDark,
} from "./branding";
import { CSS_VARS, TOKEN_FALLBACKS } from "./tokens";

/* ============================================================================
   ThemeProvider — owns the active colour scheme and the deployment accent.

   - `preference` is the user's choice (light/dark/system), persisted to
     localStorage; it falls back to the branding's defaultTheme on first run.
   - `scheme` is the concrete light/dark actually rendered (system resolved).
   - On every change it writes `data-theme` + `--brand` to <html>, then reads
     the now-current computed values back into `chartColors` — concrete colours
     for Recharts, which cannot consume var() in SVG presentation attributes.
   ========================================================================== */

export type ChartColors = Record<keyof typeof CSS_VARS, string>;

interface ThemeValue {
  preference: ThemeMode;
  scheme: "light" | "dark";
  setPreference: (mode: ThemeMode) => void;
  /** Quick toggle between light and dark (collapses "system" to its opposite). */
  toggle: () => void;
  /** Concrete, theme-resolved colours for chart libraries. */
  chartColors: ChartColors;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function readChartColors(): ChartColors {
  const out = {} as ChartColors;
  const cs = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  (Object.keys(CSS_VARS) as (keyof typeof CSS_VARS)[]).forEach((key) => {
    const resolved = cs?.getPropertyValue(CSS_VARS[key]).trim();
    out[key] = resolved || TOKEN_FALLBACKS[key];
  });
  return out;
}

export function ThemeProvider({
  branding,
  children,
}: {
  /** Live branding from config; null until config has loaded (uses defaults). */
  branding: BrandingConfig | null;
  children: ReactNode;
}) {
  const brandColor = branding?.brandColor ?? DEFAULT_BRANDING.brandColor;
  const defaultTheme = branding?.defaultTheme ?? DEFAULT_BRANDING.defaultTheme;

  const [preference, setPreferenceState] = useState<ThemeMode>(() =>
    loadThemePreference(defaultTheme),
  );
  const [scheme, setScheme] = useState<"light" | "dark">(() => resolveScheme(preference));
  const [chartColors, setChartColors] = useState<ChartColors>(() => readChartColors());

  // Apply scheme + accent to the document and re-resolve chart colours together,
  // so consumers always read values that match what's painted.
  useLayoutEffect(() => {
    const next = resolveScheme(preference);
    setScheme(next);
    applyThemeToDocument(next, brandColor);
    setChartColors(readChartColors());
  }, [preference, brandColor]);

  // Keep the cached branding fresh for the next cold start (splash/pre-paint).
  useEffect(() => {
    if (branding) cacheBranding(branding);
  }, [branding]);

  // Follow the OS when the user has chosen "system".
  useEffect(() => {
    if (preference !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = systemPrefersDark() ? "dark" : "light";
      setScheme(next);
      applyThemeToDocument(next, brandColor);
      setChartColors(readChartColors());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, brandColor]);

  const setPreference = useCallback((mode: ThemeMode) => {
    saveThemePreference(mode);
    setPreferenceState(mode);
  }, []);

  const toggle = useCallback(() => {
    setPreference(scheme === "dark" ? "light" : "dark");
  }, [scheme, setPreference]);

  const value = useMemo<ThemeValue>(
    () => ({ preference, scheme, setPreference, toggle, chartColors }),
    [preference, scheme, setPreference, toggle, chartColors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
