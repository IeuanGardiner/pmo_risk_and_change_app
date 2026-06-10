import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PeriodBreakdown } from "../../components/PeriodBreakdown";
import {
  Btn, Card, Divider, EmptyState, Field, Grid2, Input, PageHeader, Pill, Select, SubHead, TextArea,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { LEVEL_STYLES, T } from "../../theme/tokens";
import type { CostProfile, Rating, RiskInput, RiskStatus, Scope } from "../../types/domain";
import { calcLevel, IMPACTS, LIKELIHOODS, RISK_STATUSES } from "../../types/lookups";
import { currentMonthKey, evenProfile } from "../../utils/calendar";
import { currencySymbol, parseNum } from "../../utils/format";

interface FormState {
  scope: Scope;
  title: string;
  description: string;
  category: string;
  workstream: string;
  owner: string;
  likelihood: string;
  impact: string;
  status: RiskStatus;
  targetDate: string;
  nextReviewDate: string;
  projectId: string;
  mitigation: string;
  comments: string;
  estimatedTotal: string;
  releasedTotal: string;
  realisedTotal: string;
  costProfile: CostProfile;
}

const emptyForm = (defaultProjectId: string): FormState => ({
  scope: "Project",
  title: "",
  description: "",
  category: "",
  workstream: "",
  owner: "",
  likelihood: "",
  impact: "",
  status: "Open",
  targetDate: "",
  nextReviewDate: "",
  projectId: defaultProjectId,
  mitigation: "",
  comments: "",
  estimatedTotal: "",
  releasedTotal: "0",
  realisedTotal: "0",
  costProfile: evenProfile(0, currentMonthKey(), 12),
});

const RATING_OPTIONS = (labels: Record<Rating, string>) =>
  ([1, 2, 3, 4, 5] as Rating[]).map((n) => ({ value: n, label: `${n} – ${labels[n]}` }));

/** Keep a record's existing value selectable even if it was removed from config. */
const withCurrent = (options: string[], current: string): string[] =>
  current && !options.includes(current) ? [...options, current] : options;

function toInput(f: FormState): RiskInput {
  const likelihood = +f.likelihood as Rating;
  const impact = +f.impact as Rating;
  const isProject = f.scope === "Project";
  const total = parseNum(f.estimatedTotal);
  return {
    scope: f.scope,
    title: f.title.trim(),
    description: f.description.trim(),
    category: f.category,
    workstream: isProject && f.workstream ? f.workstream : null,
    owner: f.owner.trim(),
    likelihood,
    impact,
    status: f.status,
    targetDate: f.targetDate || null,
    nextReviewDate: f.nextReviewDate || null,
    projectId: isProject ? f.projectId || null : null,
    estimatedTotal: total,
    releasedTotal: parseNum(f.releasedTotal),
    realisedTotal: parseNum(f.realisedTotal),
    costProfile:
      f.costProfile.distribution === "Even"
        ? evenProfile(total, f.costProfile.startMonth, f.costProfile.periods.length)
        : f.costProfile,
    mitigation: f.mitigation.trim(),
    comments: f.comments.trim(),
    linkedChangeRefs: [],
  };
}

/** Value-step validation, shared by the add wizard (step 2) and edit form. */
function validateValues(f: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  const est = parseNum(f.estimatedTotal);
  const released = parseNum(f.releasedTotal);
  const realised = parseNum(f.realisedTotal);
  if (est <= 0) errors.estimatedTotal = "Enter a total risk value greater than zero";
  if (released < 0) errors.releasedTotal = "Released value cannot be negative";
  if (realised < 0) errors.realisedTotal = "Realised value cannot be negative";
  if (released > est) errors.releasedTotal = "Released cannot exceed the estimated value";
  if (realised > released) errors.realisedTotal = "Realised cannot exceed the released value";
  if (f.costProfile.distribution === "Custom") {
    const sum = f.costProfile.periods.reduce((a, v) => a + v, 0);
    if (Math.abs(sum - est) > 1) {
      errors.costProfile = "The custom monthly breakdown must add up to the total risk value";
    }
  }
  return errors;
}

/* ============================== Add (wizard) ============================== */
export function AddRisk() {
  const navigate = useNavigate();
  const { risks, activeProjects, config, createRisk } = useAppData();
  const toast = useToast();
  usePageTitle("Add Risk");
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [f, setF] = useState<FormState>(() => emptyForm(activeProjects[0]?.id ?? ""));

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const nextRef = useMemo(() => {
    const max = risks.reduce((acc, r) => {
      const n = parseInt(r.riskReference.replace(/^\D+/, ""), 10);
      return Number.isNaN(n) ? acc : Math.max(acc, n);
    }, 0);
    return `R${String(max + 1).padStart(3, "0")}`;
  }, [risks]);

  const level =
    f.likelihood && f.impact
      ? calcLevel(config.matrix, +f.likelihood as Rating, +f.impact as Rating)
      : null;
  const cats =
    f.scope === "Project" ? config.projectRiskCategories : config.programRiskCategories;
  const step1Valid =
    f.title.trim() && f.description.trim() && f.category && f.owner.trim() && f.likelihood && f.impact;
  const errors = attempted ? validateValues(f) : {};

  const save = async () => {
    const issues = validateValues(f);
    if (Object.keys(issues).length > 0) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      const rec = await createRisk(toInput(f));
      toast.success(`Risk ${rec.riskReference} created`);
      navigate(`/risks/${rec.riskReference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the risk failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title={step === 1 ? "Log New Risk" : "Log Risk Cost"}
        subtitle={step === 1 ? "Step 1 of 2 — risk information" : "Step 2 of 2 — value & period breakdown"}
        action={<Btn variant="default" onClick={() => navigate("/risks")}>Cancel</Btn>}
      />
      <Card style={{ padding: 26, maxWidth: 920 }}>
        {step === 1 ? (
          <>
            {/* scope */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {(["Project", "Program"] as Scope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    set("scope", s);
                    set("category", "");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: T.font,
                    border: "none",
                    cursor: "pointer",
                    background: f.scope === s ? T.brand : T.bg,
                    color: f.scope === s ? "#fff" : T.textSec,
                  }}
                >
                  {s} Scope
                </button>
              ))}
            </div>

            <SubHead>Risk Information</SubHead>
            <Grid2>
              <Field label="Risk Title" required>
                <Input
                  placeholder="Enter a concise risk title…"
                  value={f.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </Field>
              <Field label="Risk Reference">
                <Input disabled placeholder={`Auto-generated: ${nextRef}`} />
              </Field>
            </Grid2>
            <div style={{ marginTop: 14 }}>
              <Field label="Risk Description" required>
                <TextArea
                  placeholder="Describe the risk including causes, triggers and potential consequences…"
                  value={f.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
            </div>

            <Divider />
            <SubHead>Risk Classification</SubHead>
            <Grid2>
              <Field label="Category" required>
                <Select
                  value={f.category}
                  onChange={(v) => set("category", v)}
                  options={cats}
                  placeholder="Select category…"
                />
              </Field>
              <Field label="Risk Owner" required>
                <Input
                  placeholder="Assign to team member…"
                  value={f.owner}
                  onChange={(e) => set("owner", e.target.value)}
                />
              </Field>
              {f.scope === "Project" && (
                <>
                  <Field label="Workstream">
                    <Select
                      value={f.workstream}
                      onChange={(v) => set("workstream", v)}
                      options={config.workstreams}
                      placeholder="Select workstream…"
                    />
                  </Field>
                  <Field label="Project">
                    <Select
                      value={f.projectId}
                      onChange={(v) => set("projectId", v)}
                      options={activeProjects.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder="Select project…"
                    />
                  </Field>
                </>
              )}
              <Field label="Likelihood" required>
                <Select
                  value={f.likelihood}
                  onChange={(v) => set("likelihood", v)}
                  options={RATING_OPTIONS(LIKELIHOODS)}
                  placeholder="Select likelihood…"
                />
              </Field>
              <Field label="Impact" required>
                <Select
                  value={f.impact}
                  onChange={(v) => set("impact", v)}
                  options={RATING_OPTIONS(IMPACTS)}
                  placeholder="Select impact…"
                />
              </Field>
              <Field label="Status" required>
                <Select
                  value={f.status}
                  onChange={(v) => set("status", v as RiskStatus)}
                  options={RISK_STATUSES}
                />
              </Field>
              <Field label="Target Resolution Date">
                <Input
                  type="date"
                  value={f.targetDate}
                  onChange={(e) => set("targetDate", e.target.value)}
                />
              </Field>
              <Field label="Next Review Date">
                <Input
                  type="date"
                  value={f.nextReviewDate}
                  onChange={(e) => set("nextReviewDate", e.target.value)}
                />
              </Field>
            </Grid2>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textSec }}>
                Calculated Risk Level:
              </span>
              {level ? (
                <Pill level={level} />
              ) : (
                <span style={{ fontSize: 12, color: T.textTer }}>Set likelihood &amp; impact</span>
              )}
            </div>

            <Divider />
            <SubHead>Mitigation &amp; Response</SubHead>
            <TextArea
              style={{ minHeight: 80 }}
              placeholder="Mitigation plan…"
              value={f.mitigation}
              onChange={(e) => set("mitigation", e.target.value)}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Btn variant="default" onClick={() => navigate("/risks")}>
                Cancel
              </Btn>
              <Btn
                variant="dark"
                icon={ArrowRight}
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                title={step1Valid ? undefined : "Complete the required fields first"}
              >
                Next
              </Btn>
            </div>
          </>
        ) : (
          <>
            <SubHead>Risk Value Information</SubHead>
            <Grid2>
              <Field
                label={`Total Risk Value (${currencySymbol()})`}
                required
                error={errors.estimatedTotal}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Enter total risk value…"
                  value={f.estimatedTotal}
                  onChange={(e) => {
                    set("estimatedTotal", e.target.value);
                    if (f.costProfile.distribution === "Even") {
                      set(
                        "costProfile",
                        evenProfile(
                          parseNum(e.target.value),
                          f.costProfile.startMonth,
                          f.costProfile.periods.length,
                        ),
                      );
                    }
                  }}
                />
              </Field>
              <Field label="Risk Reference">
                <Input disabled placeholder={`Auto-generated: ${nextRef}`} />
              </Field>
            </Grid2>

            <PeriodBreakdown
              profile={f.costProfile}
              total={parseNum(f.estimatedTotal)}
              onChange={(p) => set("costProfile", p)}
            />
            {errors.costProfile && (
              <div role="alert" style={{ fontSize: 12, color: T.critical, fontWeight: 600, marginTop: 8 }}>
                {errors.costProfile}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Btn variant="default" icon={ArrowLeft} onClick={() => setStep(1)}>
                Back
              </Btn>
              <Btn variant="primary" onClick={() => void save()} loading={saving}>
                Save Risk
              </Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================== Edit ====================================== */
export function EditRisk() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { risks, activeProjects, config, updateRisk } = useAppData();
  const toast = useToast();
  const risk = risks.find((r) => r.riskReference === ref);
  usePageTitle(risk ? `Edit ${risk.riskReference}` : "Risk not found");

  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [f, setF] = useState<FormState | null>(() =>
    risk
      ? {
          scope: risk.scope,
          title: risk.title,
          description: risk.description,
          category: risk.category,
          workstream: risk.workstream ?? "",
          owner: risk.owner,
          likelihood: String(risk.likelihood),
          impact: String(risk.impact),
          status: risk.status,
          targetDate: risk.targetDate ?? "",
          nextReviewDate: risk.nextReviewDate ?? "",
          projectId: risk.projectId ?? "",
          mitigation: risk.mitigation,
          comments: risk.comments,
          estimatedTotal: String(risk.estimatedTotal),
          releasedTotal: String(risk.releasedTotal),
          realisedTotal: String(risk.realisedTotal),
          costProfile: risk.costProfile,
        }
      : null,
  );

  if (!risk || !f) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader
          title="Risk not found"
          action={<Btn icon={ArrowLeft} onClick={() => navigate("/risks")}>Back</Btn>}
        />
        <Card>
          <EmptyState>No risk with reference “{ref}” exists.</EmptyState>
        </Card>
      </div>
    );
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((p) => (p ? { ...p, [k]: v } : p));

  const level = calcLevel(config.matrix, +f.likelihood as Rating, +f.impact as Rating);
  const s = LEVEL_STYLES[level];
  const cats = withCurrent(
    f.scope === "Project" ? config.projectRiskCategories : config.programRiskCategories,
    f.category,
  );
  const errors = attempted ? validateValues(f) : {};

  const save = async () => {
    const issues = validateValues(f);
    if (Object.keys(issues).length > 0) {
      setAttempted(true);
      toast.error("Fix the highlighted value fields before saving");
      return;
    }
    setSaving(true);
    try {
      await updateRisk(risk.riskReference, toInput(f));
      toast.success(`Risk ${risk.riskReference} updated`);
      navigate(`/risks/${risk.riskReference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the risk failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Edit Risk Record"
        subtitle={`${risk.riskReference} – ${risk.title}`}
        action={
          <Btn variant="default" onClick={() => navigate(`/risks/${risk.riskReference}`)}>
            Cancel
          </Btn>
        }
      />

      <Card style={{ padding: 16, borderLeft: `4px solid ${s.c}`, background: s.bg, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill level={level} />
          <span style={{ fontWeight: 700, color: s.c, fontSize: 15 }}>
            {risk.riskReference} – {f.title}
          </span>
        </div>
      </Card>

      <Card style={{ padding: 26, maxWidth: 920 }}>
        <SubHead>Risk Information</SubHead>
        <Grid2>
          <Field label="Risk Title" required>
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Risk Reference">
            <Input disabled value={risk.riskReference} />
          </Field>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <Field label="Risk Description" required>
            <TextArea value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>

        <Divider />
        <SubHead>Risk Classification</SubHead>
        <Grid2>
          <Field label="Category" required>
            <Select value={f.category} onChange={(v) => set("category", v)} options={cats} />
          </Field>
          <Field label="Risk Owner" required>
            <Input value={f.owner} onChange={(e) => set("owner", e.target.value)} />
          </Field>
          {f.scope === "Project" && (
            <>
              <Field label="Workstream">
                <Select
                  value={f.workstream}
                  onChange={(v) => set("workstream", v)}
                  options={withCurrent(config.workstreams, f.workstream)}
                  placeholder="Select workstream…"
                />
              </Field>
              <Field label="Project">
                <Select
                  value={f.projectId}
                  onChange={(v) => set("projectId", v)}
                  options={activeProjects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select project…"
                />
              </Field>
            </>
          )}
          <Field label="Likelihood" required>
            <Select
              value={f.likelihood}
              onChange={(v) => set("likelihood", v)}
              options={RATING_OPTIONS(LIKELIHOODS)}
            />
          </Field>
          <Field label="Impact" required>
            <Select
              value={f.impact}
              onChange={(v) => set("impact", v)}
              options={RATING_OPTIONS(IMPACTS)}
            />
          </Field>
          <Field label="Status" required>
            <Select
              value={f.status}
              onChange={(v) => set("status", v as RiskStatus)}
              options={RISK_STATUSES}
            />
          </Field>
          <Field label="Target Resolution Date">
            <Input type="date" value={f.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
          </Field>
          <Field label="Next Review Date">
            <Input
              type="date"
              value={f.nextReviewDate}
              onChange={(e) => set("nextReviewDate", e.target.value)}
            />
          </Field>
        </Grid2>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textSec }}>
            Calculated Risk Level:
          </span>
          <Pill level={level} />
        </div>

        <Divider />
        <SubHead>Risk Value ({currencySymbol()})</SubHead>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          <Field label="Estimated Risk Value" error={errors.estimatedTotal}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={f.estimatedTotal}
              onChange={(e) => {
                set("estimatedTotal", e.target.value);
                if (f.costProfile.distribution === "Even") {
                  set(
                    "costProfile",
                    evenProfile(
                      parseNum(e.target.value),
                      f.costProfile.startMonth,
                      f.costProfile.periods.length,
                    ),
                  );
                }
              }}
            />
          </Field>
          <Field label="Released Risk" error={errors.releasedTotal}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={f.releasedTotal}
              onChange={(e) => set("releasedTotal", e.target.value)}
            />
          </Field>
          <Field label="Realised Risk" error={errors.realisedTotal}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={f.realisedTotal}
              onChange={(e) => set("realisedTotal", e.target.value)}
            />
          </Field>
        </div>

        <Divider />
        <SubHead>Cost Profile</SubHead>
        <PeriodBreakdown
          profile={f.costProfile}
          total={parseNum(f.estimatedTotal)}
          onChange={(p) => set("costProfile", p)}
        />
        {errors.costProfile && (
          <div role="alert" style={{ fontSize: 12, color: T.critical, fontWeight: 600, marginTop: 8 }}>
            {errors.costProfile}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <Field label="Mitigation Plan">
            <TextArea value={f.mitigation} onChange={(e) => set("mitigation", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Comments / Notes">
            <TextArea value={f.comments} onChange={(e) => set("comments", e.target.value)} />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Btn variant="default" onClick={() => navigate(`/risks/${risk.riskReference}`)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={() => void save()} loading={saving}>
            Save Risk
          </Btn>
        </div>
      </Card>
    </div>
  );
}
