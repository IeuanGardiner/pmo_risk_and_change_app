import type {
  AppUser,
  ChangeRequest,
  CostProfile,
  Project,
  Rating,
  RegulatoryPeriod,
  Risk,
  RiskStatus,
  Scope,
} from "../../types/domain";
import type { ChangePriority, ChangeStatus } from "../../types/domain";
import { calcLevel, calcScore } from "../../types/lookups";

/* ---- Reference data ------------------------------------------------------ */
export const PROJECTS: Project[] = [
  { id: "prj-047", name: "Mogden STW Treatment Upgrade", code: "AMP8-047" },
  { id: "prj-052", name: "Beckton Inlet Works Renewal", code: "AMP8-052" },
];

export const REGULATORY_PERIODS: RegulatoryPeriod[] = [
  { code: "AMP8", label: "AMP8 (2025–2030)" },
];

export const CURRENT_USER: AppUser = {
  initials: "IG",
  name: "I. Gardiner",
  role: "Risk Manager",
};

export const HOME_PROJECT = PROJECTS[0];

const even = (total: number): CostProfile => ({
  distribution: "Even",
  periods: Array.from({ length: 12 }, () => Math.round(total / 12)),
});

/* ---- Risks ---------------------------------------------------------------- */
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
  est: number;
  released: number;
  realised: number;
  desc: string;
  mit: string;
  comments: string;
  created: string;
  linkedChanges?: string[];
}

const riskSeed: RiskSeed[] = [
  {
    ref: "R001", scope: "Project", title: "Scaffolding collapse at Level 4 east elevation",
    category: "Safety", workstream: "Civils & Structures", owner: "J. Hayes", l: 5, i: 5,
    status: "Open", target: "2026-03-31", est: 4_200_000, released: 1_800_000, realised: 900_000,
    desc: "Scaffolding panels on east elevation Level 4 are not adequately secured. Risk of collapse during high winds or heavy load operations.",
    mit: "Install additional clamps and bracing on all panels. Daily inspection regime in place. Cordon off zone below during wind > 30mph.",
    comments: "Inspector sign-off required before next lift operation. Escalated to Site Manager on 25 Mar 2026.",
    created: "2026-01-10", linkedChanges: ["C002"],
  },
  {
    ref: "R002", scope: "Project", title: "Ground subsidence Zone D",
    category: "Structural", workstream: "Civils & Structures", owner: "S. Patel", l: 4, i: 4,
    status: "Open", target: "2026-05-15", est: 1_600_000, released: 400_000, realised: 120_000,
    desc: "Settlement readings exceeding tolerance near the inlet works foundation.",
    mit: "Additional ground investigation commissioned; underpinning options under review.",
    comments: "Weekly settlement monitoring reports circulated to the engineering review board.",
    created: "2026-01-15", linkedChanges: ["C001"],
  },
  {
    ref: "R003", scope: "Project", title: "Fire suppression non-compliant",
    category: "Safety", workstream: "Mechanical", owner: "J. Hayes", l: 3, i: 5,
    status: "Mitigating", target: "2026-04-20", est: 800_000, released: 300_000, realised: 60_000,
    desc: "Suppression system on the MCC building does not meet current spec.",
    mit: "Replacement system specified; works scheduled for next shutdown window.",
    comments: "",
    created: "2026-01-20",
  },
  {
    ref: "R004", scope: "Project", title: "Tower crane load limit risk",
    category: "Safety", workstream: "Civils & Structures", owner: "D. Morgan", l: 2, i: 5,
    status: "Open", target: "2026-06-10", est: 950_000, released: 0, realised: 0,
    desc: "Crane operating close to rated capacity for heaviest lifts.",
    mit: "Lift plan revision and independent verification before next heavy lift.",
    comments: "",
    created: "2026-01-22",
  },
  {
    ref: "R005", scope: "Project", title: "Electrical fault – temp supply",
    category: "Safety", workstream: "Electrical & ICA", owner: "J. Hayes", l: 3, i: 4,
    status: "Open", target: "2026-04-05", est: 300_000, released: 80_000, realised: 20_000,
    desc: "Intermittent faults on temporary distribution board.",
    mit: "Board replacement ordered; daily thermographic checks.",
    comments: "",
    created: "2026-02-01",
  },
  {
    ref: "R006", scope: "Project", title: "Steel delivery delayed",
    category: "Supply", workstream: "Civils & Structures", owner: "M. Clarke", l: 5, i: 4,
    status: "Mitigating", target: "2026-02-28", est: 1_100_000, released: 600_000, realised: 250_000,
    desc: "Structural steel package slipping against programme.",
    mit: "Second supplier engaged; expedited freight authorised.",
    comments: "Freight surcharge approved by commercial 12 Feb.",
    created: "2026-02-05", linkedChanges: ["C003"],
  },
  {
    ref: "R007", scope: "Project", title: "Planning permit renewal risk",
    category: "Regulatory", workstream: "Consents & Environment", owner: "L. Brooks", l: 3, i: 4,
    status: "Monitoring", target: "2026-04-30", est: 450_000, released: 100_000, realised: 0,
    desc: "Permit for the outfall works expires before completion.",
    mit: "Renewal application submitted; weekly liaison with authority.",
    comments: "",
    created: "2026-02-08",
  },
  {
    ref: "R008", scope: "Project", title: "Subcontractor insolvency – MEP",
    category: "Commercial", workstream: "Commercial", owner: "P. Evans", l: 2, i: 4,
    status: "Open", target: "2026-05-31", est: 700_000, released: 0, realised: 0,
    desc: "MEP subcontractor showing financial distress signals.",
    mit: "Credit monitoring in place; contingency tender prepared.",
    comments: "",
    created: "2026-02-14",
  },
  {
    ref: "R009", scope: "Project", title: "Concrete mix quality failure",
    category: "Quality", workstream: "Civils & Structures", owner: "R. Singh", l: 3, i: 3,
    status: "Monitoring", target: "2026-04-12", est: 220_000, released: 50_000, realised: 10_000,
    desc: "Cube test variability above acceptable threshold.",
    mit: "Increased sampling frequency; supplier mix audit.",
    comments: "",
    created: "2026-02-20",
  },
  {
    ref: "R010", scope: "Project", title: "Weather delay – concrete pours",
    category: "Schedule", workstream: "Civils & Structures", owner: "T. Walsh", l: 4, i: 2,
    status: "Closed", target: "2026-03-01", est: 90_000, released: 90_000, realised: 90_000,
    desc: "Cold-weather pours delayed against programme.",
    mit: "Heated enclosures and admixtures adopted; resolved.",
    comments: "Closed at March risk review.",
    created: "2026-03-01",
  },
  // ---- Program-scope risks (macro categories, no project) ----
  {
    ref: "R011", scope: "Program", title: "Fuel & energy price volatility",
    category: "Supply Chain", workstream: null, owner: "I. Gardiner", l: 4, i: 4,
    status: "Monitoring", target: "2027-03-31", est: 3_500_000, released: 0, realised: 0,
    desc: "Sustained energy price increases across the AMP8 capital programme.",
    mit: "Hedging strategy and indexed contracts under review with commercial.",
    comments: "",
    created: "2026-01-12",
  },
  {
    ref: "R012", scope: "Program", title: "Construction inflation (CPIH)",
    category: "Economic", workstream: null, owner: "I. Gardiner", l: 5, i: 3,
    status: "Open", target: "2030-03-31", est: 6_800_000, released: 0, realised: 0,
    desc: "Programme-wide cost inflation eroding totex allowance.",
    mit: "Quarterly re-baselining; efficiency challenge across delivery partners.",
    comments: "",
    created: "2026-01-18", linkedChanges: ["C005"],
  },
  {
    ref: "R013", scope: "Program", title: "Ofwat regulatory reform (post-Cunliffe)",
    category: "Regulatory", workstream: null, owner: "I. Gardiner", l: 3, i: 5,
    status: "Monitoring", target: "2028-03-31", est: 2_000_000, released: 0, realised: 0,
    desc: "Potential restructuring of the regulatory framework affecting AMP planning.",
    mit: "Horizon-scanning; scenario plans for alternative period structures.",
    comments: "",
    created: "2026-02-02",
  },
  {
    ref: "R014", scope: "Program", title: "Global materials & shipping shortage",
    category: "Supply Chain", workstream: null, owner: "I. Gardiner", l: 3, i: 4,
    status: "Open", target: "2027-03-31", est: 1_900_000, released: 0, realised: 0,
    desc: "Lead times on long-lead MEP items extending across all projects.",
    mit: "Early procurement and buffer stock for critical long-lead items.",
    comments: "",
    created: "2026-03-03",
  },
];

export const SEED_RISKS: Risk[] = riskSeed.map((s) => ({
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
  level: calcLevel(s.l, s.i),
  status: s.status,
  targetDate: s.target,
  projectId: s.scope === "Project" ? HOME_PROJECT.id : null,
  regulatoryPeriod: "AMP8",
  estimatedTotal: s.est,
  releasedTotal: s.released,
  realisedTotal: s.realised,
  costProfile: even(s.est),
  mitigation: s.mit,
  comments: s.comments,
  linkedChangeRefs: s.linkedChanges ?? [],
  createdAt: `${s.created}T09:00:00Z`,
  updatedAt: "2026-03-27T09:41:00Z",
}));

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
  history: { status: ChangeStatus; actor: string; date: string; note?: string }[];
}

const changeSeed: ChangeSeed[] = [
  {
    ref: "C001", scope: "Project", title: "Underpinning design for inlet works foundation",
    category: "Design", priority: "Urgent", status: "Under Review",
    raisedBy: "S. Patel", owner: "I. Gardiner", cost: 850_000, days: 30,
    requiredBy: "2026-05-01", linkedRisks: ["R002"],
    desc: "Adopt mini-pile underpinning for the inlet works foundation following ground investigation results in Zone D.",
    just: "Settlement readings exceed tolerance; without intervention the foundation programme stops and R002 is likely to be realised in full.",
    created: "2026-03-02",
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
    created: "2026-03-10",
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
    just: "Recovers 15 days of critical-path float and prevents knock-on delay costs estimated at £600k.",
    created: "2026-02-10",
    history: [
      { status: "Draft", actor: "M. Clarke", date: "2026-02-10T09:00:00Z" },
      { status: "Submitted", actor: "M. Clarke", date: "2026-02-10T13:00:00Z" },
      { status: "Under Review", actor: "I. Gardiner", date: "2026-02-11T10:00:00Z" },
      { status: "Approved", actor: "Change Board", date: "2026-02-12T16:00:00Z", note: "Emergency approval — programme critical." },
      { status: "Implemented", actor: "M. Clarke", date: "2026-03-05T12:00:00Z" },
    ],
  },
  {
    ref: "C004", scope: "Project", title: "MCC building layout revision",
    category: "Design", priority: "Standard", status: "Submitted",
    raisedBy: "R. Singh", owner: "S. Patel", cost: 95_000, days: 5,
    requiredBy: "2026-06-15", linkedRisks: [],
    desc: "Re-orientate the MCC building to simplify cable routes and improve maintenance access.",
    just: "Reduces lifetime opex and removes a clash with the future sludge main corridor.",
    created: "2026-03-20",
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
    desc: "Introduce CPIH-linked indexation across AMP8 delivery partner contracts.",
    just: "Caps inflation exposure currently tracked under R012 and gives cost certainty for re-baselining.",
    created: "2026-03-15",
    history: [
      { status: "Draft", actor: "I. Gardiner", date: "2026-03-15T11:00:00Z" },
      { status: "Submitted", actor: "I. Gardiner", date: "2026-03-17T09:00:00Z" },
      { status: "Under Review", actor: "Programme Board", date: "2026-03-22T14:00:00Z" },
    ],
  },
  {
    ref: "C006", scope: "Project", title: "Night-shift working for outfall tie-in",
    category: "Schedule", priority: "Standard", status: "Rejected",
    raisedBy: "T. Walsh", owner: "T. Walsh", cost: 130_000, days: -8,
    requiredBy: "2026-05-10", linkedRisks: [],
    desc: "Add night-shift working to accelerate the outfall tie-in ahead of the permit expiry window.",
    just: "Would recover 8 days, but consent constraints make night working impractical.",
    created: "2026-03-08",
    history: [
      { status: "Draft", actor: "T. Walsh", date: "2026-03-08T09:00:00Z" },
      { status: "Submitted", actor: "T. Walsh", date: "2026-03-09T10:00:00Z" },
      { status: "Under Review", actor: "I. Gardiner", date: "2026-03-11T09:00:00Z" },
      { status: "Rejected", actor: "Change Board", date: "2026-03-18T15:45:00Z", note: "Rejected — noise consent restrictions. Re-scope via permit renewal route (R007)." },
    ],
  },
  {
    ref: "C007", scope: "Project", title: "Early procurement of long-lead MEP items",
    category: "Process", priority: "High", status: "Draft",
    raisedBy: "P. Evans", owner: "P. Evans", cost: 410_000, days: 0,
    requiredBy: "2026-07-01", linkedRisks: ["R008"],
    desc: "Bring forward procurement of transformers and MCC panels into Q2 with staged payments.",
    just: "Secures supply slots before market lead times extend further; reduces exposure under R008.",
    created: "2026-03-25",
    history: [{ status: "Draft", actor: "P. Evans", date: "2026-03-25T13:00:00Z" }],
  },
  {
    ref: "C008", scope: "Program", title: "Standardised design library rollout",
    category: "Process", priority: "Low", status: "Approved",
    raisedBy: "I. Gardiner", owner: "Programme Office", cost: -650_000, days: 0,
    requiredBy: null, linkedRisks: [],
    desc: "Adopt the standard product design library across all AMP8 schemes from Q3.",
    just: "Net saving across the programme via repeatable design; reduces design risk on future schemes.",
    created: "2026-02-25",
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
  costProfile: even(s.cost),
  scheduleImpactDays: s.days,
  projectId: s.scope === "Project" ? HOME_PROJECT.id : null,
  regulatoryPeriod: "AMP8",
  linkedRiskRefs: s.linkedRisks,
  approvalHistory: s.history,
  requiredBy: s.requiredBy,
  createdAt: `${s.created}T09:00:00Z`,
  updatedAt: s.history[s.history.length - 1]?.date ?? `${s.created}T09:00:00Z`,
}));
