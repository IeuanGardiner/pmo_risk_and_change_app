import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { evenPeriods, PeriodBreakdown } from "../../components/PeriodBreakdown";
import {
  Btn, Card, ChangeStatusPill, Divider, EmptyState, Field, Grid2, Input, PageHeader, Pill,
  Select, SubHead, TextArea,
} from "../../components/ui";
import { useAppData } from "../../store/AppData";
import { T } from "../../theme/tokens";
import type { ChangeInput, ChangePriority, CostProfile, Scope } from "../../types/domain";
import { CHANGE_CATEGORIES, CHANGE_PRIORITIES } from "../../types/lookups";
import { HOME_PROJECT } from "../../api/mock/seed";
import { gbp } from "../../utils/format";

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
  costProfile: CostProfile;
}

function toInput(f: FormState): ChangeInput {
  const isProject = f.scope === "Project";
  const cost = +f.costImpact || 0;
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
        ? { distribution: "Even", periods: evenPeriods(cost) }
        : f.costProfile,
    scheduleImpactDays: +f.scheduleImpactDays || 0,
    projectId: isProject ? f.projectId || null : null,
    regulatoryPeriod: "AMP8",
    linkedRiskRefs: f.linkedRiskRefs,
    requiredBy: f.requiredBy || null,
  };
}

/** Checkbox-chip selector for linking open risks to the change. */
function RiskLinker({
  selected,
  scope,
  onToggle,
}: {
  selected: string[];
  scope: Scope;
  onToggle: (ref: string) => void;
}) {
  const { risks } = useAppData();
  const candidates = risks.filter((r) => r.status !== "Closed" && r.scope === scope);
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
            <span style={{ color: T.textSec }}>{gbp(r.estimatedTotal)}</span>
            <Pill level={r.level} small />
          </div>
        );
      })}
    </div>
  );
}

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
  const { projects } = useAppData();
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
            options={CHANGE_CATEGORIES}
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
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
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
        selected={f.linkedRiskRefs}
        scope={f.scope}
        onToggle={(ref) =>
          set(
            "linkedRiskRefs",
            f.linkedRiskRefs.includes(ref)
              ? f.linkedRiskRefs.filter((r) => r !== ref)
              : [...f.linkedRiskRefs, ref],
          )
        }
      />
    </>
  );
}

function ImpactFields({
  f,
  set,
}: {
  f: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <>
      <SubHead>Impact Assessment</SubHead>
      <Grid2>
        <Field label="Cost Impact (£) — negative for a saving" required>
          <Input
            type="number"
            placeholder="Enter net cost impact…"
            value={f.costImpact}
            onChange={(e) => {
              set("costImpact", e.target.value);
              if (f.costProfile.distribution === "Even") {
                set("costProfile", {
                  distribution: "Even",
                  periods: evenPeriods(+e.target.value || 0),
                });
              }
            }}
          />
        </Field>
        <Field label="Schedule Impact (days) — negative for acceleration">
          <Input
            type="number"
            placeholder="0"
            value={f.scheduleImpactDays}
            onChange={(e) => set("scheduleImpactDays", e.target.value)}
          />
        </Field>
      </Grid2>
      <PeriodBreakdown
        profile={f.costProfile}
        total={+f.costImpact || 0}
        onChange={(p) => set("costProfile", p)}
      />
    </>
  );
}

/* ============================ Raise (wizard) ============================== */
export function AddChange() {
  const navigate = useNavigate();
  const { changes, user, createChange } = useAppData();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>({
    scope: "Project",
    title: "",
    description: "",
    justification: "",
    category: "",
    priority: "Standard",
    owner: "",
    raisedBy: user?.name ?? "",
    requiredBy: "",
    projectId: HOME_PROJECT.id,
    costImpact: "",
    scheduleImpactDays: "",
    linkedRiskRefs: [],
    costProfile: { distribution: "Even", periods: evenPeriods(0) },
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((p) => ({ ...p, [k]: v }));

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

  const save = async () => {
    setSaving(true);
    try {
      const rec = await createChange(toInput(f));
      navigate(`/changes/${rec.changeReference}`);
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
                <div
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
                    cursor: "pointer",
                    background: f.scope === s ? T.brand : T.bg,
                    color: f.scope === s ? "#fff" : T.textSec,
                  }}
                >
                  {s} Scope
                </div>
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
            <ImpactFields f={f} set={set} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Btn variant="default" icon={ArrowLeft} onClick={() => setStep(1)}>
                Back
              </Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save as Draft"}
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
  const change = changes.find((c) => c.changeReference === ref);
  const [saving, setSaving] = useState(false);
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
          costProfile: change.costProfile,
        }
      : null,
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

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    setSaving(true);
    try {
      await updateChange(change.changeReference, toInput(f));
      navigate(`/changes/${change.changeReference}`);
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
        <ImpactFields f={f} set={set} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Btn variant="default" onClick={() => navigate(`/changes/${change.changeReference}`)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Change"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
