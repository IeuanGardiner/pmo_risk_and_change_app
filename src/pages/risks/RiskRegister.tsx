import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Download, Plus, X } from "lucide-react";
import {
  Btn, Card, EmptyState, PageHeader, Pagination, Pill, RiskStatusText, Select, SortableTh,
} from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useSortPage, type SortState } from "../../hooks/useSortPage";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { alpha, LEVEL_STYLES, T } from "../../theme/tokens";
import type { Rating, Risk, RiskLevel, Scope } from "../../types/domain";
import { IMPACTS, LIKELIHOODS, RISK_STATUSES } from "../../types/lookups";
import { downloadCsv } from "../../utils/csv";
import { formatDate, isOverdue } from "../../utils/format";

type LevelTab = "All" | RiskLevel;
const TABS: LevelTab[] = ["All", "Critical", "High", "Medium", "Low"];

const ACCESSORS = {
  ref: (r: Risk) => r.riskReference,
  title: (r: Risk) => r.title,
  category: (r: Risk) => r.category,
  score: (r: Risk) => r.score,
  owner: (r: Risk) => r.owner,
  target: (r: Risk) => r.targetDate,
  review: (r: Risk) => r.nextReviewDate,
  status: (r: Risk) => r.status,
} satisfies Record<string, (r: Risk) => string | number | null>;
type SortKey = keyof typeof ACCESSORS;
const INITIAL_SORT: SortState<SortKey> = { key: "score", dir: "desc" };

const parseRating = (v: string | null): Rating | null => {
  const n = Number(v);
  return n >= 1 && n <= 5 && Number.isInteger(n) ? (n as Rating) : null;
};

export function RiskRegister() {
  const { risks, activeProjects, restoreRisk } = useAppData();
  const navigate = useNavigate();
  const toast = useToast();
  usePageTitle("Risk Register");

  const [params, setParams] = useSearchParams();
  const matrixL = parseRating(params.get("l"));
  const matrixI = parseRating(params.get("i"));

  // Arriving from a matrix cell: open the scope holding most of that cell's risks.
  const [scope, setScope] = useState<Scope>(() => {
    if (matrixL && matrixI) {
      const inCell = risks.filter(
        (r) => !r.archived && r.likelihood === matrixL && r.impact === matrixI,
      );
      const programCount = inCell.filter((r) => r.scope === "Program").length;
      if (programCount > inCell.length - programCount) return "Program";
    }
    return "Project";
  });
  const [level, setLevel] = useState<LevelTab>("All");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const inScope = useMemo(
    () =>
      risks
        .filter((r) => showArchived || !r.archived)
        .filter((r) => r.scope === scope)
        .filter((r) => !matrixL || r.likelihood === matrixL)
        .filter((r) => !matrixI || r.impact === matrixI),
    [risks, scope, showArchived, matrixL, matrixI],
  );
  const filtered = useMemo(
    () =>
      inScope
        .filter((r) => level === "All" || r.level === level)
        .filter((r) => !status || r.status === status)
        .filter((r) => !projectId || r.projectId === projectId),
    [inScope, level, status, projectId],
  );

  const { sorted, pageRows, sort, toggleSort, page, setPage, pageCount, pageSize, total } =
    useSortPage({ rows: filtered, accessors: ACCESSORS, initialSort: INITIAL_SORT });

  const tabCount = (t: LevelTab) => inScope.filter((r) => t === "All" || r.level === t).length;

  const projectName = (id: string | null) =>
    activeProjects.find((p) => p.id === id)?.code ?? "—";

  const onRestore = async (ref: string) => {
    setRestoring(ref);
    try {
      await restoreRisk(ref);
      toast.success(`${ref} restored to the register`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `risk-register-${scope.toLowerCase()}.csv`,
      ["Reference", "Title", "Scope", "Category", "Workstream", "Level", "Score", "Likelihood", "Impact", "Owner", "Status", "Target Date", "Next Review", "Project", "Profile Start", "Profile Months", "Estimated", "Released", "Realised", "Archived"],
      sorted.map((r) => [
        r.riskReference, r.title, r.scope, r.category, r.workstream ?? "", r.level, r.score,
        LIKELIHOODS[r.likelihood], IMPACTS[r.impact], r.owner, r.status, r.targetDate ?? "",
        r.nextReviewDate ?? "",
        scope === "Project" ? projectName(r.projectId) : "",
        r.costProfile.startMonth, r.costProfile.periods.length,
        r.estimatedTotal, r.releasedTotal, r.realisedTotal,
        r.archived ? "Yes" : "No",
      ]),
    );

  const overdueCell = (iso: string | null, closed: boolean) => {
    const overdue = !closed && isOverdue(iso);
    return (
      <span style={{ color: overdue ? T.critical : T.textSec, fontWeight: overdue ? 700 : 400 }}>
        {overdue && (
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: T.critical,
              marginRight: 5,
            }}
          />
        )}
        {formatDate(iso)}
      </span>
    );
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
        title="Risk Register"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={Download} onClick={exportCsv}>
              Export
            </Btn>
            <Btn variant="dark" icon={Plus} onClick={() => navigate("/risks/new")}>
              Add Risk
            </Btn>
          </div>
        }
      />

      {/* Scope toggle + matrix filter chip */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
        {(["Project", "Program"] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setScope(s);
              setLevel("All");
              setProjectId("");
            }}
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
            {s} Risks
          </button>
        ))}
        {matrixL && matrixI && (
          <button
            onClick={() => setParams({})}
            title="Clear matrix filter"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 16,
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: "pointer",
              background: T.brandBg,
              color: T.brand,
              border: `1px solid ${alpha(T.brand, 34)}`,
            }}
          >
            Matrix: {LIKELIHOODS[matrixL]} × {IMPACTS[matrixI]}
            <X size={13} />
          </button>
        )}
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
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setLevel(t)}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: T.font,
                border: "none",
                cursor: "pointer",
                color: level === t ? "#fff" : T.textSec,
                background:
                  level === t ? (t === "All" ? T.brand : LEVEL_STYLES[t].c) : T.bg,
              }}
            >
              {t} ({tabCount(t)})
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {scope === "Project" && (
              <div style={{ width: 200 }}>
                <Select
                  value={projectId}
                  onChange={setProjectId}
                  options={activeProjects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="All projects"
                />
              </div>
            )}
            <div style={{ width: 160 }}>
              <Select
                value={status}
                onChange={setStatus}
                options={RISK_STATUSES}
                placeholder="All statuses"
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
              {sortable("title", "Risk")}
              {sortable("category", "Category")}
              {sortable("score", "Level")}
              {sortable("owner", "Owner")}
              {sortable("target", "Target")}
              {sortable("review", "Review")}
              {sortable("status", "Status")}
              {scope === "Project" && (
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Project</th>
              )}
              <th style={{ padding: "10px 14px" }} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr
                key={r.riskReference}
                className="rs-row"
                onClick={() => navigate(`/risks/${r.riskReference}`)}
                style={{
                  borderTop: `1px solid ${T.strokeSubtle}`,
                  cursor: "pointer",
                  opacity: r.archived ? 0.55 : 1,
                }}
              >
                <td style={{ padding: "11px 14px", color: T.textTer, fontWeight: 600 }}>
                  {r.riskReference}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600, color: T.text }}>
                    {r.title}
                    {r.archived && (
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
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.textTer }}>
                    {r.workstream ?? r.category}
                  </div>
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{r.category}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Pill level={r.level} small />
                    <span style={{ fontSize: 11, color: T.textTer }}>
                      {r.score} ({r.likelihood}×{r.impact})
                    </span>
                  </div>
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{r.owner}</td>
                <td style={{ padding: "11px 14px" }}>
                  {overdueCell(r.targetDate, r.status === "Closed")}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  {overdueCell(r.nextReviewDate, r.status === "Closed")}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <RiskStatusText status={r.status} />
                </td>
                {scope === "Project" && (
                  <td style={{ padding: "11px 14px", color: T.textSec, fontWeight: 600 }}>
                    {projectName(r.projectId)}
                  </td>
                )}
                <td
                  style={{ padding: "11px 14px", color: T.brand }}
                  onClick={(e) => r.archived && e.stopPropagation()}
                >
                  {r.archived ? (
                    <Btn
                      variant="subtle"
                      loading={restoring === r.riskReference}
                      onClick={() => void onRestore(r.riskReference)}
                      style={{ padding: "4px 10px", fontSize: 12 }}
                    >
                      Restore
                    </Btn>
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total === 0 && <EmptyState>No risks match the current filters.</EmptyState>}
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
