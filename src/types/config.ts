import type { Rating, RiskLevel } from "./domain";

/* ============================================================================
   AppConfig — the client-tailorable configuration: lookup lists, the 5×5
   scoring matrix and the display currency. Served by ConfigService (mock:
   localStorage; live: GET/PUT /api/config) so each client deployment can be
   tuned without code changes.
   ========================================================================== */

/** grid[impact][likelihood] -> level. */
export type MatrixGrid = Record<Rating, Record<Rating, RiskLevel>>;

export interface CurrencyConfig {
  code: string;
  symbol: string;
}

/** Which colour scheme to boot into. "system" follows the OS preference. */
export type ThemeMode = "light" | "dark" | "system";

/* ----------------------------------------------------------------------------
   White-label branding — lets each deployment present as the client's own
   product (name, strapline, logo and accent colour) without code changes.
   `logoUrl` may be an absolute/relative URL served by the backend or a data:
   URL (mock mode persists the uploaded image straight into localStorage).
   -------------------------------------------------------------------------- */
export interface BrandingConfig {
  /** Product name shown in the sidebar, splash screen and browser tab. */
  appName: string;
  /** Short strapline under the product name. */
  tagline: string;
  /** Primary accent colour (hex). Light/dark shades are derived from it. */
  brandColor: string;
  /** Uploaded logo (backend URL or data: URL); null falls back to the mark. */
  logoUrl: string | null;
  /** Colour scheme a fresh browser starts in before the user overrides it. */
  defaultTheme: ThemeMode;
}

export interface AppConfig {
  projectRiskCategories: string[];
  programRiskCategories: string[];
  changeCategories: string[];
  workstreams: string[];
  /** Project type lookup, offered when maintaining projects. */
  projectTypes: string[];
  /** Risk workflow statuses. "Open" and "Closed" are always present. */
  riskStatuses: string[];
  matrix: MatrixGrid;
  currency: CurrencyConfig;
  branding: BrandingConfig;
}

/** Statuses the workflow depends on and that admins cannot remove. */
export const SYSTEM_RISK_STATUSES = ["Open", "Closed"];

/** Curated accent presets offered in Settings (label + hex). */
export const BRAND_PRESETS: { label: string; value: string }[] = [
  { label: "Azure", value: "#0F6CBD" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Violet", value: "#7C3AED" },
  { label: "Teal", value: "#0D9488" },
  { label: "Emerald", value: "#059669" },
  { label: "Amber", value: "#D97706" },
  { label: "Rose", value: "#E11D48" },
  { label: "Slate", value: "#475569" },
];

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: "RiskShield",
  tagline: "Risk & Change",
  brandColor: "#0F6CBD",
  logoUrl: null,
  defaultTheme: "light",
};

const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];
/** Accepts #rgb / #rrggbb (with or without leading #) so the colour input and
    any backend payload are both tolerated. */
const HEX_RE = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const normalizeHex = (v: unknown, fallback: string): string => {
  if (typeof v === "string" && HEX_RE.test(v.trim())) {
    const h = v.trim();
    return h.startsWith("#") ? h : `#${h}`;
  }
  return fallback;
};

export const CURRENCIES: CurrencyConfig[] = [
  { code: "GBP", symbol: "£" },
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
];

/* Impact-weighted, monotonic default band matrix. */
const DEFAULT_MATRIX: MatrixGrid = {
  5: { 1: "High", 2: "Critical", 3: "Critical", 4: "Critical", 5: "Critical" },
  4: { 1: "Medium", 2: "High", 3: "High", 4: "Critical", 5: "Critical" },
  3: { 1: "Low", 2: "Medium", 3: "High", 4: "High", 5: "Critical" },
  2: { 1: "Low", 2: "Low", 3: "Medium", 4: "Medium", 5: "High" },
  1: { 1: "Low", 2: "Low", 3: "Low", 4: "Medium", 5: "Medium" },
};

export const DEFAULT_CONFIG: AppConfig = {
  projectRiskCategories: [
    "Safety",
    "Structural",
    "Supply",
    "Regulatory",
    "Quality",
    "Commercial",
    "Schedule",
  ],
  programRiskCategories: [
    "Supply Chain",
    "Economic",
    "Regulatory",
    "Environmental",
    "Resourcing",
    "Political",
  ],
  changeCategories: ["Scope", "Design", "Schedule", "Cost", "Regulatory", "Process"],
  projectTypes: ["Infrastructure", "Buildings", "Highways", "Rail", "Water", "Energy", "Other"],
  workstreams: [
    "Civils & Structures",
    "Mechanical",
    "Electrical & Controls",
    "Process",
    "Commissioning",
    "Commercial",
    "Consents & Environment",
  ],
  riskStatuses: ["Open", "Closed"],
  matrix: DEFAULT_MATRIX,
  currency: CURRENCIES[0],
  branding: DEFAULT_BRANDING,
};

const VALID_LEVELS: RiskLevel[] = ["Critical", "High", "Medium", "Low"];
const RATINGS: Rating[] = [1, 2, 3, 4, 5];

const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V;

const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && x.trim() !== "");

function sanitizeMatrix(raw: unknown): MatrixGrid {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    Record<string, unknown>
  >;
  const grid = {} as MatrixGrid;
  for (const impact of RATINGS) {
    grid[impact] = {} as Record<Rating, RiskLevel>;
    for (const likelihood of RATINGS) {
      const v = source[impact]?.[likelihood];
      grid[impact][likelihood] = VALID_LEVELS.includes(v as RiskLevel)
        ? (v as RiskLevel)
        : DEFAULT_MATRIX[impact][likelihood];
    }
  }
  return grid;
}

/** Always keep the workflow's well-known statuses, de-duplicated, order-stable. */
function sanitizeStatuses(raw: unknown): string[] {
  const base = isStringList(raw)
    ? [...new Set((raw as string[]).map((s) => s.trim()).filter(Boolean))]
    : clone(DEFAULT_CONFIG.riskStatuses);
  if (!base.includes("Open")) base.unshift("Open");
  if (!base.includes("Closed")) base.push("Closed");
  return base;
}

function sanitizeCurrency(raw: unknown): CurrencyConfig {
  if (typeof raw === "object" && raw !== null) {
    const { code, symbol } = raw as Record<string, unknown>;
    if (typeof code === "string" && code.trim() && typeof symbol === "string" && symbol.trim()) {
      return { code: code.trim(), symbol: symbol.trim() };
    }
  }
  return clone(DEFAULT_CONFIG.currency);
}

/** A short, safe string (trimmed, length-capped) or the fallback. */
function sanitizeText(raw: unknown, fallback: string, max = 60): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, max);
  return fallback;
}

/** Accept http(s)/relative/data image URLs only; anything else (incl. js:)
    is dropped so a hostile payload can't inject a non-image src. */
function sanitizeLogoUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  if (/^data:image\//i.test(v)) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;
  return null;
}

export function sanitizeBranding(raw: unknown): BrandingConfig {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const defaultTheme = THEME_MODES.includes(r.defaultTheme as ThemeMode)
    ? (r.defaultTheme as ThemeMode)
    : DEFAULT_BRANDING.defaultTheme;
  return {
    appName: sanitizeText(r.appName, DEFAULT_BRANDING.appName),
    tagline: sanitizeText(r.tagline, DEFAULT_BRANDING.tagline),
    brandColor: normalizeHex(r.brandColor, DEFAULT_BRANDING.brandColor),
    logoUrl: sanitizeLogoUrl(r.logoUrl),
    defaultTheme,
  };
}

/** Deep-validate an untrusted payload (localStorage / API), merging anything
    malformed back to the defaults so the app never boots with broken config. */
export function sanitizeConfig(raw: unknown): AppConfig {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    projectRiskCategories: isStringList(r.projectRiskCategories)
      ? [...(r.projectRiskCategories as string[])]
      : clone(DEFAULT_CONFIG.projectRiskCategories),
    programRiskCategories: isStringList(r.programRiskCategories)
      ? [...(r.programRiskCategories as string[])]
      : clone(DEFAULT_CONFIG.programRiskCategories),
    changeCategories: isStringList(r.changeCategories)
      ? [...(r.changeCategories as string[])]
      : clone(DEFAULT_CONFIG.changeCategories),
    workstreams: isStringList(r.workstreams)
      ? [...(r.workstreams as string[])]
      : clone(DEFAULT_CONFIG.workstreams),
    projectTypes: isStringList(r.projectTypes)
      ? [...(r.projectTypes as string[])]
      : clone(DEFAULT_CONFIG.projectTypes),
    riskStatuses: sanitizeStatuses(r.riskStatuses),
    matrix: sanitizeMatrix(r.matrix),
    currency: sanitizeCurrency(r.currency),
    branding: sanitizeBranding(r.branding),
  };
}
