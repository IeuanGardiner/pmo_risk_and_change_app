# RiskShield — Project & Programme Risk + Change

A complete, client-tailorable front-end for managing **risks** and **change requests**
across capital projects and programmes. React + TypeScript + Vite, styled with
Fluent-aligned design tokens, and ready for backend integration: it runs on a
built-in mock data layer today and switches to a real REST API with a single
environment variable.

## Features

**Risk module**
- Risk dashboard — KPI cards, interactive 5×5 risk matrix (cell counts link to a
  filtered register), "Attention Needed" panel for overdue reviews/targets,
  top-priority risks, category distribution, portfolio drawdown chart
- Risk register — Project/Programme scope toggle, level tabs, status & project
  filters, sortable columns, pagination, archived-record toggle, CSV export
- 2-step "Log Risk" wizard with a calendar-anchored cost profile: choose a start
  month and duration (1–60 months), Even or Custom distribution
- Risk detail — severity banner, full attributes, mitigation, next review date,
  linked change requests, drawdown chart, Close / Archive / Restore actions
- Archive (soft-delete) with restore — archived risks keep their history but are
  excluded from dashboards and default views

**Change module**
- Change dashboard — pipeline by status, pending/approved cost impact,
  schedule impact, cost by category, recent activity
- Change register — scope toggle, status tabs, priority filter, sortable
  columns, pagination, CSV export
- 2-step "Raise Change" wizard — classification, justification, risk linking,
  then cost & schedule impact with the same calendar-anchored profile
- Change detail — workflow actions (Submit → Review → Approve/Reject →
  Implement, Reopen) with decision notes, full approval history timeline,
  linked risks, cost impact profile, **Delete Draft** for unsubmitted changes
- Risk ↔ change linking is bidirectional and visible from both detail views

**Branding & appearance (Settings)**
- White-label the app per client: product name, strapline and logo (upload a
  PNG/JPEG/SVG/WebP, ≤512 KB) — e.g. rename "RiskShield" to "Company X Risk &
  Change Portal". The name flows into the sidebar, splash screen and browser tab
- Accent colour: pick a preset or any custom hex; light/dark shades are derived
  automatically (via CSS `color-mix`) so a single colour adapts to either scheme
- **Light / dark mode** with a one-click toggle in the sidebar. A deployment
  *default* scheme (light/dark/match-system) is saved in the config; each user
  can override it for their own browser. Theme + accent are applied before first
  paint (from a cached copy) to avoid a flash of the wrong colours

**Customisation (Settings)**
- Add / rename / delete risk categories, programme categories, workstreams and
  change categories — values in use by records are protected
- Editable 5×5 scoring matrix: click a cell to re-band it per client risk
  appetite; saving recalculates every stored risk's level
- Project management — add, rename, archive and restore projects
- Display currency (GBP, EUR, USD, AUD, CAD) applied to every monetary value
- In mock mode all configuration persists to localStorage; in live mode it is
  saved via `PUT /api/config`

**Production polish**
- Global search (sidebar) across risks and changes with keyboard navigation
- Toast notifications for every mutation, success and failure
- Error boundaries, per-page document titles, form validation
  (value consistency, custom profile sums), accessible labelled inputs,
  confirmation dialogs for destructive actions

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (type-check + production build), `npm run preview`.

## Backend integration

The UI never touches data directly — everything goes through the service
interfaces in `src/api/services.ts`. Two implementations are provided:

| Mode | Implementation | When |
| --- | --- | --- |
| **Mock** (default) | `src/api/mock/` — in-memory store, simulated latency, localStorage config | `VITE_API_BASE_URL` unset |
| **Live** | `src/api/http/` — `fetch` against your API | `VITE_API_BASE_URL` set |

To go live, copy `.env.example` to `.env` and set:

```
VITE_API_BASE_URL=https://your-api.example.com
```

### REST contract

All payload shapes are the TypeScript interfaces in `src/types/domain.ts` and
`src/types/config.ts`.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/risks` | — | `Risk[]` (including archived) |
| GET | `/api/risks/:ref` | — | `Risk` |
| POST | `/api/risks` | `RiskInput` | `Risk` (server assigns reference, score, level, timestamps) |
| PATCH | `/api/risks/:ref` | `Partial<RiskInput>` | `Risk` |
| POST | `/api/risks/:ref/close` | — | `Risk` |
| POST | `/api/risks/:ref/archive` | — | `Risk` |
| POST | `/api/risks/:ref/restore` | — | `Risk` |
| GET | `/api/changes` | — | `ChangeRequest[]` |
| GET | `/api/changes/:ref` | — | `ChangeRequest` |
| POST | `/api/changes` | `ChangeInput` | `ChangeRequest` (created as `Draft` with initial history entry) |
| PATCH | `/api/changes/:ref` | `Partial<ChangeInput>` | `ChangeRequest` |
| POST | `/api/changes/:ref/transition` | `{ action, note? }` | `ChangeRequest` (server enforces the workflow + appends history) |
| DELETE | `/api/changes/:ref` | — | 204 (Draft changes only) |
| GET | `/api/projects` | — | `Project[]` (including archived) |
| POST | `/api/projects` | `ProjectInput` | `Project` |
| PATCH | `/api/projects/:id` | `Partial<ProjectInput>` | `Project` |
| POST | `/api/projects/:id/archive` | — | `Project` |
| POST | `/api/projects/:id/restore` | — | `Project` |
| GET | `/api/config` | — | `AppConfig` (incl. `branding`) |
| PUT | `/api/config` | `AppConfig` | `AppConfig` |
| POST | `/api/branding/logo` | `multipart/form-data` field `logo` (image file) | `{ "url": string }` |
| GET | `/api/me` | — | `AppUser` |

### Cost profiles

`CostProfile` is calendar-anchored:

```ts
{
  distribution: "Even" | "Custom",
  startMonth: "2026-07",     // yyyy-mm
  periods: number[]          // one entry per month, length 1–60 (max 5 years)
}
```

Charts align records from different profiles on a shared month timeline, so
mixed durations and start dates aggregate correctly.

### Server-owned derivations

The backend must implement these (the mock layer shows the expected behaviour
in `src/api/mock/mockServices.ts`):

- `score = likelihood × impact`; `level` from the **configured** 5×5 band
  matrix (`AppConfig.matrix`, `grid[impact][likelihood]`)
- `PUT /api/config` must recompute every stored risk's `level` when the matrix
  changes (the client refetches risks after saving config)
- Reference generation (`R###` / `C###`)
- Change workflow transitions (legal moves in `TRANSITIONS`) and approval history
- `DELETE /api/changes/:ref` only for `Draft` status, and it must strip the
  reference from any linked risks' `linkedChangeRefs`
- Keeping `risk.linkedChangeRefs` consistent with `change.linkedRiskRefs`
- `archived` flags are server-owned — set only via the archive/restore endpoints
- Validate cost profiles: `startMonth` is `yyyy-mm`, `1 ≤ periods.length ≤ 60`
- **Branding** lives in `AppConfig.branding` (`appName`, `tagline`, `brandColor`,
  `logoUrl`, `defaultTheme`). `POST /api/branding/logo` stores the uploaded image
  and returns the URL to put in `branding.logoUrl` (validate type + size; the
  mock returns a `data:` URL). The server should re-validate branding on
  `PUT /api/config` — `sanitizeConfig`/`sanitizeBranding` in `src/types/config.ts`
  document the rules (hex colour, allowed theme modes, image-only logo URLs)

> The colour scheme **preference** (light/dark/system) is a per-user, per-device
> choice kept in `localStorage`, not server state. `branding.defaultTheme` is
> only the first-run default.

## Project structure

```
src/
  api/            service interfaces + mock & http implementations
  components/     shared UI primitives, sidebar, search, matrix, period editor,
                  toasts, dialogs, error boundary
  hooks/          table sorting/pagination, page titles
  pages/          one folder per area (dashboard, risks, changes, reports, settings)
  store/          AppData context — client cache over the services
  theme/          CSS-variable design tokens, ThemeProvider (light/dark + accent),
                  branding/theme persistence helpers
  types/          domain models + AppConfig (the API contract) + lookup tables
  utils/          formatting, calendar maths, CSV export, chart series derivation
```
