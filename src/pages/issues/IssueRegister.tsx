import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Download, Plus } from "lucide-react";
import {
  Btn, Card, EmptyState, PageHeader, Pagination, PriorityText, Select, SortableTh,
} from "../../components/ui";
import { SkeletonRow } from "../../components/SkeletonRow";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../auth/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useSortPage, type SortState } from "../../hooks/useSortPage";
import { useAppData } from "../../store/AppData";
import { ISSUE_STATUS_STYLES, T, alpha } from "../../theme/tokens";
import type { Issue, IssueStatus, Scope } from "../../types/domain";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "../../types/lookups";
import { downloadCsv } from "../../utils/csv";
import { formatDate } from "../../utils/format";

type StatusTab = "All" | IssueStatus;
const TABS: StatusTab[] = ["All", ...ISSUE_STATUSES];

const ACCESSORS = {
  ref:      (i: Issue) => i.issueReference,
  title:    (i: Issue) => i.title,
  category: (i: Issue) => i.category,
  priority: (i: Issue) => ISSUE_PRIORITIES.indexOf(i.priority),
  status:   (i: Issue) => i.status,
  owner:    (i: Issue) => i.owner,
  target:   (i: Issue) => i.targetResolutionDate,
  updated:  (i: Issue) => i.updatedAt,
} satisfies Record<string, (i: Issue) => string | number | null>;
type SortKey = keyof typeof ACCESSORS;
const INITIAL_SORT: SortState<SortKey> = { key: "updated", dir: "desc" };

const IssueStatusPill = ({ status, small }: { status: IssueStatus; small?: boolean }) => {
  const s = ISSUE_STATUS_STYLES[status];
  return (
    <span
      style={{
        color: s.c,
        background: s.bg,
        border: `1px solid ${alpha(s.c, 20)}`,
        borderRadius: 4,
        padding: small ? "1px 7px" : "3px 9px",
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
};

export function IssueRegister() {
  const { issues, activeProjects, restoreIssue, loading: dataLoading } = useAppData();
  const { can } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  usePageTitle("Issue Register");

  const [params, setParams] = useSearchParams();
  const scope = (params.get("scope") as Scope) ?? "Project";
  const tab = (params.get("tab") as StatusTab) ?? "All";
  const priority = params.get("priority") ?? "";
  const showArchived = params.get("archived") === "1";

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

  const setShowArchived = (show: boolean) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (!show) n.delete("archived");
      else n.set("archived", "1");
      return n;
    });

  const [restoring, setRestoring] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const inScope = useMemo(
    () => issues.filter((i) => i.scope === scope).filter((i) => showArchived || !i.archived),
    [issues, scope, showArchived],
  );

  const filtered = useMemo(
    () =>
      inScope
        .filter((i) => tab === "All" || i.status === tab)
        .filter((i) => !priority || i.priority === priority),
    [inScope, tab, priority],
  );

  const { sorted, pageRows, sort, toggleSort, page, setPage, pageCount, pageSize, total } =
    useSortPage({ rows: filtered, accessors: ACCESSORS, initialSort: INITIAL_SORT });

  const tabCount = (t: StatusTab) => inScope.filter((i) => t === "All" || i.status === t).length;

  const projectName = (id: string | null) => activeProjects.find((p) => p.id === id)?.code ?? "—";

  const onRestore = async (ref: string) => {
    setRestoring(ref);
    try {
      await restoreIssue(ref);
      toast.success(`${ref} restored to the register`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 0));
    downloadCsv(
      `issue-register-${scope.toLowerCase()}.csv`,
      ["Reference", "Title", "Scope", "Category", "Priority", "Status", "Owner", "Raised By", "Estimated Cost", "Target Resolution Date", "Project", "Linked Risks", "Linked Changes", "Archived"],
      sorted.map((i) => [
        i.issueReference, i.title, i.scope, i.category, i.priority, i.status,
        i.owner, i.raisedBy, i.estimatedCost,
        i.targetResolutionDate ?? "",
        scope === "Project" ? projectName(i.projectId) : "",
        i.linkedRiskRefs.join("; "),
        i.linkedChangeRefs.join("; "),
        i.archived ? "Yes" : "No",
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
        title="Issue Register"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={Download} loading={exporting} onClick={() => void exportCsv()}>
              Export
            </Btn>
            {can("risks:update") && (
              <Btn variant="dark" icon={Plus} onClick={() => navigate("/issues/new")}>
                Raise Issue
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
            {s} Issues
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
                  background: tab === t ? (t === "All" ? T.brand : ISSUE_STATUS_STYLES[t].c) : T.bg,
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
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <label
              style={{
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
            <div style={{ width: 160 }}>
              <Select
                value={priority}
                onChange={setPriority}
                options={ISSUE_PRIORITIES}
                placeholder="All priorities"
              />
            </div>
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
              {sortable("title", "Issue")}
              {sortable("category", "Category")}
              {sortable("priority", "Priority")}
              {sortable("status", "Status")}
              {sortable("owner", "Owner")}
              {sortable("target", "Target Date")}
              {scope === "Project" && (
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Project</th>
              )}
              <th style={{ padding: "10px 14px" }} />
            </tr>
          </thead>
          <tbody>
            {dataLoading
              ? Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={idx} />)
              : pageRows.map((i) => (
                  <tr
                    key={i.issueReference}
                    className="rs-row"
                    onClick={() => !i.archived && navigate(`/issues/${i.issueReference}`)}
                    style={{
                      borderTop: `1px solid ${T.strokeSubtle}`,
                      cursor: i.archived ? "default" : "pointer",
                      opacity: i.archived ? 0.55 : 1,
                    }}
                  >
                    <td style={{ padding: "11px 14px", color: T.textTer, fontWeight: 600 }}>
                      {i.issueReference}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontWeight: 600, color: T.text }}>{i.title}</div>
                      <div style={{ fontSize: 11, color: T.textTer }}>{i.category}</div>
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textSec }}>{i.category}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <PriorityText priority={i.priority} />
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <IssueStatusPill status={i.status} small />
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textSec }}>{i.owner}</td>
                    <td style={{ padding: "11px 14px", color: T.textSec }}>
                      {formatDate(i.targetResolutionDate)}
                    </td>
                    {scope === "Project" && (
                      <td style={{ padding: "11px 14px", color: T.textSec, fontWeight: 600 }}>
                        {projectName(i.projectId)}
                      </td>
                    )}
                    <td
                      style={{ padding: "11px 14px", color: T.brand }}
                      onClick={(e) => i.archived && e.stopPropagation()}
                    >
                      {i.archived ? (
                        can("risks:archive") && (
                          <Btn
                            variant="subtle"
                            loading={restoring === i.issueReference}
                            onClick={() => void onRestore(i.issueReference)}
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            Restore
                          </Btn>
                        )
                      ) : (
                        <ArrowRight size={16} />
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {total === 0 && !dataLoading && (
          <EmptyState>No issues match the current filters.</EmptyState>
        )}
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
