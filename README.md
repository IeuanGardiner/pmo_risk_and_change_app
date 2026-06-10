# RiskShield — Project & Programme Risk + Change

A complete front-end for managing **risks** and **change requests** across capital
projects and programmes (built around a UK water AMP8 context, but domain-agnostic).
React + TypeScript + Vite, styled with Fluent-aligned design tokens from the Figma
wireframes, and ready for backend integration: it runs on a built-in mock data layer
today and switches to a real REST API with a single environment variable.

## Features

**Risk module** (per the Figma wireframes)
- Landing/loading screen while data services initialise
- Risk dashboard — KPI cards, interactive 5×5 risk matrix, top-priority risks,
  category distribution, risks-by-month, cost profile and drawdown charts
- Risk register — Project/Program scope toggle, level tabs, status & project
  filters, CSV export
- 2-step "Log Risk" wizard — classification (incl. workstream & project) then
  cost value with a 12-period Even/Custom distribution
- Risk detail — severity banner, full attributes, mitigation, comments,
  linked change requests, cost profile chart, Close Risk action
- Edit risk — full record editing including released/realised values and the
  12-period cost profile

**Change module**
- Change dashboard — pipeline by status, pending/approved cost impact,
  schedule impact, cost by category, recent activity
- Change register — scope toggle, status tabs, priority filter, CSV export
- 2-step "Raise Change" wizard — classification, justification, risk linking,
  then cost & schedule impact with a 12-period distribution
- Change detail — workflow actions (Submit → Review → Approve/Reject →
  Implement, Reopen) with decision notes, full approval history timeline,
  linked risks, cost impact profile
- Risk ↔ change linking is bidirectional and visible from both detail views

**Reports & settings**
- Reports — exposure by category, risks by level, change summary, CSV exports
- Settings — data-source mode, scoring matrix, lookup reference data

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
| **Mock** (default) | `src/api/mock/` — in-memory store, simulated latency | `VITE_API_BASE_URL` unset |
| **Live** | `src/api/http/` — `fetch` against your API | `VITE_API_BASE_URL` set |

To go live, copy `.env.example` to `.env` and set:

```
VITE_API_BASE_URL=https://your-api.example.com
```

### REST contract

All payload shapes are the TypeScript interfaces in `src/types/domain.ts`.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/risks` | — | `Risk[]` |
| GET | `/api/risks/:ref` | — | `Risk` |
| POST | `/api/risks` | `RiskInput` | `Risk` (server assigns reference, score, level, timestamps) |
| PATCH | `/api/risks/:ref` | `Partial<RiskInput>` | `Risk` |
| POST | `/api/risks/:ref/close` | — | `Risk` |
| GET | `/api/changes` | — | `ChangeRequest[]` |
| GET | `/api/changes/:ref` | — | `ChangeRequest` |
| POST | `/api/changes` | `ChangeInput` | `ChangeRequest` (created as `Draft` with initial history entry) |
| PATCH | `/api/changes/:ref` | `Partial<ChangeInput>` | `ChangeRequest` |
| POST | `/api/changes/:ref/transition` | `{ action, note? }` | `ChangeRequest` (server enforces the workflow + appends history) |
| GET | `/api/projects` | — | `Project[]` |
| GET | `/api/regulatory-periods` | — | `RegulatoryPeriod[]` |
| GET | `/api/me` | — | `AppUser` |

Server-owned derivations the backend must implement (the mock layer shows the
expected behaviour in `src/api/mock/mockServices.ts`):

- `score = likelihood × impact`; `level` from the 5×5 band matrix
  (`GRID` in `src/types/lookups.ts`)
- Reference generation (`R###` / `C###`)
- Change workflow transitions (legal moves in `TRANSITIONS`) and approval history
- Keeping `risk.linkedChangeRefs` consistent with `change.linkedRiskRefs`

## Project structure

```
src/
  api/            service interfaces + mock & http implementations
  components/     shared UI primitives, sidebar, risk matrix, period editor
  pages/          one folder per area (dashboard, risks, changes, reports, settings)
  store/          AppData context — client cache over the services
  theme/          design tokens (colours, typography, severity styles)
  types/          domain models (the API contract) + lookup tables
  utils/          formatting, CSV export, chart series derivation
```
