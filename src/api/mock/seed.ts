import type {
  AppUser,
  ChangeRequest,
  Project,
  Rating,
  Risk,
  RiskAction,
  RiskActionStatus,
  RiskEvent,
  RiskEventType,
  RiskProximity,
  RiskResponseStrategy,
  RiskReview,
  RiskStatus,
  Scope,
} from "../../types/domain";
import type { ChangePriority, ChangeStatus } from "../../types/domain";
import { DEFAULT_CONFIG } from "../../types/config";
import { calcLevel, calcScore } from "../../types/lookups";
import { evenProfile } from "../../utils/calendar";

/* ---- Reference data ------------------------------------------------------ */
export const PROJECTS: Project[] = [
  {
    id: "prj-001",
    code: "PRJ-001",
    name: "Riverside Logistics Hub",
    type: "Buildings",
    client: "Meridian Distribution Group",
    projectManager: "I. Gardiner",
    status: "Active",
    startDate: "2025-09-01",
    endDate: "2027-03-31",
    value: 48_500_000,
    description: "Design and build of a 60,000 m² distribution warehouse with associated yard and offices.",
    archived: false,
    createdAt: "2025-08-15T09:00:00Z",
    updatedAt: "2026-06-05T09:41:00Z",
  },
  {
    id: "prj-002",
    code: "PRJ-002",
    name: "Northgate Interchange Upgrade",
    type: "Highways",
    client: "County Highways Authority",
    projectManager: "D. Morgan",
    status: "Active",
    startDate: "2025-06-15",
    endDate: "2026-12-20",
    value: 32_100_000,
    description: "Grade-separated junction upgrade with new bridge deck and signalised approaches.",
    archived: false,
    createdAt: "2025-05-20T09:00:00Z",
    updatedAt: "2026-06-05T09:41:00Z",
  },
  {
    id: "prj-003",
    code: "PRJ-003",
    name: "Harbour Quay Residential Phase 2",
    type: "Buildings",
    client: "Quayside Living LLP",
    projectManager: "S. Patel",
    status: "Active",
    startDate: "2026-01-10",
    endDate: "2027-09-30",
    value: 27_800_000,
    description: "Phase 2 of a mixed-tenure residential development comprising 180 waterfront units.",
    archived: false,
    createdAt: "2025-11-30T09:00:00Z",
    updatedAt: "2026-06-05T09:41:00Z",
  },
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

interface ActionSeed {
  title: string;
  owner: string;
  due?: string;
  status: RiskActionStatus;
  /** Only meaningful for Complete actions. */
  completed?: string;
  notes?: string;
}

interface ReviewSeed {
  date: string;
  comment: string;
  /** Snapshot before the review. */
  pl: Rating;
  pi: Rating;
  /** Assessment after the review. */
  l: Rating;
  i: Rating;
  next: string | null;
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
  /** Post-mitigation (target/residual) ratings — both or neither. */
  tl?: Rating;
  ti?: Rating;
  proximity?: RiskProximity;
  schedDays?: number;
  status: RiskStatus;
  target: string;
  review?: string;
  est: number;
  /** Draw-down ledger seed — released/realised/reduced now flow from events. */
  events?: EventSeed[];
  /** Chosen response strategy. */
  strategy?: RiskResponseStrategy;
  /** Mitigation action plan seed. */
  actions?: ActionSeed[];
  /** Historical formal reviews (chronological). */
  reviews?: ReviewSeed[];
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
    tl: 2, ti: 4, proximity: "Within 3 months", schedDays: 21,
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
    strategy: "Reduce",
    actions: [
      { title: "Install additional clamps and bracing on Level 4 panels", owner: "J. Hayes", due: "2026-04-15", status: "Complete", completed: "2026-04-12", notes: "Completed alongside the emergency bracing works after the wind event." },
      { title: "Implement daily scaffold inspection regime", owner: "Site Team", due: "2026-05-30", status: "In Progress", notes: "Checklists issued; awaiting inspector sign-off of the regime." },
      { title: "Sign off wind-speed cordon procedure", owner: "D. Morgan", due: "2026-07-10", status: "Not Started" },
    ],
    reviews: [
      { date: "2026-03-15", comment: "Escalated after the March wind event — likelihood raised pending the revised scaffold design (C002).", pl: 4, pi: 5, l: 5, i: 5, next: "2026-05-20" },
      { date: "2026-05-20", comment: "No change — bracing complete but the tied system scaffold is not yet installed. Hold at Critical.", pl: 5, pi: 5, l: 5, i: 5, next: "2026-06-20" },
    ],
  },
  {
    ref: "R002", scope: "Project", title: "Ground subsidence Zone D",
    category: "Structural", workstream: "Civils & Structures", owner: "S. Patel", l: 4, i: 4,
    tl: 2, ti: 3, proximity: "Imminent", schedDays: 45,
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
    strategy: "Reduce",
    actions: [
      { title: "Commission additional ground investigation in Zone D", owner: "S. Patel", due: "2026-04-01", status: "Complete", completed: "2026-03-28" },
      { title: "Present underpinning options appraisal to the engineering board", owner: "S. Patel", due: "2026-06-30", status: "In Progress", notes: "Mini-pile option preferred; costed under C001." },
    ],
  },
  {
    ref: "R003", scope: "Project", title: "Fire suppression non-compliant",
    category: "Safety", workstream: "Mechanical", owner: "J. Hayes", l: 3, i: 5,
    tl: 1, ti: 4, proximity: "3-6 months",
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
    strategy: "Reduce",
    actions: [
      { title: "Specify compliant replacement suppression system", owner: "J. Hayes", due: "2026-03-31", status: "Complete", completed: "2026-03-25" },
      { title: "Programme replacement works into the next shutdown window", owner: "R. Singh", due: "2026-08-15", status: "Not Started" },
    ],
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
    strategy: "Reduce",
  },
  {
    ref: "R006", scope: "Project", title: "Steel delivery delayed",
    category: "Supply", workstream: "Civils & Structures", owner: "M. Clarke", l: 5, i: 4,
    tl: 2, ti: 3, proximity: "Imminent", schedDays: 30,
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
    strategy: "Reduce",
    actions: [
      { title: "Confirm delivery schedule with second steel supplier", owner: "M. Clarke", due: "2026-06-01", status: "In Progress", notes: "Awaiting final confirmation of the July delivery slots." },
    ],
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
    strategy: "Avoid",
  },
  {
    ref: "R008", scope: "Project", title: "Subcontractor insolvency – MEP",
    category: "Commercial", workstream: "Commercial", owner: "P. Evans", l: 2, i: 4,
    tl: 1, ti: 3, proximity: "6-12 months",
    status: "Open", target: "2026-09-30", review: "2026-08-15",
    est: 700_000,
    desc: "MEP subcontractor showing financial distress signals.",
    mit: "Credit monitoring in place; contingency tender prepared.",
    comments: "",
    created: "2026-02-14", start: "2026-03", months: 12, project: "prj-003",
    strategy: "Transfer",
    actions: [
      { title: "Prepare contingency MEP tender package", owner: "P. Evans", due: "2026-08-01", status: "Not Started" },
      { title: "Negotiate parent company guarantee", owner: "P. Evans", due: "2026-05-01", status: "Cancelled", notes: "Parent declined; superseded by the contingency tender route." },
    ],
  },
  {
    ref: "R009", scope: "Project", title: "Concrete mix quality failure",
    category: "Quality", workstream: "Civils & Structures", owner: "R. Singh", l: 3, i: 3,
    status: "Open", target: "2026-08-12", review: "2026-07-05",
    est: 220_000,
    events: [
      { type: "Realised", amount: 10_000, date: "2026-03-22", note: "Extra cube testing and sampling costs." },
      { type: "Released", amount: 30_000, date: "2026-04-18", note: "Partial release — the supplier mix audit reduced the likely rework." },
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
    tl: 3, ti: 3, proximity: "Beyond 12 months", schedDays: 60,
    status: "Open", target: "2027-03-31", review: "2026-05-30",
    est: 3_500_000,
    desc: "Sustained energy price increases across the capital programme.",
    mit: "Hedging strategy and indexed contracts under review with commercial.",
    comments: "",
    created: "2026-01-12", start: "2026-01", months: 24,
    strategy: "Transfer",
    actions: [
      { title: "Agree hedging strategy with commercial", owner: "I. Gardiner", due: "2026-09-30", status: "Not Started" },
    ],
    reviews: [
      { date: "2026-04-28", comment: "Energy indices eased over Q1 — likelihood reduced one band while the hedging strategy is agreed.", pl: 5, pi: 4, l: 4, i: 4, next: "2026-05-30" },
    ],
  },
  {
    ref: "R012", scope: "Program", title: "Construction cost inflation",
    category: "Economic", workstream: null, owner: "I. Gardiner", l: 5, i: 3,
    tl: 3, ti: 2, proximity: "Beyond 12 months", schedDays: 90,
    status: "Open", target: "2030-03-31", review: "2026-09-30",
    est: 6_800_000,
    events: [
      { type: "Released", amount: 800_000, date: "2026-04-20", note: "Contingency released at the Q1 re-baseline as indices softened." },
    ],
    desc: "Programme-wide cost inflation eroding the programme contingency.",
    mit: "Quarterly re-baselining; efficiency challenge across delivery partners.",
    comments: "",
    created: "2026-01-18", start: "2026-01", months: 48,
    linkedChanges: ["C005"],
    strategy: "Reduce",
    reviews: [
      { date: "2026-04-20", comment: "Q1 review — indices softening but exposure unchanged until the indexation mechanism (C005) lands. No re-score.", pl: 5, pi: 3, l: 5, i: 3, next: "2026-09-30" },
    ],
  },
  {
    ref: "R013", scope: "Program", title: "Building-safety regulation changes",
    category: "Regulatory", workstream: null, owner: "I. Gardiner", l: 3, i: 5,
    tl: 2, ti: 4, proximity: "6-12 months",
    status: "Open", target: "2028-03-31", review: "2026-08-31",
    est: 2_000_000,
    events: [
      { type: "Released", amount: 500_000, date: "2026-05-10", note: "Partial release — scenario planning identified a cheaper compliance route." },
    ],
    desc: "Changes to building-safety regulation affecting design approval and compliance costs across the programme.",
    mit: "Horizon-scanning; scenario plans for alternative compliance routes.",
    comments: "",
    created: "2026-02-02", start: "2026-02", months: 30,
    strategy: "Accept",
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
    strategy: "Share",
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

const buildActions = (ref: string, seeds: ActionSeed[] = []): RiskAction[] =>
  seeds.map((a, idx) => ({
    id: `${ref}-a${idx + 1}`,
    title: a.title,
    owner: a.owner,
    dueDate: a.due ?? null,
    status: a.status,
    completedDate: a.status === "Complete" ? (a.completed ?? a.due ?? null) : null,
    notes: a.notes ?? "",
    createdAt: `${a.due ?? "2026-03-01"}T09:30:00Z`,
    updatedAt: "2026-06-05T09:41:00Z",
  }));

const buildReviews = (ref: string, seeds: ReviewSeed[] = []): RiskReview[] =>
  seeds.map((r, idx) => ({
    id: `${ref}-rv${idx + 1}`,
    date: r.date,
    reviewer: CURRENT_USER.name,
    comment: r.comment,
    previousLikelihood: r.pl,
    previousImpact: r.pi,
    likelihood: r.l,
    impact: r.i,
    nextReviewDate: r.next,
    createdAt: `${r.date}T10:00:00Z`,
  }));

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
    targetLikelihood: s.tl ?? null,
    targetImpact: s.ti ?? null,
    targetScore: s.tl != null && s.ti != null ? calcScore(s.tl, s.ti) : null,
    targetLevel:
      s.tl != null && s.ti != null ? calcLevel(DEFAULT_CONFIG.matrix, s.tl, s.ti) : null,
    proximity: s.proximity ?? null,
    scheduleImpactDays: s.schedDays ?? 0,
    status: s.status,
    targetDate: s.target,
    nextReviewDate: s.review ?? null,
    projectId: s.scope === "Project" ? (s.project ?? PROJECTS[0].id) : null,
    estimatedTotal: s.est,
    realisedTotal: sumEvents(events, "Realised"),
    releasedTotal: sumEvents(events, "Released"),
    costProfile: evenProfile(s.est, s.start, s.months),
    events,
    responseStrategy: s.strategy ?? null,
    actions: buildActions(s.ref, s.actions),
    reviews: buildReviews(s.ref, s.reviews),
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
  impactAreas?: string[];
  plannedImpl?: string;
  /** Only meaningful for Implemented changes. */
  actualImpl?: string;
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
    impactAreas: ["Design", "Cost", "Schedule"],
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
    impactAreas: ["Scope", "Health & Safety", "Cost"], plannedImpl: "2026-05-15",
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
    impactAreas: ["Cost", "Schedule"], plannedImpl: "2026-03-01", actualImpl: "2026-03-05",
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
    impactAreas: ["Design", "Quality"],
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
    impactAreas: ["Cost", "Commercial / Contract"],
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
    impactAreas: ["Schedule", "Environment"],
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
    impactAreas: ["Cost", "Commercial / Contract"],
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
    impactAreas: ["Design", "Quality", "Cost"], plannedImpl: "2026-07-01",
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
  impactAreas: s.impactAreas ?? [],
  plannedImplementationDate: s.plannedImpl ?? null,
  actualImplementationDate: s.status === "Implemented" ? (s.actualImpl ?? null) : null,
  requiredBy: s.requiredBy,
  createdAt: `${s.created}T09:00:00Z`,
  updatedAt: s.history[s.history.length - 1]?.date ?? `${s.created}T09:00:00Z`,
}));
