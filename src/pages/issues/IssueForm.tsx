import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Btn, Card, Divider, EmptyState, Field, Grid2, Input, PageHeader, Select, SubHead, TextArea,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { T } from "../../theme/tokens";
import type { ChangeRequest, ChangePriority, IssueInput, IssueStatus, Risk, Scope } from "../../types/domain";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "../../types/lookups";
import { currencySymbol, parseNum } from "../../utils/format";

interface FormState {
  scope: Scope;
  title: string;
  description: string;
  category: string;
  priority: ChangePriority;
  status: IssueStatus;
  owner: string;
  raisedBy: string;
  projectId: string;
  targetResolutionDate: string;
  estimatedCost: string;
  linkedRiskRefs: string[];
  linkedChangeRefs: string[];
}

const withCurrent = (options: string[], current: string): string[] =>
  current && !options.includes(current) ? [...options, current] : options;

function toInput(f: FormState): IssueInput {
  return {
    scope: f.scope,
    title: f.title.trim(),
    description: f.description.trim(),
    category: f.category,
    priority: f.priority,
    status: f.status,
    owner: f.owner.trim(),
    raisedBy: f.raisedBy.trim(),
    projectId: f.scope === "Project" ? f.projectId || null : null,
    estimatedCost: parseNum(f.estimatedCost),
    targetResolutionDate: f.targetResolutionDate || null,
    linkedRiskRefs: f.linkedRiskRefs,
    linkedChangeRefs: f.linkedChangeRefs,
  };
}

function validateInfo(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.title.trim()) e.title = "Issue title is required";
  if (!f.description.trim()) e.description = "Description is required";
  if (!f.category) e.category = "Category is required";
  if (!f.owner.trim()) e.owner = "Owner is required";
  if (!f.raisedBy.trim()) e.raisedBy = "Raised by is required";
  return e;
}

function validateCost(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  const cost = parseNum(f.estimatedCost);
  if (!f.estimatedCost.trim() || cost <= 0) {
    e.estimatedCost = "Enter an estimated cost greater than zero";
  }
  return e;
}

/* ---- Linked risk checklist ------------------------------------------------ */
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
          </div>
        );
      })}
    </div>
  );
});

/* ---- Linked change checklist ---------------------------------------------- */
const ChangeLinker = memo(function ChangeLinker({
  changes,
  selected,
  scope,
  onToggle,
}: {
  changes: ChangeRequest[];
  selected: string[];
  scope: Scope;
  onToggle: (ref: string) => void;
}) {
  const candidates = useMemo(
    () =>
      changes.filter(
        (c) => c.scope === scope && c.status !== "Rejected" && c.status !== "Implemented",
      ),
    [changes, scope],
  );
  if (candidates.length === 0) {
    return <div style={{ fontSize: 13, color: T.textTer }}>No open change requests in this scope.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
      {candidates.map((c) => {
        const on = selected.includes(c.changeReference);
        return (
          <div
            key={c.changeReference}
            onClick={() => onToggle(c.changeReference)}
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
            <span style={{ color: T.textTer, fontWeight: 600 }}>{c.changeReference}</span>
            <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{c.title}</span>
            <span style={{ color: T.textSec, fontSize: 12 }}>{c.status}</span>
          </div>
        );
      })}
    </div>
  );
});

/* ---- Step 1: issue info fields -------------------------------------------- */
function IssueInfoFields({
  f,
  set,
  referenceLabel,
  touched,
  touch,
}: {
  f: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  referenceLabel: string;
  touched: Set<string>;
  touch: (k: string) => void;
}) {
  const { pickerProjects, config } = useAppData();
  const infoErrors = validateInfo(f);
  const infoErr = (k: string) => (touched.has(k) ? infoErrors[k] : undefined);

  return (
    <>
      <SubHead>Issue Information</SubHead>
      <Grid2>
        <Field label="Issue Title" required error={infoErr("title")}>
          <Input
            placeholder="Enter a concise issue title…"
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            onBlur={() => touch("title")}
          />
        </Field>
        <Field label="Issue Reference">
          <Input disabled placeholder={referenceLabel} />
        </Field>
      </Grid2>
      <div style={{ marginTop: 14 }}>
        <Field label="Description" required error={infoErr("description")}>
          <TextArea
            placeholder="Describe the issue, its cause, and potential impact…"
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            onBlur={() => touch("description")}
          />
        </Field>
      </div>

      <Divider />
      <SubHead>Classification</SubHead>
      <Grid2>
        <Field label="Category" required error={infoErr("category")}>
          <Select
            value={f.category}
            onChange={(v) => set("category", v)}
            onBlur={() => touch("category")}
            options={withCurrent(config.issueCategories, f.category)}
            placeholder="Select category…"
            aria-invalid={touched.has("category") && !f.category ? true : undefined}
          />
        </Field>
        <Field label="Priority" required>
          <Select
            value={f.priority}
            onChange={(v) => set("priority", v as ChangePriority)}
            options={ISSUE_PRIORITIES}
          />
        </Field>
        <Field label="Raised By" required error={infoErr("raisedBy")}>
          <Input
            value={f.raisedBy}
            onChange={(e) => set("raisedBy", e.target.value)}
            onBlur={() => touch("raisedBy")}
          />
        </Field>
        <Field label="Issue Owner" required error={infoErr("owner")}>
          <Input
            placeholder="Assign to team member…"
            value={f.owner}
            onChange={(e) => set("owner", e.target.value)}
            onBlur={() => touch("owner")}
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
        <Field label="Target Resolution Date">
          <Input
            type="date"
            value={f.targetResolutionDate}
            onChange={(e) => set("targetResolutionDate", e.target.value)}
          />
        </Field>
      </Grid2>
    </>
  );
}

/* ---- Step 2: cost + links ------------------------------------------------- */
function CostAndLinksFields({
  f,
  set,
  errors,
}: {
  f: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const { activeRisks, changes } = useAppData();

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

  const onToggleChange = useCallback(
    (ref: string) =>
      set(
        "linkedChangeRefs",
        f.linkedChangeRefs.includes(ref)
          ? f.linkedChangeRefs.filter((r) => r !== ref)
          : [...f.linkedChangeRefs, ref],
      ),
    [f.linkedChangeRefs, set],
  );

  return (
    <>
      <SubHead>Estimated Cost</SubHead>
      <Grid2>
        <Field
          label={`Estimated Cost (${currencySymbol()})`}
          required
          error={errors.estimatedCost}
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Enter estimated cost to resolve…"
            value={f.estimatedCost}
            onChange={(e) => set("estimatedCost", e.target.value)}
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

      <Divider />
      <SubHead>Linked Changes</SubHead>
      <ChangeLinker
        changes={changes}
        selected={f.linkedChangeRefs}
        scope={f.scope}
        onToggle={onToggleChange}
      />
    </>
  );
}

/* ============================ Add (2-step wizard) ========================== */
export function AddIssue() {
  const navigate = useNavigate();
  const { issues, pickerProjects, user, createIssue } = useAppData();
  const toast = useToast();
  usePageTitle("Raise Issue");

  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (k: string) => setTouched((prev) => new Set([...prev, k]));

  const [f, setF] = useState<FormState>(() => ({
    scope: "Project",
    title: "",
    description: "",
    category: "",
    priority: "Standard",
    status: "Open",
    owner: "",
    raisedBy: user?.name ?? "",
    projectId: pickerProjects[0]?.id ?? "",
    targetResolutionDate: "",
    estimatedCost: "",
    linkedRiskRefs: [],
    linkedChangeRefs: [],
  }));

  const set = useCallback(
    <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v })),
    [],
  );

  const nextRef = useMemo(() => {
    const max = issues.reduce((acc, i) => {
      const n = parseInt(i.issueReference.replace(/^\D+/, ""), 10);
      return Number.isNaN(n) ? acc : Math.max(acc, n);
    }, 0);
    return `Auto-generated: I${String(max + 1).padStart(3, "0")}`;
  }, [issues]);

  const step1Valid =
    f.title.trim() &&
    f.description.trim() &&
    f.category &&
    f.owner.trim() &&
    f.raisedBy.trim();

  const errors = attempted ? validateCost(f) : {};

  const save = async () => {
    const costErrors = validateCost(f);
    if (Object.keys(costErrors).length > 0) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      const rec = await createIssue(toInput(f));
      toast.success(`Issue ${rec.issueReference} raised`);
      navigate(`/issues/${rec.issueReference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the issue failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title={step === 1 ? "Raise Issue" : "Cost & Links"}
        subtitle={
          step === 1
            ? "Step 1 of 2 — issue information"
            : "Step 2 of 2 — estimated cost and linked records"
        }
        action={<Btn variant="default" onClick={() => navigate("/issues")}>Cancel</Btn>}
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
                    set("linkedChangeRefs", []);
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

            <IssueInfoFields
              f={f}
              set={set}
              referenceLabel={nextRef}
              touched={touched}
              touch={touch}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Btn variant="default" onClick={() => navigate("/issues")}>
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
            <CostAndLinksFields f={f} set={set} errors={errors} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <Btn variant="default" icon={ArrowLeft} onClick={() => setStep(1)}>
                Back
              </Btn>
              <Btn variant="primary" onClick={() => void save()} loading={saving}>
                Raise Issue
              </Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================ Edit (single page) =========================== */
export function EditIssue() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const { issues, updateIssue } = useAppData();
  const toast = useToast();

  const issue = issues.find((i) => i.issueReference === ref);
  usePageTitle(issue ? `Edit ${issue.issueReference}` : "Issue not found");

  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (k: string) => setTouched((prev) => new Set([...prev, k]));

  const [f, setF] = useState<FormState | null>(() =>
    issue
      ? {
          scope: issue.scope,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          priority: issue.priority,
          status: issue.status,
          owner: issue.owner,
          raisedBy: issue.raisedBy,
          projectId: issue.projectId ?? "",
          targetResolutionDate: issue.targetResolutionDate ?? "",
          estimatedCost: String(issue.estimatedCost),
          linkedRiskRefs: issue.linkedRiskRefs,
          linkedChangeRefs: issue.linkedChangeRefs,
        }
      : null,
  );

  const set = useCallback(
    <K extends keyof FormState>(k: K, v: FormState[K]) =>
      setF((p) => (p ? { ...p, [k]: v } : p)),
    [],
  );

  if (!issue || !f) {
    return (
      <div style={{ padding: 24 }}>
        <PageHeader
          title="Issue not found"
          action={<Btn icon={ArrowLeft} onClick={() => navigate("/issues")}>Back</Btn>}
        />
        <Card>
          <EmptyState>No issue with reference "{ref}" exists.</EmptyState>
        </Card>
      </div>
    );
  }

  const { activeRisks, changes } = useAppData();

  const onToggleRisk = (riskRef: string) =>
    set(
      "linkedRiskRefs",
      f.linkedRiskRefs.includes(riskRef)
        ? f.linkedRiskRefs.filter((r) => r !== riskRef)
        : [...f.linkedRiskRefs, riskRef],
    );

  const onToggleChange = (changeRef: string) =>
    set(
      "linkedChangeRefs",
      f.linkedChangeRefs.includes(changeRef)
        ? f.linkedChangeRefs.filter((r) => r !== changeRef)
        : [...f.linkedChangeRefs, changeRef],
    );

  const errors = attempted ? validateCost(f) : {};

  const save = async () => {
    const allErrors = { ...validateInfo(f), ...validateCost(f) };
    if (Object.keys(allErrors).length > 0) {
      setAttempted(true);
      setTouched(new Set(Object.keys(allErrors)));
      toast.error("Fix the highlighted fields before saving");
      return;
    }
    setSaving(true);
    try {
      await updateIssue(issue.issueReference, toInput(f));
      toast.success(`Issue ${issue.issueReference} updated`);
      navigate(`/issues/${issue.issueReference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the issue failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Edit Issue"
        subtitle={`${issue.issueReference} – ${issue.title}`}
        action={
          <Btn variant="default" onClick={() => navigate(`/issues/${issue.issueReference}`)}>
            Cancel
          </Btn>
        }
      />

      <Card style={{ padding: 26, maxWidth: 920 }}>
        <IssueInfoFields
          f={f}
          set={set}
          referenceLabel={issue.issueReference}
          touched={touched}
          touch={touch}
        />

        <Divider />
        <SubHead>Status</SubHead>
        <div style={{ maxWidth: 240 }}>
          <Field label="Issue Status" required>
            <Select
              value={f.status}
              onChange={(v) => set("status", v as IssueStatus)}
              options={ISSUE_STATUSES}
            />
          </Field>
        </div>

        <Divider />
        <SubHead>Estimated Cost</SubHead>
        <Grid2>
          <Field
            label={`Estimated Cost (${currencySymbol()})`}
            required
            error={errors.estimatedCost}
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={f.estimatedCost}
              onChange={(e) => set("estimatedCost", e.target.value)}
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

        <Divider />
        <SubHead>Linked Changes</SubHead>
        <ChangeLinker
          changes={changes}
          selected={f.linkedChangeRefs}
          scope={f.scope}
          onToggle={onToggleChange}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Btn variant="default" onClick={() => navigate(`/issues/${issue.issueReference}`)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={() => void save()} loading={saving}>
            Save Issue
          </Btn>
        </div>
      </Card>
    </div>
  );
}
