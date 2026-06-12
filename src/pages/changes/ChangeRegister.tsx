import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Download, Plus } from "lucide-react";
import {
  Btn, Card, ChangeStatusPill, EmptyState, PageHeader, Pagination, PriorityText, Select, SortableTh,
} from "../../components/ui";
import { SkeletonRow } from "../../components/SkeletonRow";
import { useAuth } from "../../auth/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useSortPage, type SortState } from "../../hooks/useSortPage";
import { useAppData } from "../../store/AppData";
import { CHANGE_STATUS_STYLES, T } from "../../theme/tokens";
import type { ChangeRequest, ChangeStatus, Scope } from "../../types/domain";
import { CHANGE_PRIORITIES, CHANGE_STATUSES } from "../../types/lookups";
import { downloadCsv } from "../../utils/csv";
import { formatDate, money, scheduleDays } from "../../utils/format";

type StatusTab = "All" | ChangeStatus;
const TABS: StatusTab[] = ["All", ...CHANGE_STATUSES];

const ACCESSORS = {
  ref: (c: ChangeRequest) => c.changeReference,
  title: (c: ChangeRequest) => c.title,
  category: (c: ChangeRequest) => c.category,
  priority: (c: ChangeRequest) => CHANGE_PRIORITIES.indexOf(c.priority),
  cost: (c: ChangeRequest) => c.costImpact,
  schedule: (c: ChangeRequest) => c.scheduleImpactDays,
  owner: (c: ChangeRequest) => c.owner,
  requiredBy: (c: ChangeRequest) => c.requiredBy,
  status: (c: ChangeRequest) => c.status,
  updated: (c: ChangeRequest) => c.updatedAt,
} satisfies Record<string, (c: ChangeRequest) => string | number | null>;
type SortKey = keyof typeof ACCESSORS;
const INITIAL_SORT: SortState<SortKey> = { key: "updated", dir: "desc" };

export function ChangeRegister() {
  const { changes, activeProjects, loading: dataLoading } = useAppData();
  const { can } = useAuth();
  const navigate = useNavigate();
  usePageTitle("Change Register");

  const [params, setParams] = useSearchParams();
  const scope = (params.get("scope") as Scope) ?? "Project";
  const tab = (params.get("tab") as StatusTab) ?? "All";
  const priority = params.get("priority") ?? "";

  const setScope = (s: Scope) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("scope", s);
      n.delete("tab");
      return n;
    });

  const setTab = (t: StatusTab) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (t === "All") n.delete("tab");
      else n.set("tab", t);
      return n;
    });

  const setPriority = (pr: string) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (!pr) n.delete("priority");
      else n.set("priority", pr);
      return n;
    });

  const [exporting, setExporting] = useState(false);

  const inScope = useMemo(() => changes.filter((c) => c.scope === scope), [changes, scope]);
  const filtered = useMemo(
    () =>
      inScope
        .filter((c) => tab === "All" || c.status === tab)
        .filter((c) => !priority || c.priority === priority),
    [inScope, tab, priority],
  );

  const { sorted, pageRows, sort, toggleSort, page, setPage, pageCount, pageSize, total } =
    useSortPage({ rows: filtered, accessors: ACCESSORS, initialSort: INITIAL_SORT });

  const tabCount = (t: StatusTab) => inScope.filter((c) => t === "All" || c.status === t).length;

  const projectName = (id: string | null) => activeProjects.find((p) => p.id === id)?.code ?? "—";

  const exportCsv = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 0));
    downloadCsv(
      `change-register-${scope.toLowerCase()}.csv`,
      ["Reference", "Title", "Scope", "Category", "Priority", "Status", "Raised By", "Owner", "Cost Impact", "Schedule Days", "Impact Areas", "Required By", "Planned Implementation", "Actual Implementation", "Project", "Profile Start", "Profile Months", "Linked Risks"],
      sorted.map((c) => [
        c.changeReference, c.title, c.scope, c.category, c.priority, c.status, c.raisedBy, c.owner,
        c.costImpact, c.scheduleImpactDays,
        c.impactAreas.join("; "),
        c.requiredBy ?? "",
        c.plannedImplementationDate ?? "", c.actualImplementationDate ?? "",
        scope === "Project" ? projectName(c.projectId) : "",
        c.costProfile.startMonth, c.costProfile.periods.length,
        c.linkedRiskRefs.join("; "),
      ]),
    );
    setExporting(false);
  };

  const sortable = (key: SortKey, label: string) => (
    <SortableTh
      label={label}
      active={sort.key === key}
      dir={sort.dir}
      onClick={() => toggleSort(key)}
    />
  );

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Change Register"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={Download} loading={exporting} onClick={() => void exportCsv()}>
              Export
            </Btn>
            {can("changes:create") && (
              <Btn variant="dark" icon={Plus} onClick={() => navigate("/changes/new")}>
                Raise Change
              </Btn>
            )}
          </div>
        }
      />

      {/* Scope toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["Project", "Program"] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: "pointer",
              background: scope === s ? T.sidebar : T.surface,
              color: scope === s ? "#fff" : T.textSec,
              border: `1px solid ${scope === s ? T.sidebar : T.stroke}`,
            }}
          >
            {s} Changes
          </button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: `1px solid ${T.stroke}`,
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {TABS.map((t) => {
            const count = tabCount(t);
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 16,
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: T.font,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  color: tab === t ? "#fff" : T.textSec,
                  background: tab === t ? (t === "All" ? T.brand : CHANGE_STATUS_STYLES[t].c) : T.bg,
                }}
              >
                {t}
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: tab === t ? "rgba(255,255,255,0.25)" : T.surface,
                      color: tab === t ? "#fff" : T.textSec,
                      fontSize: 10.5,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 5px",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div style={{ marginLeft: "auto", width: 160 }}>
            <Select
              value={priority}
              onChange={setPriority}
              options={CHANGE_PRIORITIES}
              placeholder="All priorities"
            />
          </div>
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
              {sortable("ref", "#")}
              {sortable("title", "Change")}
              {sortable("category", "Category")}
              {sortable("priority", "Priority")}
              {sortable("cost", "Cost Impact")}
              {sortable("schedule", "Schedule")}
              {sortable("owner", "Owner")}
              {sortable("requiredBy", "Required By")}
              {sortable("status", "Status")}
              {scope === "Project" && (
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Project</th>
              )}
              <th style={{ padding: "10px 14px" }} />
            </tr>
          </thead>
          <tbody>
            {dataLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : pageRows.map((c) => (
                  <tr
                    key={c.changeReference}
                    className="rs-row"
                    onClick={() => navigate(`/changes/${c.changeReference}`)}
                    style={{ borderTop: `1px solid ${T.strokeSubtle}`, cursor: "pointer" }}
                  >
                    <td style={{ padding: "11px 14px", color: T.textTer, fontWeight: 600 }}>
                      {c.changeReference}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontWeight: 600, color: T.text }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: T.textTer }}>
                        {c.linkedRiskRefs.length > 0 ? `Linked: ${c.linkedRiskRefs.join(", ")}` : c.category}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textSec }}>{c.category}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <PriorityText priority={c.priority} />
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        fontWeight: 600,
                        color: c.costImpact < 0 ? T.low : T.text,
                      }}
                    >
                      {money(c.costImpact)}
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textSec }}>
                      {scheduleDays(c.scheduleImpactDays)}
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textSec }}>{c.owner}</td>
                    <td style={{ padding: "11px 14px", color: T.textSec }}>{formatDate(c.requiredBy)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <ChangeStatusPill status={c.status} small />
                    </td>
                    {scope === "Project" && (
                      <td style={{ padding: "11px 14px", color: T.textSec, fontWeight: 600 }}>
                        {projectName(c.projectId)}
                      </td>
                    )}
                    <td style={{ padding: "11px 14px", color: T.brand }}>
                      <ArrowRight size={16} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {total === 0 && !dataLoading && <EmptyState>No change requests match the current filters.</EmptyState>}
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
        />
      </Card>
    </div>
  );
}
