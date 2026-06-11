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

export interface AppConfig {
  projectRiskCategories: string[];
  programRiskCategories: string[];
  changeCategories: string[];
  workstreams: string[];
  /** Risk workflow statuses. "Open" and "Closed" are always present. */
  riskStatuses: string[];
  matrix: MatrixGrid;
  currency: CurrencyConfig;
}

/** Statuses the workflow depends on and that admins cannot remove. */
export const SYSTEM_RISK_STATUSES = ["Open", "Closed"];

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
    riskStatuses: sanitizeStatuses(r.riskStatuses),
    matrix: sanitizeMatrix(r.matrix),
    currency: sanitizeCurrency(r.currency),
  };
}
