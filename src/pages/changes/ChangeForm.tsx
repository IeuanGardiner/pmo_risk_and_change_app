import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PeriodBreakdown } from "../../components/PeriodBreakdown";
import {
  Btn, Card, ChangeStatusPill, Divider, EmptyState, Field, Grid2, Input, PageHeader, Pill,
  Select, SubHead, TextArea,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { T } from "../../theme/tokens";
import type { ChangeInput, ChangePriority, CostProfile, Risk, Scope } from "../../types/domain";
import { CHANGE_PRIORITIES } from "../../types/lookups";
import { currentMonthKey, evenProfile } from "../../utils/calendar";
import { currencySymbol, money, parseNum } from "../../utils/format";

interface FormState {
  scope: Scope;
  title: string;
  description: string;
  justification: string;
  category: string;
  priority: ChangePriority;
  owner: string;
  raisedBy: string;
  requiredBy: string;
  projectId: string;
  costImpact: string;
  scheduleImpactDays: string;
  linkedRiskRefs: string[];
  impactAreas: string[];
  plannedImplementationDate: string;
  costProfile: CostProfile;
}

/** Keep a record's existing value selectable even if it was removed from config. */
const withCurrent = (options: string[], current: string): string[] =>
  current && !options.includes(current) ? [...options, current] : options;

function toInput(f: FormState): ChangeInput {
  const isProject = f.scope === "Project";
  const cost = parseNum(f.costImpact);
  return {
    scope: f.scope,
    title: f.title.trim(),
    description: f.description.trim(),
    justification: f.justification.trim(),
    category: f.category,
    priority: f.priority,
    raisedBy: f.raisedBy.trim(),
    owner: f.owner.trim(),
    costImpact: cost,
    costProfile:
      f.costProfile.distribution === "Even"
        ? evenProfile(cost, f.costProfile.startMonth, f.costProfile.periods.length)
        : f.costProfile,
    scheduleImpactDays: parseNum(f.scheduleImpactDays),
    projectId: isProject ? f.projectId || null : null,
    linkedRiskRefs: f.linkedRiskRefs,
    impactAreas: f.impactAreas,
    plannedImplementationDate: f.plannedImplementationDate || null,
    requiredBy: f.requiredBy || null,
  };
}

/** Impact-step validation. */
function validateImpact(f: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (f.costImpact.trim() === "") {
    errors.costImpact = "Enter the net cost impact (0 is allowed)";
  }
  if (f.costProfile.distribution === "Custom") {
    const sum = f.costProfile.periods.reduce((a, v) => a + v, 0);
    if (Math.abs(sum - parseNum(f.costImpact)) > 1) {
      errors.costProfile = "The custom monthly breakdown must add up to the cost impact";
    }
  }
  return errors;
}

/** Checkbox-chip selector for linking open risks to the change. */
const RiskLinker = memo(function RiskLinker({
  risks,
  selected,
  scope,
  onToggle,
}: {
  risks: Risk[];
  selected: string[];
  scope: Scope;
  onToggle: (ref: string) => void;
}) {
  const candidates = useMemo(
    () => risks.filter((r) => r.status !== "Closed" && r.scope === scope),
    [risks, scope],
  );
  if (candidates.length === 0) {
    return <div style={{ fontSize: 13, color: T.textTer }}>No open risks in this scope.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
      {candidates.map((r) => {
        const on = selected.includes(r.riskReference);
        return (
          <div
            key={r.riskReference}
            onClick={() => onToggle(r.riskReference)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px",
              borderRadius: 6,
              cursor: "pointer",
              border: `1px solid ${on ? T.brand : T.stroke}`,
              background: on ? T.brandBg : T.surface,
              fontSize: 13,
            }}
          >
            <input type="checkbox" checked={on} readOnly style={{ accentColor: T.brand }} />
            <span style={{ color: T.textTer, fontWeight: 600 }}>{r.riskReference}</span>
            <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{r.title}</span>
            <span style={{ color: T.textSec }}>{money(r.estimatedTotal)}</span>
            <Pill level={r.level} small />
          </div>
        );
      })}
    </div>
  );
});

/* ---- Shared form sections -------------------------------------------------- */
function ChangeInfoFields({
  f,
  set,
  referenceLabel,
}: {
  f: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  referenceLabel: string;
}) {
  const { pickerProjects, activeRisks, config } = useAppData();
  const onToggleRisk = useCallback(
    (ref: string) =>
      set(
        "linkedRiskRefs",
        f.linkedRiskRefs.includes(ref)
          ? f.linkedRiskRefs.filter((r) => r !== ref)
          : [...f.linkedRiskRefs, ref],
      ),
    [f.linkedRiskRefs, set],
  );
  return (
    <>
      <SubHead>Change Information</SubHead>
      <Grid2>
        <Field label="Change Title" required>
          <Input
            placeholder="Enter a concise change title…"
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field label="Change Reference">
          <Input disabled placeholder={referenceLabel} />
        </Field>
      </Grid2>
      <div style={{ marginTop: 14 }}>
        <Field label="Change Description" required>
          <TextArea
            placeholder="Describe the proposed change and what it affects…"
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="Justification / Reason" required>
          <TextArea
            placeholder="Why is this change needed? What happens if it is not approved?"
            value={f.justification}
            onChange={(e) => set("justification", e.target.value)}
          />
        </Field>
      </div>

      <Divider />
      <SubHead>Classification</SubHead>
      <Grid2>
        <Field label="Category" required>
          <Select
            value={f.category}
            onChange={(v) => set("category", v)}
            options={withCurrent(config.changeCategories, f.category)}
            placeholder="Select category…"
          />
        </Field>
        <Field label="Priority" required>
          <Select
            value={f.priority}
            onChange={(v) => set("priority", v as ChangePriority)}
            options={CHANGE_PRIORITIES}
          />
        </Field>
        <Field label="Raised By" required>
          <Input value={f.raisedBy} onChange={(e) => set("raisedBy", e.target.value)} />
        </Field>
        <Field label="Change Owner" required>
          <Input
            placeholder="Assign to team member…"
            value={f.owner}
            onChange={(e) => set("owner", e.target.value)}
          />
        </Field>
        {f.scope === "Project" && (
          <Field label="Project">
            <Select
              value={f.projectId}
              onChange={(v) => set("projectId", v)}
              options={pickerProjects.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
              placeholder="Select project…"
            />
          </Field>
        )}
        <Field label="Required By">
          <Input
            type="date"
            value={f.requiredBy}
            onChange={(e) => set("requiredBy", e.target.value)}
          />
        </Field>
      </Grid2>

      <Divider />
      <SubHead>Linked Risks</SubHead>
      <RiskLinker
        risks={activeRisks}
        selected={f.linkedRiskRefs}
        scope={f.scope}
        onToggle={onToggleRisk}
      />
    </>
  );
}

/** Checkbox-chip group for the configured impact areas (RiskLinker pattern).
    Legacy values already on the record stay toggleable so edits don't strand
    them. */
function ImpactAreaPicker({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (area: string) => void;
}) {
  const all = [...options, ...selected.filter((v) => !options.includes(v))];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {all.map((area) => {
        const on = selected.includes(area);
        return (
          <div
            key={area}
            onClick={() => onToggle(area)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 6,
              cursor: "pointer",
              border: `1px solid ${on ? T.brand : T.stroke}`,
              background: on ? T.brandBg : T.surface,
              fontSize: 12.5,
              fontWeight: 600,
              color: on ? T.brand : T.textSec,
            }}
          >
            <input type="checkbox" checked={on} readOnly style={{ accentColor: T.brand }} />
            {area}
          </div>
        );
      })}
    </div>
  );
}

function ImpactFields({
  f,
  set,
  errors,
}: {
  f: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const { config } = useAppData();
  const onToggleArea = useCallback(
    (area: string) =>
      set(
        "impactAreas",
        f.impactAreas.includes(area)
          ? f.impactAreas.filter((a) => a !== area)
          : [...f.impactAreas, area],
      ),
    [f.impactAreas, set],
  );
  return (
    <>
      <SubHead>Impact Assessment</SubHead>
      <Grid2>
        <Field label="Impact Areas">
          <ImpactAreaPicker
            options={config.changeImpactAreas}
            selected={f.impactAreas}
            onToggle={onToggleArea}
          />
        </Field>
        <Field label="Planned Implementation Date">
          <Input
            type="date"
            value={f.plannedImplementationDate}
            onChange={(e) => set("plannedImplementationDate", e.target.value)}
          />
        </Field>
      </Grid2>
      <div style={{ height: 14 }} />
      <Grid2>
        <Field
          label={`Cost Impact (${currencySymbol()}) — negative for a saving`}
          required
          error={errors.costImpact}
        >
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Enter net cost impact…"
            value={f.costImpact}
            onChange={(e) => {
              set("costImpact", e.target.value);
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
        <Field label="Schedule Impact (days) — negative for acceleration">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={f.scheduleImpactDays}
            onChange={(e) => set("scheduleImpactDays", e.target.value)}
          />
        </Field>
      </Grid2>
      <PeriodBreakdown
        profile={f.costProfile}
        total={parseNum(f.costImpact)}
        onChange={(p) => set("costProfile", p)}
      />
      {errors.costProfile && (
        <div role="alert" style={{ fontSize: 12, color: T.critical, fontWeight: 600, marginTop: 8 }}>
          {errors.costProfile}
        </div>
      )}
    </>
  );
}

/* ============================ Raise (wizard) ============================== */
export function AddChange() {
  const navigate = useNavigate();
  const { changes, pickerProjects, user, createChange } = useAppData();
  const toast = useToast();
  usePageTitle("Raise Change");
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [f, setF] = useState<FormState>(() => ({
    scope: "Project",
    title: "",
    description: "",
    justification: "",
    category: "",
    priority: "Standard",
    owner: "",
    raisedBy: user?.name ?? "",
    requiredBy: "",
    projectId: pickerProjects[0]?.id ?? "",
    costImpact: "",
    scheduleImpactDays: "",
    linkedRiskRefs: [],
    impactAreas: [],
    plannedImplementationDate: "",
    costProfile: evenProfile(0, currentMonthKey(), 12),
  }));

  const set = useCallback(
    <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v })),
    [],
  );

  const nextRef = useMemo(() => {
    const max = changes.reduce((acc, c) => {
      const n = parseInt(c.changeReference.replace(/^\D+/, ""), 10);
      return Number.isNaN(n) ? acc : Math.max(acc, n);
    }, 0);
    return `Auto-generated: C${String(max + 1).padStart(3, "0")}`;
  }, [changes]);

  const step1Valid =
    f.title.trim() &&
    f.description.trim() &&
    f.justification.trim() &&
    f.category &&
    f.owner.trim() &&
    f.raisedBy.trim();
  const errors = attempted ? validateImpact(f) : {};

  const save = async () => {
    const issues = validateImpact(f);
    if (Object.keys(issues).length > 0) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      const rec = await createChange(toInput(f));
      toast.success(`Change ${rec.changeReference} saved as Draft`);
      navigate(`/changes/${rec.changeReference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the change failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title={step === 1 ? "Raise Change Request" : "Change Impact"}
        subtitle={
          step === 1
            ? "Step 1 of 2 — change information · saved as Draft until submitted"
            : "Step 2 of 2 — cost & schedule impact"
        }
        action={<Btn variant="default" onClick={() => navigate("/changes")}>Cancel</Btn>}
      />
      <Card style={{ padding: 26, maxWidth: 920 }}>
        {step === 1 ? (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {(["Project", "Program"] as Scope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    set("scope", s);
                    set("linkedRiskRefs", []);
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

            <ChangeInfoFields f={f} set={set} referenceLabel={nextRef} />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Btn variant="default" onClick={() => navigate("/changes")}>
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
            <ImpactFields f={f} set={set} errors={errors} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Btn variant="default" icon={ArrowLeft} onClick={() => setStep(1)}>
                Back
              </Btn>
              <Btn variant="primary" onClick={() => void save()} loading={saving}>
                Save as Draft
              </Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================== Edit ====================================== */
export function EditChange() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { changes, updateChange } = useAppData();
  const toast = useToast();
  const change = changes.find((c) => c.changeReference === ref);
  usePageTitle(change ? `Edit ${change.changeReference}` : "Change not found");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [f, setF] = useState<FormState | null>(() =>
    change
      ? {
          scope: change.scope,
          title: change.title,
          description: change.description,
          justification: change.justification,
          category: change.category,
          priority: change.priority,
          owner: change.owner,
          raisedBy: change.raisedBy,
          requiredBy: change.requiredBy ?? "",
          projectId: change.projectId ?? "",
          costImpact: String(change.costImpact),
          scheduleImpactDays: String(change.scheduleImpactDays),
          linkedRiskRefs: change.linkedRiskRefs,
          impactAreas: change.impactAreas,
          plannedImplementationDate: change.plannedImplementationDate ?? "",
          costProfile: change.costProfile,
        }
      : null,
  );

  const set = useCallback(
    <K extends keyof FormState>(k: K, v: FormState[K]) =>
      setF((p) => (p ? { ...p, [k]: v } : p)),
    [],
  );

  if (!change || !f) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader
          title="Change not found"
          action={<Btn icon={ArrowLeft} onClick={() => navigate("/changes")}>Back</Btn>}
        />
        <Card>
          <EmptyState>No change request with reference “{ref}” exists.</EmptyState>
        </Card>
      </div>
    );
  }

  const errors = attempted ? validateImpact(f) : {};

  const save = async () => {
    const issues = validateImpact(f);
    if (Object.keys(issues).length > 0) {
      setAttempted(true);
      toast.error("Fix the highlighted impact fields before saving");
      return;
    }
    setSaving(true);
    try {
      await updateChange(change.changeReference, toInput(f));
      toast.success(`Change ${change.changeReference} updated`);
      navigate(`/changes/${change.changeReference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the change failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Edit Change Request"
        subtitle={`${change.changeReference} – ${change.title}`}
        action={
          <Btn variant="default" onClick={() => navigate(`/changes/${change.changeReference}`)}>
            Cancel
          </Btn>
        }
      />

      {change.status !== "Draft" && (
        <Card
          style={{
            padding: 14,
            marginBottom: 16,
            background: T.brandBg,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ChangeStatusPill status={change.status} small />
          <span style={{ fontSize: 12.5, color: T.textSec }}>
            This change has progressed beyond Draft — edits here update the record but do not
            reset its workflow status.
          </span>
        </Card>
      )}

      <Card style={{ padding: 26, maxWidth: 920 }}>
        <ChangeInfoFields f={f} set={set} referenceLabel={change.changeReference} />
        <Divider />
        <ImpactFields f={f} set={set} errors={errors} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Btn variant="default" onClick={() => navigate(`/changes/${change.changeReference}`)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={() => void save()} loading={saving}>
            Save Change
          </Btn>
        </div>
      </Card>
    </div>
  );
}
