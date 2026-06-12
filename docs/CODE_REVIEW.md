# Code Review — June 2026 baseline

Full front-end review of the codebase ahead of Azure backend integration.
Verdict: **the codebase is in good shape.** The build and typecheck are clean,
`npm audit` reports zero vulnerabilities, the service layer is cleanly
abstracted for a real backend, and no critical front-end bugs were found.
Everything fixed in this review is listed below; the rest is forward guidance.

## 1. Bugs (fixed in this PR)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | High | `uploadLogo` in `src/api/http/httpServices.ts` called `fetch` directly without the `Authorization` bearer header, so logo uploads would fail with 401 against any authenticated backend. (Mock mode was unaffected.) | Auth headers now merged into the multipart request (Content-Type still omitted so the browser sets the boundary). |
| 2 | Low | `request()` in `httpServices.ts` / `httpAuth.ts` called `res.json()` unguarded; a 2xx response with a non-JSON body (e.g. an HTML error page from a proxy) surfaced as a cryptic `Unexpected token <` error. | JSON parsing wrapped; failures now throw `"<METHOD> <path> returned an invalid JSON response"`. |

Reproduction for #1: set `VITE_API_BASE_URL`, sign in, upload a logo in
Settings → Branding — the request carried no token.

Areas explicitly checked and found **correct**: global search keyboard
handling and result limiting, CSV escaping (quotes/commas/newlines + BOM),
date parsing/overdue logic, dialog escape/reset behaviour, change workflow
transitions, risk matrix banding from configured grid, sort/pagination hook,
mock-service validation rules.

## 2. Risk process change: "Reduced" removed

The draw-down ledger previously had three event types: Realised, Released and
Reduced. "Reduced" (estimate revised down while the risk stays open) overlapped
with "Released" and confused the financial story — in standard PMO/QSRA
contingency-drawdown practice a downward estimate revision **is** a partial
release of contingency back to the budget. The model is now:

- **Open exposure** — estimated total less realised and released to date
- **Realised** — the risk happened; cost incurred
- **Released** — value handed back (full or partial; a downward estimate
  revision is logged as a partial release)

Changes: event type removed from the domain model, lookups, update dialog,
dashboard drawdown chart, risk detail cost cards/chart, register CSV, reports
(the "Reduced" column became **Open Exposure**, which is more actionable), the
mock seed (old Reduced entries converted to partial releases) and the README
API contract (`reducedTotal` dropped from the `Risk` shape — backend builders
should note this).

The **response strategy** field (Avoid / Reduce / Transfer / Accept / Share) is
unchanged: that is the PRINCE2 / ISO 31000 treatment taxonomy and a separate
concept from the money ledger.

## 3. Refactoring opportunities (none blocking)

Prioritised by impact ÷ effort; all are safe to defer.

1. **Bundle size (medium impact, low effort).** Single 814 kB JS chunk; most
   of it is recharts. Route-level `React.lazy` on the dashboard/detail pages
   (or a `manualChunks` split for recharts) would roughly halve first paint.
2. **Dependency majors (medium impact, medium effort).** All deps are pinned
   one major behind: React 19, react-router 7, recharts 3, Vite 7+,
   TypeScript 6. Zero vulnerabilities today, so this is not urgent — do it as
   a dedicated upgrade PR, recharts 3 being the one with real API changes.
3. **`AppData` context granularity (low impact today).** One memoised value
   carries all data and ~20 mutation closures, so any data change re-renders
   every consumer. Fine at current scale; split data/actions contexts if the
   registers grow to thousands of rows.
4. **Linked-record counts in `ProjectsPage` (low).** Counts are computed by
   filtering all risks/changes per project row (O(projects × records)).
   Precompute `Map<projectId, count>` once per render if datasets get large.
5. **Sequential `refreshRisks()` refetches (low).** Two overlapping
   change-mutations could interleave their risk refetches (last write wins
   with near-fresh data). A request-id guard would make it airtight.

## 4. Azure backend integration readiness

### Already in good shape
- **Service abstraction**: `VITE_API_BASE_URL` flips every service from mock
  to HTTP with no code changes; the REST contract is documented in README.
- **Auth pattern**: bearer-token store, session restore on load, token cleared
  on failed restore, server-owned RBAC permissions consumed by the UI.
- **Server-owned derivations** (score, level, ledger totals, references) are
  clearly marked in the domain types, so the API contract is unambiguous.

### Recommendations before go-live (priority order)
1. **401 handling in the data layer** (high impact, low effort). `request()`
   treats 401 like any failure. When the token expires mid-session, the user
   gets cryptic error toasts. Detect 401 → clear token → route to sign-in.
2. **Token acquisition/refresh strategy** (high impact, medium effort). There
   is no refresh mechanism. If the backend uses Microsoft Entra ID, adopt
   `@azure/msal-browser` (handles refresh, silent renewal, secure caching) and
   drop the localStorage token; if using custom JWTs, add a refresh endpoint
   and retry-once-on-401 logic.
3. **Client telemetry/logging** (medium, low). No error reporting exists; the
   `ErrorBoundary` and toast errors are display-only. Wire Application
   Insights (`VITE_APPINSIGHTS_CONNECTION_STRING`) and log `getSession()` /
   `refresh()` failures, which are currently swallowed silently.
4. **Structured API errors** (medium, low). Errors are concatenated strings.
   Agree a `{ code, message }` error body with the backend and parse it, so
   the UI can distinguish validation vs permission vs server faults.
5. **Request timeouts** (low, low). `fetch` calls can hang indefinitely; add
   `AbortSignal.timeout(30_000)`.
6. **Token storage** (review). localStorage persists across restarts and is
   readable by any XSS payload. MSAL (rec. 2) resolves this; otherwise
   consider sessionStorage or an httpOnly cookie model (then add CSRF
   protection).
7. **Env documentation** (low). `.env.example` lists only
   `VITE_API_BASE_URL`; add Entra tenant/client IDs and telemetry vars as they
   are introduced.

None of these block pointing the app at an Azure API today — items 1–2 are the
ones to land before real users depend on it.
