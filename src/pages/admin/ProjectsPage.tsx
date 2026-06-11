import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Download, Pencil, Plus } from "lucide-react";
import {
  Btn,
  Card,
  EmptyState,
  Field,
  Grid2,
  Input,
  PageHeader,
  Pagination,
  Select,
  SortableTh,
  TextArea,
} from "../../components/ui";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useSortPage, type SortState } from "../../hooks/useSortPage";
import { useAppData } from "../../store/AppData";
import { alpha, PROJECT_STATUS_STYLES, T } from "../../theme/tokens";
import type { Project, ProjectInput, ProjectStatus } from "../../types/domain";
import { downloadCsv } from "../../utils/csv";
import { currencySymbol, formatDate, money, parseNum } from "../../utils/format";

const STATUSES: ProjectStatus[] = ["Pipeline", "Active", "On Hold", "Complete", "Cancelled"];

/** Project augmented with the live counts of records referencing it. */
type Row = Project & { riskCount: number; changeCount: number };

const ACCESSORS = {
  code: (p: Row) => p.code,
  name: (p: Row) => p.name,
  type: (p: Row) => p.type,
  manager: (p: Row) => p.projectManager,
  status: (p: Row) => p.status,
  start: (p: Row) => p.startDate,
  value: (p: Row) => p.value,
  risks: (p: Row) => p.riskCount,
  changes: (p: Row) => p.changeCount,
} satisfies Record<string, (p: Row) => string | number | null>;
type SortKey = keyof typeof ACCESSORS;
const INITIAL_SORT: SortState<SortKey> = { key: "code", dir: "asc" };

/** Keep a record's existing value selectable even if it was removed from config. */
const withCurrent = (options: string[], current: string | null): string[] =>
  current && !options.includes(current) ? [...options, current] : options;

const ProjectStatusPill = ({ status }: { status: ProjectStatus }) => {
  const s = PROJECT_STATUS_STYLES[status];
  return (
    <span
      style={{
        color: s.c,
        background: s.bg,
        border: `1px solid ${alpha(s.c, 20)}`,
        borderRadius: 4,
        padding: "1px 7px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
};

const ArchivedChip = () => (
  <span
    style={{
      marginLeft: 8,
      fontSize: 10,
      fontWeight: 700,
      color: T.textTer,
      border: `1px solid ${T.stroke}`,
      borderRadius: 3,
      padding: "1px 5px",
      textTransform: "uppercase",
    }}
  >
    Archived
  </span>
);

export function ProjectsPage() {
  const { projects, risks, changes, config, createProject, updateProject, archiveProject, restoreProject } =
    useAppData();
  const toast = useToast();
  usePageTitle("Projects");

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [editing, setEditing] = useState<Project | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* Counts cover every record (including archived) referencing the project. */
  const rows = useMemo<Row[]>(
    () =>
      projects
        .filter((p) => showArchived || !p.archived)
        .filter((p) => !statusFilter || p.status === statusFilter)
        .filter((p) => !typeFilter || p.type === typeFilter)
        .map((p) => ({
          ...p,
          riskCount: risks.filter((r) => r.projectId === p.id).length,
          changeCount: changes.filter((c) => c.projectId === p.id).length,
        })),
    [projects, risks, changes, showArchived, statusFilter, typeFilter],
  );

  const { sorted, pageRows, sort, toggleSort, page, setPage, pageCount, pageSize, total } =
    useSortPage({ rows, accessors: ACCESSORS, initialSort: INITIAL_SORT });

  const sortable = (key: SortKey, label: string) => (
    <SortableTh label={label} active={sort.key === key} dir={sort.dir} onClick={() => toggleSort(key)} />
  );

  const onArchive = async () => {
    if (!confirmArchive) return;
    setBusyId(confirmArchive.id);
    try {
      await archiveProject(confirmArchive.id);
      toast.success(`Project "${confirmArchive.name}" archived`);
      setConfirmArchive(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusyId(null);
    }
  };

  const onRestore = async (p: Project) => {
    setBusyId(p.id);
    try {
      await restoreProject(p.id);
      toast.success(`Project "${p.name}" restored`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      "projects.csv",
      ["Code", "Name", "Type", "Client", "Project Manager", "Status", "Start Date", "End Date", "Value", "Risks", "Changes", "Description", "Archived"],
      sorted.map((p) => [
        p.code, p.name, p.type ?? "", p.client ?? "", p.projectManager ?? "", p.status,
        p.startDate ?? "", p.endDate ?? "", p.value ?? "", p.riskCount, p.changeCount,
        p.description, p.archived ? "Yes" : "No",
      ]),
    );

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Projects"
        subtitle="Maintain the project register — types, clients, status, dates and contract value"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={Download} onClick={exportCsv}>
              Export
            </Btn>
            <Btn variant="dark" icon={Plus} onClick={() => setAdding(true)}>
              Add Project
            </Btn>
          </div>
        }
      />

      <Card style={{ padding: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: `1px solid ${T.stroke}`,
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ width: 170 }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUSES}
              placeholder="All statuses"
            />
          </div>
          <div style={{ width: 170 }}>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={config.projectTypes}
              placeholder="All types"
            />
          </div>
          <label
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: T.textSec,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              style={{ accentColor: T.brand }}
            />
            Show archived
          </label>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: T.textTer,
                fontSize: 11,
                textTransform: "uppercase",
                background: T.bg,
              }}
            >
              {sortable("code", "Code")}
              {sortable("name", "Name")}
              {sortable("type", "Type")}
              {sortable("manager", "Project Manager")}
              {sortable("status", "Status")}
              {sortable("start", "Start → End")}
              {sortable("value", "Value")}
              {sortable("risks", "Risks / Changes")}
              <th style={{ padding: "10px 14px" }} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => (
              <tr
                key={p.id}
                style={{ borderTop: `1px solid ${T.strokeSubtle}`, opacity: p.archived ? 0.55 : 1 }}
              >
                <td style={{ padding: "11px 14px", color: T.textTer, fontWeight: 600 }}>{p.code}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600, color: T.text }}>
                    {p.name}
                    {p.archived && <ArchivedChip />}
                  </div>
                  {p.client && <div style={{ fontSize: 11, color: T.textTer }}>{p.client}</div>}
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{p.type ?? "—"}</td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{p.projectManager ?? "—"}</td>
                <td style={{ padding: "11px 14px" }}>
                  <ProjectStatusPill status={p.status} />
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec, whiteSpace: "nowrap" }}>
                  {formatDate(p.startDate)} → {formatDate(p.endDate)}
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>
                  {p.value == null ? "—" : money(p.value)}
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>
                  {p.riskCount} / {p.changeCount}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {p.archived ? (
                      <Btn
                        variant="subtle"
                        icon={ArchiveRestore}
                        title={`Restore ${p.name}`}
                        loading={busyId === p.id}
                        onClick={() => void onRestore(p)}
                        style={{ padding: "5px 10px" }}
                      />
                    ) : (
                      <>
                        <Btn
                          variant="subtle"
                          icon={Pencil}
                          title={`Edit ${p.name}`}
                          onClick={() => setEditing(p)}
                          style={{ padding: "5px 10px" }}
                        />
                        <Btn
                          variant="subtle"
                          icon={Archive}
                          title={`Archive ${p.name}`}
                          onClick={() => setConfirmArchive(p)}
                          style={{ padding: "5px 10px" }}
                        />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total === 0 && <EmptyState>No projects match the current filters.</EmptyState>}
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} />
      </Card>

      {(adding || editing) && (
        <ProjectFormModal
          project={editing}
          projects={projects}
          projectTypes={config.projectTypes}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSubmit={(input) =>
            editing ? updateProject(editing.id, input) : createProject(input)
          }
        />
      )}

      <ConfirmDialog
        open={confirmArchive !== null}
        title={`Archive ${confirmArchive?.name ?? ""}?`}
        message="The project will be hidden from pickers but stays resolvable on existing risks and changes. You can restore it any time."
        confirmLabel="Archive Project"
        busy={busyId === confirmArchive?.id}
        onConfirm={() => void onArchive()}
        onCancel={() => setConfirmArchive(null)}
      />
    </div>
  );
}

/* ============================ Add / Edit modal ============================ */

interface FormState {
  name: string;
  code: string;
  type: string;
  client: string;
  projectManager: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  value: string;
  description: string;
}

const fromProject = (p: Project | null): FormState => ({
  name: p?.name ?? "",
  code: p?.code ?? "",
  type: p?.type ?? "",
  client: p?.client ?? "",
  projectManager: p?.projectManager ?? "",
  status: p?.status ?? "Active",
  startDate: p?.startDate ?? "",
  endDate: p?.endDate ?? "",
  value: p?.value != null ? String(p.value) : "",
  description: p?.description ?? "",
});

function ProjectFormModal({
  project,
  projects,
  projectTypes,
  onClose,
  onSubmit,
}: {
  project: Project | null;
  projects: Project[];
  projectTypes: string[];
  onClose: () => void;
  onSubmit: (input: ProjectInput) => Promise<Project>;
}) {
  const toast = useToast();
  const [f, setF] = useState<FormState>(() => fromProject(project));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const name = f.name.trim();
    const code = f.code.trim();
    if (!name) e.name = "Project name is required";
    if (!code) e.code = "Project code is required";
    else if (
      projects.some(
        (p) => p.id !== project?.id && p.code.trim().toLowerCase() === code.toLowerCase(),
      )
    ) {
      e.code = `Code "${code}" is already in use`;
    }
    if (f.startDate && f.endDate && f.endDate < f.startDate) {
      e.endDate = "End date must not be before the start date";
    }
    if (f.value.trim() && parseNum(f.value) < 0) e.value = "Value must be zero or greater";
    return e;
  }, [f, projects, project]);

  const toInput = (): ProjectInput => ({
    name: f.name.trim(),
    code: f.code.trim(),
    type: f.type || null,
    client: f.client.trim() || null,
    projectManager: f.projectManager.trim() || null,
    status: f.status,
    startDate: f.startDate || null,
    endDate: f.endDate || null,
    value: f.value.trim() ? parseNum(f.value) : null,
    description: f.description.trim(),
  });

  const save = async () => {
    if (Object.keys(errors).length > 0) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      const rec = await onSubmit(toInput());
      toast.success(`Project "${rec.name}" ${project ? "updated" : "added"}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving the project failed");
    } finally {
      setSaving(false);
    }
  };

  const err = (k: string) => (attempted ? errors[k] : undefined);

  return (
    <Modal open title={project ? `Edit ${project.code}` : "Add Project"} width={620} onClose={onClose}>
      <Grid2>
        <Field label="Name" required error={err("name")}>
          <Input value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Code" required error={err("code")}>
          <Input
            value={f.code}
            placeholder="PRJ-001"
            onChange={(e) => set("code", e.target.value)}
          />
        </Field>
        <Field label="Type">
          <Select
            value={f.type}
            onChange={(v) => set("type", v)}
            options={withCurrent(projectTypes, f.type)}
            placeholder="Select type…"
          />
        </Field>
        <Field label="Status" required>
          <Select value={f.status} onChange={(v) => set("status", v as ProjectStatus)} options={STATUSES} />
        </Field>
        <Field label="Client">
          <Input value={f.client} onChange={(e) => set("client", e.target.value)} />
        </Field>
        <Field label="Project Manager">
          <Input value={f.projectManager} onChange={(e) => set("projectManager", e.target.value)} />
        </Field>
        <Field label="Start Date">
          <Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="End Date" error={err("endDate")}>
          <Input type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
        <Field label={`Value (${currencySymbol()})`} error={err("value")}>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={f.value}
            onChange={(e) => set("value", e.target.value)}
          />
        </Field>
      </Grid2>
      <div style={{ marginTop: 14 }}>
        <Field label="Description">
          <TextArea value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <Btn variant="default" onClick={onClose} disabled={saving}>
          Cancel
        </Btn>
        <Btn variant="primary" onClick={() => void save()} loading={saving}>
          {project ? "Save Changes" : "Add Project"}
        </Btn>
      </div>
    </Modal>
  );
}
