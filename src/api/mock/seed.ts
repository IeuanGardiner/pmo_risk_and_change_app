import type {
  AppUser,
  ChangeRequest,
  Project,
  Rating,
  Risk,
  RiskEvent,
  RiskEventType,
  RiskStatus,
  Scope,
} from "../../types/domain";
import type { ChangePriority, ChangeStatus } from "../../types/domain";
import { DEFAULT_CONFIG } from "../../types/config";
import { calcLevel, calcScore } from "../../types/lookups";
import { evenProfile } from "../../utils/calendar";

/* ---- Reference data ------------------------------------------------------ */
export const PROJECTS: Project[] = [
  { id: "prj-001", name: "Riverside Logistics Hub", code: "PRJ-001", archived: false },
  { id: "prj-002", name: "Northgate Interchange Upgrade", code: "PRJ-002", archived: false },
  { id: "prj-003", name: "Harbour Quay Residential Phase 2", code: "PRJ-003", archived: false },
];

export const CURRENT_USER: AppUser = {
  initials: "IG",
  name: "I. Gardiner",
  role: "Risk Manager",
};

/* ---- Risks ---------------------------------------------------------------- */
interface EventSeed {
  type: RiskEventType;
  amount: number;
  date: string;
  note: string;
  closeRisk?: boolean;
}

interface RiskSeed {
  ref: string;
  scope: Scope;
  title: string;
  category: string;
  workstream: string | null;
  owner: string;
  l: Rating;
  i: Rating;
  status: RiskStatus;
  target: string;
  review?: string;
  est: number;
  /** Draw-down ledger seed — released/realised/reduced now flow from events. */
  events?: EventSeed[];
  desc: string;
  mit: string;
  comments: string;
  created: string;
  /** Cost profile anchor: start month + duration in months. */
  start: string;
  months: number;
  project?: string;
  archived?: boolean;
  linkedChanges?: string[];
}

const riskSeed: RiskSeed[] = [
  {
    ref: "R001", scope: "Project", title: "Scaffolding collapse at Level 4 east elevation",
    category: "Safety", workstream: "Civils & Structures", owner: "J. Hayes", l: 5, i: 5,
    status: "Open", target: "2026-08-31", review: "2026-06-20",
    est: 4_200_000,
    events: [
      { type: "Released", amount: 1_800_000, date: "2026-03-12", note: "Partial release as the remedial scope was clarified — exposure narrowed." },
      { type: "Realised", amount: 900_000, date: "2026-04-10", note: "Emergency bracing and additional clamps installed following the wind event." },
    ],
    desc: "Scaffolding panels on east elevation Level 4 are not adequately secured. Risk of collapse during high winds or heavy load operations.",
    mit: "Install additional clamps and bracing on all panels. Daily inspection regime in place. Cordon off zone below during wind > 30mph.",
    comments: "Inspector sign-off required before next lift operation. Escalated to Site Manager on 25 Mar 2026.",
    created: "2026-01-10", start: "2026-01", months: 12, project: "prj-001",
    linkedChanges: ["C002"],
  },
  {
    ref: "R002", scope: "Project", title: "Ground subsidence Zone D",
    category: "Structural", workstream: "Civils & Structures", owner: "S. Patel", l: 4, i: 4,
    status: "Open", target: "2026-05-15", review: "2026-05-15",
    est: 1_600_000,
    events: [
      { type: "Realised", amount: 120_000, date: "2026-03-20", note: "Additional ground investigation works in Zone D." },
      { type: "Released", amount: 400_000, date: "2026-04-15", note: "Released once the underpinning option was costed below the provision." },
    ],
    desc: "Settlement readings exceeding tolerance near the warehouse slab foundation in Zone D.",
    mit: "Additional ground investigation commissioned; underpinning options under review.",
    comments: "Weekly settlement monitoring reports circulated to the engineering review board.",
    created: "2026-01-15", start: "2026-02", months: 15, project: "prj-001",
    linkedChanges: ["C001"],
  },
  {
    ref: "R003", scope: "Project", title: "Fire suppression non-compliant",
    category: "Safety", workstream: "Mechanical", owner: "J. Hayes", l: 3, i: 5,
    status: "Open", target: "2026-09-20", review: "2026-07-01",
    est: 800_000,
    events: [
      { type: "Realised", amount: 60_000, date: "2026-03-05", note: "Interim compliance survey and temporary measures." },
      { type: "Released", amount: 300_000, date: "2026-04-01", note: "Released after the replacement system was specified within budget." },
    ],
    desc: "Suppression system in the main plant room does not meet current specification.",
    mit: "Replacement system specified; works scheduled for next shutdown window.",
    comments: "",
    created: "2026-01-20", start: "2026-02", months: 10, project: "prj-002",
  },
  {
    ref: "R004", scope: "Project", title: "Tower crane load limit risk",
    category: "Safety", workstream: "Civils & Structures", owner: "D. Morgan", l: 2, i: 5,
    status: "Open", target: "2026-10-10", review: "2026-08-01",
    est: 950_000,
    desc: "Crane operating close to rated capacity for heaviest lifts.",
    mit: "Lift plan revision and independent verification before next heavy lift.",
    comments: "",
    created: "2026-01-22", start: "2026-03", months: 9, project: "prj-001",
  },
  {
    ref: "R005", scope: "Project", title: "Electrical fault – temp supply",
    category: "Safety", workstream: "Electrical & Controls", owner: "J. Hayes", l: 3, i: 4,
    status: "Open", target: "2026-08-05", review: "2026-07-10",
    est: 300_000,
    events: [
      { type: "Realised", amount: 20_000, date: "2026-03-18", note: "Thermographic survey and minor remedial works." },
      { type: "Released", amount: 80_000, date: "2026-04-22", note: "Released once the replacement board was ordered at a firm price." },
    ],
    desc: "Intermittent faults on temporary distribution board.",
    mit: "Board replacement ordered; daily thermographic checks.",
    comments: "",
    created: "2026-02-01", start: "2026-02", months: 9, project: "prj-002",
  },
  {
    ref: "R006", scope: "Project", title: "Steel delivery delayed",
    category: "Supply", workstream: "Civils & Structures", owner: "M. Clarke", l: 5, i: 4,
    status: "Open", target: "2026-02-28", review: "2026-06-01",
    est: 1_100_000,
    events: [
      { type: "Realised", amount: 250_000, date: "2026-03-08", note: "Expedited freight surcharge incurred to recover programme." },
      { type: "Released", amount: 600_000, date: "2026-04-12", note: "Released after the second supplier confirmed delivery dates." },
    ],
    desc: "Structural steel package slipping against programme.",
    mit: "Second supplier engaged; expedited freight authorised.",
    comments: "Freight surcharge approved by commercial 12 Feb.",
    created: "2026-02-05", start: "2026-02", months: 12, project: "prj-001",
    linkedChanges: ["C003"],
  },
  {
    ref: "R007", scope: "Project", title: "Highway access consent renewal",
    category: "Regulatory", workstream: "Consents & Environment", owner: "L. Brooks", l: 3, i: 4,
    status: "Open", target: "2026-07-30", review: "2026-07-20",
    est: 450_000,
    events: [
      { type: "Released", amount: 100_000, date: "2026-04-05", note: "Released as the renewal application progressed without objection." },
    ],
    desc: "Consent for the highway access works expires before completion.",
    mit: "Renewal application submitted; weekly liaison with the authority.",
    comments: "",
    created: "2026-02-08", start: "2026-03", months: 10, project: "prj-002",
  },
  {
    ref: "R008", scope: "Project", title: "Subcontractor insolvency – MEP",
    category: "Commercial", workstream: "Commercial", owner: "P. Evans", l: 2, i: 4,
    status: "Open", target: "2026-09-30", review: "2026-08-15",
    est: 700_000,
    desc: "MEP subcontractor showing financial distress signals.",
    mit: "Credit monitoring in place; contingency tender prepared.",
    comments: "",
    created: "2026-02-14", start: "2026-03", months: 12, project: "prj-003",
  },
  {
    ref: "R009", scope: "Project", title: "Concrete mix quality failure",
    category: "Quality", workstream: "Civils & Structures", owner: "R. Singh", l: 3, i: 3,
    status: "Open", target: "2026-08-12", review: "2026-07-05",
    est: 220_000,
    events: [
      { type: "Realised", amount: 10_000, date: "2026-03-22", note: "Extra cube testing and sampling costs." },
      { type: "Reduced", amount: 30_000, date: "2026-04-18", note: "Estimate revised down after the supplier mix audit reduced the likely rework." },
      { type: "Released", amount: 50_000, date: "2026-05-02", note: "Released as test variability returned within tolerance." },
    ],
    desc: "Cube test variability above acceptable threshold.",
    mit: "Increased sampling frequency; supplier mix audit.",
    comments: "",
    created: "2026-02-20", start: "2026-03", months: 9, project: "prj-003",
  },
  {
    ref: "R010", scope: "Project", title: "Weather delay – concrete pours",
    category: "Schedule", workstream: "Civils & Structures", owner: "T. Walsh", l: 4, i: 2,
    status: "Closed", target: "2026-03-01",
    est: 90_000,
    events: [
      { type: "Realised", amount: 90_000, date: "2026-02-15", note: "Recovery costs incurred in full; risk closed at the March review.", closeRisk: true },
    ],
    desc: "Cold-weather pours delayed against programme.",
    mit: "Heated enclosures and admixtures adopted; resolved.",
    comments: "Closed at March risk review. Archived after close-out.",
    created: "2026-03-01", start: "2026-01", months: 6, project: "prj-001",
    archived: true,
  },
  // ---- Program-scope risks (macro categories, no project) ----
  {
    ref: "R011", scope: "Program", title: "Fuel & energy price volatility",
    category: "Supply Chain", workstream: null, owner: "I. Gardiner", l: 4, i: 4,
    status: "Open", target: "2027-03-31", review: "2026-05-30",
    est: 3_500_000,
    desc: "Sustained energy price increases across the capital programme.",
    mit: "Hedging strategy and indexed contracts under review with commercial.",
    comments: "",
    created: "2026-01-12", start: "2026-01", months: 24,
  },
  {
    ref: "R012", scope: "Program", title: "Construction cost inflation",
    category: "Economic", workstream: null, owner: "I. Gardiner", l: 5, i: 3,
    status: "Open", target: "2030-03-31", review: "2026-09-30",
    est: 6_800_000,
    events: [
      { type: "Reduced", amount: 800_000, date: "2026-04-20", note: "Contingency re-baselined down at the Q1 review as indices softened." },
    ],
    desc: "Programme-wide cost inflation eroding the programme contingency.",
    mit: "Quarterly re-baselining; efficiency challenge across delivery partners.",
    comments: "",
    created: "2026-01-18", start: "2026-01", months: 48,
    linkedChanges: ["C005"],
  },
  {
    ref: "R013", scope: "Program", title: "Building-safety regulation changes",
    category: "Regulatory", workstream: null, owner: "I. Gardiner", l: 3, i: 5,
    status: "Open", target: "2028-03-31", review: "2026-08-31",
    est: 2_000_000,
    events: [
      { type: "Reduced", amount: 500_000, date: "2026-05-10", note: "Lower compliance cost expected after scenario planning identified a cheaper route." },
    ],
    desc: "Changes to building-safety regulation affecting design approval and compliance costs across the programme.",
    mit: "Horizon-scanning; scenario plans for alternative compliance routes.",
    comments: "",
    created: "2026-02-02", start: "2026-02", months: 30,
  },
  {
    ref: "R014", scope: "Program", title: "Global materials & shipping shortage",
    category: "Supply Chain", workstream: null, owner: "I. Gardiner", l: 3, i: 4,
    status: "Open", target: "2027-03-31", review: "2026-06-05",
    est: 1_900_000,
    desc: "Lead times on long-lead plant and equipment extending across all projects.",
    mit: "Early procurement and buffer stock for critical long-lead items.",
    comments: "",
    created: "2026-03-03", start: "2026-03", months: 24,
  },
];

const buildEvents = (ref: string, seeds: EventSeed[] = []): RiskEvent[] =>
  seeds.map((e, idx) => ({
    id: `${ref}-e${idx + 1}`,
    type: e.type,
    amount: e.amount,
    date: e.date,
    note: e.note,
    actor: CURRENT_USER.name,
    createdAt: `${e.date}T10:00:00Z`,
    closedRisk: e.closeRisk ?? false,
  }));

const sumEvents = (events: RiskEvent[], type: RiskEventType): number =>
  events.filter((e) => e.type === type).reduce((a, e) => a + e.amount, 0);

export const SEED_RISKS: Risk[] = riskSeed.map((s) => {
  const events = buildEvents(s.ref, s.events);
  return {
    riskReference: s.ref,
    scope: s.scope,
    title: s.title,
    description: s.desc,
    category: s.category,
    workstream: s.workstream,
    owner: s.owner,
    likelihood: s.l,
    impact: s.i,
    score: calcScore(s.l, s.i),
    level: calcLevel(DEFAULT_CONFIG.matrix, s.l, s.i),
    status: s.status,
    targetDate: s.target,
    nextReviewDate: s.review ?? null,
    projectId: s.scope === "Project" ? (s.project ?? PROJECTS[0].id) : null,
    estimatedTotal: s.est,
    realisedTotal: sumEvents(events, "Realised"),
    releasedTotal: sumEvents(events, "Released"),
    reducedTotal: sumEvents(events, "Reduced"),
    costProfile: evenProfile(s.est, s.start, s.months),
    events,
    mitigation: s.mit,
    comments: s.comments,
    linkedChangeRefs: s.linkedChanges ?? [],
    archived: s.archived ?? false,
    createdAt: `${s.created}T09:00:00Z`,
    updatedAt: "2026-06-05T09:41:00Z",
  };
});

/* ---- Changes --------------------------------------------------------------- */
interface ChangeSeed {
  ref: string;
  scope: Scope;
  title: string;
  category: string;
  priority: ChangePriority;
  status: ChangeStatus;
  raisedBy: string;
  owner: string;
  cost: number;
  days: number;
  requiredBy: string | null;
  linkedRisks: string[];
  desc: string;
  just: string;
  created: string;
  start: string;
  months: number;
  project?: string;
  history: { status: ChangeStatus; actor: string; date: string; note?: string }[];
}

const changeSeed: ChangeSeed[] = [
  {
    ref: "C001", scope: "Project", title: "Underpinning design for warehouse slab foundation",
    category: "Design", priority: "Urgent", status: "Under Review",
    raisedBy: "S. Patel", owner: "I. Gardiner", cost: 850_000, days: 30,
    requiredBy: "2026-05-01", linkedRisks: ["R002"],
    desc: "Adopt mini-pile underpinning for the warehouse slab foundation following ground investigation results in Zone D.",
    just: "Settlement readings exceed tolerance; without intervention the foundation programme stops and R002 is likely to be realised in full.",
    created: "2026-03-02", start: "2026-04", months: 8, project: "prj-001",
    history: [
      { status: "Draft", actor: "S. Patel", date: "2026-03-02T10:15:00Z" },
      { status: "Submitted", actor: "S. Patel", date: "2026-03-04T14:30:00Z" },
      { status: "Under Review", actor: "I. Gardiner", date: "2026-03-06T09:00:00Z", note: "Referred to engineering review board." },
    ],
  },
  {
    ref: "C002", scope: "Project", title: "Revised scaffold design – east elevation",
    category: "Scope", priority: "Urgent", status: "Approved",
    raisedBy: "J. Hayes", owner: "D. Morgan", cost: 240_000, days: 10,
    requiredBy: "2026-04-01", linkedRisks: ["R001"],
    desc: "Replace existing scaffold with a tied system scaffold including additional bracing and wind-load rated panels.",
    just: "Directly mitigates the critical scaffolding collapse risk (R001). Cost is funded from the released risk allowance.",
    created: "2026-03-10", start: "2026-04", months: 4, project: "prj-001",
    history: [
      { status: "Draft", actor: "J. Hayes", date: "2026-03-10T08:20:00Z" },
      { status: "Submitted", actor: "J. Hayes", date: "2026-03-10T16:45:00Z" },
      { status: "Under Review", actor: "I. Gardiner", date: "2026-03-12T11:00:00Z" },
      { status: "Approved", actor: "Change Board", date: "2026-03-18T15:30:00Z", note: "Approved at March change board. Funded from risk drawdown." },
    ],
  },
  {
    ref: "C003", scope: "Project", title: "Alternative steel supplier – expedited freight",
    category: "Cost", priority: "High", status: "Implemented",
    raisedBy: "M. Clarke", owner: "M. Clarke", cost: 180_000, days: -15,
    requiredBy: "2026-02-20", linkedRisks: ["R006"],
    desc: "Engage second structural steel supplier with expedited freight to recover programme slippage.",
    just: "Recovers 15 days of critical-path float and prevents knock-on delay costs estimated at over three times this change's value.",
    created: "2026-02-10", start: "2026-02", months: 3, project: "prj-001",
    history: [
      { status: "Draft", actor: "M. Clarke", date: "2026-02-10T09:00:00Z" },
      { status: "Submitted", actor: "M. Clarke", date: "2026-02-10T13:00:00Z" },
      { status: "Under Review", actor: "I. Gardiner", date: "2026-02-11T10:00:00Z" },
      { status: "Approved", actor: "Change Board", date: "2026-02-12T16:00:00Z", note: "Emergency approval — programme critical." },
      { status: "Implemented", actor: "M. Clarke", date: "2026-03-05T12:00:00Z" },
    ],
  },
  {
    ref: "C004", scope: "Project", title: "Plant room layout revision",
    category: "Design", priority: "Standard", status: "Submitted",
    raisedBy: "R. Singh", owner: "S. Patel", cost: 95_000, days: 5,
    requiredBy: "2026-06-15", linkedRisks: [],
    desc: "Re-orientate the main plant room to simplify cable routes and improve maintenance access.",
    just: "Reduces lifetime operating cost and removes a clash with the future services corridor.",
    created: "2026-03-20", start: "2026-05", months: 6, project: "prj-002",
    history: [
      { status: "Draft", actor: "R. Singh", date: "2026-03-20T10:00:00Z" },
      { status: "Submitted", actor: "R. Singh", date: "2026-03-24T09:30:00Z" },
    ],
  },
  {
    ref: "C005", scope: "Program", title: "Programme-wide indexation mechanism",
    category: "Cost", priority: "High", status: "Under Review",
    raisedBy: "I. Gardiner", owner: "I. Gardiner", cost: 1_200_000, days: 0,
    requiredBy: "2026-09-30", linkedRisks: ["R012"],
    desc: "Introduce CPI-linked indexation across delivery partner contracts.",
    just: "Caps inflation exposure currently tracked under R012 and gives cost certainty for re-baselining.",
    created: "2026-03-15", start: "2026-07", months: 24,
    history: [
      { status: "Draft", actor: "I. Gardiner", date: "2026-03-15T11:00:00Z" },
      { status: "Submitted", actor: "I. Gardiner", date: "2026-03-17T09:00:00Z" },
      { status: "Under Review", actor: "Programme Board", date: "2026-03-22T14:00:00Z" },
    ],
  },
  {
    ref: "C006", scope: "Project", title: "Night-shift working for bridge-deck tie-in",
    category: "Schedule", priority: "Standard", status: "Rejected",
    raisedBy: "T. Walsh", owner: "T. Walsh", cost: 130_000, days: -8,
    requiredBy: "2026-05-10", linkedRisks: [],
    desc: "Add night-shift working to accelerate the bridge-deck tie-in ahead of the road-closure window.",
    just: "Would recover 8 days, but consent constraints make night working impractical.",
    created: "2026-03-08", start: "2026-04", months: 3, project: "prj-002",
    history: [
      { status: "Draft", actor: "T. Walsh", date: "2026-03-08T09:00:00Z" },
      { status: "Submitted", actor: "T. Walsh", date: "2026-03-09T10:00:00Z" },
      { status: "Under Review", actor: "I. Gardiner", date: "2026-03-11T09:00:00Z" },
      { status: "Rejected", actor: "Change Board", date: "2026-03-18T15:45:00Z", note: "Rejected — noise consent restrictions. Re-scope via the consent renewal route (R007)." },
    ],
  },
  {
    ref: "C007", scope: "Project", title: "Early procurement of long-lead MEP items",
    category: "Process", priority: "High", status: "Draft",
    raisedBy: "P. Evans", owner: "P. Evans", cost: 410_000, days: 0,
    requiredBy: "2026-07-01", linkedRisks: ["R008"],
    desc: "Bring forward procurement of transformers and switchgear into Q2 with staged payments.",
    just: "Secures supply slots before market lead times extend further; reduces exposure under R008.",
    created: "2026-03-25", start: "2026-04", months: 8, project: "prj-003",
    history: [{ status: "Draft", actor: "P. Evans", date: "2026-03-25T13:00:00Z" }],
  },
  {
    ref: "C008", scope: "Program", title: "Standardised design library rollout",
    category: "Process", priority: "Low", status: "Approved",
    raisedBy: "I. Gardiner", owner: "Programme Office", cost: -650_000, days: 0,
    requiredBy: null, linkedRisks: [],
    desc: "Adopt the standard product design library across all programme schemes from Q3.",
    just: "Net saving across the programme via repeatable design; reduces design risk on future schemes.",
    created: "2026-02-25", start: "2026-07", months: 18,
    history: [
      { status: "Draft", actor: "I. Gardiner", date: "2026-02-25T10:00:00Z" },
      { status: "Submitted", actor: "I. Gardiner", date: "2026-02-26T10:00:00Z" },
      { status: "Under Review", actor: "Programme Board", date: "2026-03-01T09:00:00Z" },
      { status: "Approved", actor: "Programme Board", date: "2026-03-12T16:00:00Z" },
    ],
  },
];

export const SEED_CHANGES: ChangeRequest[] = changeSeed.map((s) => ({
  changeReference: s.ref,
  scope: s.scope,
  title: s.title,
  description: s.desc,
  justification: s.just,
  category: s.category,
  priority: s.priority,
  status: s.status,
  raisedBy: s.raisedBy,
  owner: s.owner,
  costImpact: s.cost,
  costProfile: evenProfile(s.cost, s.start, s.months),
  scheduleImpactDays: s.days,
  projectId: s.scope === "Project" ? (s.project ?? PROJECTS[0].id) : null,
  linkedRiskRefs: s.linkedRisks,
  approvalHistory: s.history,
  requiredBy: s.requiredBy,
  createdAt: `${s.created}T09:00:00Z`,
  updatedAt: s.history[s.history.length - 1]?.date ?? `${s.created}T09:00:00Z`,
}));
