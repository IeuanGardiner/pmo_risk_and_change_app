import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Download, Plus } from "lucide-react";
import {
  Btn, Card, ChangeStatusPill, EmptyState, PageHeader, PriorityText, Select,
} from "../../components/ui";
import { useAppData } from "../../store/AppData";
import { CHANGE_STATUS_STYLES, T } from "../../theme/tokens";
import type { ChangeStatus, Scope } from "../../types/domain";
import { CHANGE_PRIORITIES, CHANGE_STATUSES } from "../../types/lookups";
import { downloadCsv } from "../../utils/csv";
import { formatDate, gbp, scheduleDays } from "../../utils/format";

type StatusTab = "All" | ChangeStatus;
const TABS: StatusTab[] = ["All", ...CHANGE_STATUSES];

export function ChangeRegister() {
  const { changes, projects } = useAppData();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>("Project");
  const [tab, setTab] = useState<StatusTab>("All");
  const [priority, setPriority] = useState("");

  const inScope = useMemo(() => changes.filter((c) => c.scope === scope), [changes, scope]);
  const rows = useMemo(
    () =>
      inScope
        .filter((c) => tab === "All" || c.status === tab)
        .filter((c) => !priority || c.priority === priority)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [inScope, tab, priority],
  );
  const tabCount = (t: StatusTab) => inScope.filter((c) => t === "All" || c.status === t).length;

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.code ?? "—";

  const exportCsv = () =>
    downloadCsv(
      `change-register-${scope.toLowerCase()}.csv`,
      ["Reference", "Title", "Scope", "Category", "Priority", "Status", "Raised By", "Owner", "Cost Impact £", "Schedule Days", "Required By", "Project", "Linked Risks"],
      rows.map((c) => [
        c.changeReference, c.title, c.scope, c.category, c.priority, c.status, c.raisedBy, c.owner,
        c.costImpact, c.scheduleImpactDays, c.requiredBy ?? "",
        scope === "Project" ? projectName(c.projectId) : c.regulatoryPeriod,
        c.linkedRiskRefs.join("; "),
      ]),
    );

  return (
    <div style={{ padding: 24, overflow: "auto" }}>
      <PageHeader
        title="Change Register"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="default" icon={Download} onClick={exportCsv}>
              Export
            </Btn>
            <Btn variant="dark" icon={Plus} onClick={() => navigate("/changes/new")}>
              Raise Change
            </Btn>
          </div>
        }
      />

      {/* Scope toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["Project", "Program"] as Scope[]).map((s) => (
          <div
            key={s}
            onClick={() => {
              setScope(s);
              setTab("All");
            }}
            style={{
              padding: "7px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: scope === s ? T.sidebar : T.surface,
              color: scope === s ? "#fff" : T.textSec,
              border: `1px solid ${scope === s ? T.sidebar : T.stroke}`,
            }}
          >
            {s} Changes
          </div>
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
          {TABS.map((t) => (
            <div
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                color: tab === t ? "#fff" : T.textSec,
                background:
                  tab === t ? (t === "All" ? T.brand : CHANGE_STATUS_STYLES[t].c) : T.bg,
              }}
            >
              {t} ({tabCount(t)})
            </div>
          ))}
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
              {["#", "Change", "Category", "Priority", "Cost Impact", "Schedule", "Owner", "Required By", "Status", scope === "Project" ? "Project" : "Period", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
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
                  {gbp(c.costImpact)}
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>
                  {scheduleDays(c.scheduleImpactDays)}
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{c.owner}</td>
                <td style={{ padding: "11px 14px", color: T.textSec }}>{formatDate(c.requiredBy)}</td>
                <td style={{ padding: "11px 14px" }}>
                  <ChangeStatusPill status={c.status} small />
                </td>
                <td style={{ padding: "11px 14px", color: T.textSec, fontWeight: 600 }}>
                  {scope === "Project" ? projectName(c.projectId) : c.regulatoryPeriod}
                </td>
                <td style={{ padding: "11px 14px", color: T.brand }}>
                  <ArrowRight size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState>No change requests match the current filters.</EmptyState>}
      </Card>
    </div>
  );
}
