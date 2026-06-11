import { useMemo, useState } from "react";
import { FolderKanban, RotateCcw, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Btn, Card, Field, PageHeader, SectionTitle, Select } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/Toast";
import { isMockMode } from "../../api";
import { useAppData } from "../../store/AppData";
import { alpha, T } from "../../theme/tokens";
import { CURRENCIES, SYSTEM_RISK_STATUSES, type AppConfig } from "../../types/config";
import { BrandingEditor } from "./BrandingEditor";
import { LookupListEditor } from "./LookupListEditor";

export function SettingsPage() {
  const { risks, changes, projects, config, updateConfig, user } = useAppData();
  const { can } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  usePageTitle("Settings");
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  const [draft, setDraft] = useState<AppConfig>(config);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(config), [draft, config]);

  const setPart = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  /* Usage counts cover every record (including archived) so a value can't be
     deleted while anything still references it. */
  const usage = {
    projectCategory: (v: string) =>
      risks.filter((r) => r.scope === "Project" && r.category === v).length,
    programCategory: (v: string) =>
      risks.filter((r) => r.scope === "Program" && r.category === v).length,
    workstream: (v: string) => risks.filter((r) => r.workstream === v).length,
    changeCategory: (v: string) => changes.filter((c) => c.category === v).length,
    riskStatus: (v: string) => risks.filter((r) => r.status === v).length,
    projectType: (v: string) => projects.filter((p) => p.type === v).length,
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateConfig(draft);
      toast.success("Configuration saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving configuration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, overflow: "auto", position: "relative", minHeight: "100%" }}>
      <PageHeader
        title="Settings"
        subtitle="Tailor the app per client — branding, scoring model, lookups and currency"
      />

      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle sub="White-label the app for this client — name, logo, accent colour and colour scheme">
          Branding &amp; Appearance
        </SectionTitle>
        <BrandingEditor value={draft.branding} onChange={(b) => setPart("branding", b)} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <SectionTitle>Data Source</SectionTitle>
            <div
              style={{
                padding: 14,
                borderRadius: 6,
                background: isMockMode ? T.mediumBg : T.lowBg,
                border: `1px solid ${alpha(isMockMode ? T.medium : T.low, 20)}`,
                fontSize: 13,
                color: T.textSec,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, color: isMockMode ? T.medium : T.low, marginBottom: 4 }}>
                {isMockMode ? "Mock data (in-memory)" : "Live API"}
              </div>
              {isMockMode ? (
                <>
                  The app is running on the built-in mock service layer; configuration changes are
                  saved to this browser. Set{" "}
                  <code style={{ background: T.bg, padding: "1px 5px", borderRadius: 3 }}>
                    VITE_API_BASE_URL
                  </code>{" "}
                  in a <code style={{ background: T.bg, padding: "1px 5px", borderRadius: 3 }}>.env</code>{" "}
                  file to switch every service to live HTTP calls — the REST contract is in the
                  README.
                </>
              ) : (
                <>
                  Connected to <strong>{apiBase}</strong>.
                </>
              )}
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle>Signed In</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: T.brand,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {user?.initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: T.textTer }}>{user?.role}</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Projects are now maintained in their own admin module">
              Projects
            </SectionTitle>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, marginBottom: 14 }}>
              Projects have moved — manage them under <strong>General → Projects</strong>.
            </div>
            {can("projects:manage") && (
              <Btn variant="default" icon={FolderKanban} onClick={() => navigate("/projects")}>
                Go to Projects
              </Btn>
            )}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 18 }}>
            <LookupListEditor
              title="Risk statuses"
              sub="Workflow states a risk can hold — “Open” and “Closed” are required"
              values={draft.riskStatuses}
              usageCount={usage.riskStatus}
              systemValues={SYSTEM_RISK_STATUSES}
              onChange={(v) => setPart("riskStatuses", v)}
            />
          </Card>

          <Card style={{ padding: 18 }}>
            <SectionTitle sub="Used for every monetary value across the app">Currency</SectionTitle>
            <div style={{ maxWidth: 260 }}>
              <Field label="Display currency">
                <Select
                  value={draft.currency.code}
                  onChange={(code) => {
                    const c = CURRENCIES.find((x) => x.code === code);
                    if (c) setPart("currency", c);
                  }}
                  options={CURRENCIES.map((c) => ({
                    value: c.code,
                    label: `${c.code} (${c.symbol})`,
                  }))}
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Card style={{ padding: 18 }}>
          <LookupListEditor
            title="Project risk categories"
            sub="Categories offered for project-scope risks"
            values={draft.projectRiskCategories}
            usageCount={usage.projectCategory}
            onChange={(v) => setPart("projectRiskCategories", v)}
          />
        </Card>
        <Card style={{ padding: 18 }}>
          <LookupListEditor
            title="Programme risk categories"
            sub="Categories offered for programme-scope risks"
            values={draft.programRiskCategories}
            usageCount={usage.programCategory}
            onChange={(v) => setPart("programRiskCategories", v)}
          />
        </Card>
        <Card style={{ padding: 18 }}>
          <LookupListEditor
            title="Workstreams"
            sub="Delivery workstreams for project-scope risks"
            values={draft.workstreams}
            usageCount={usage.workstream}
            onChange={(v) => setPart("workstreams", v)}
          />
        </Card>
        <Card style={{ padding: 18 }}>
          <LookupListEditor
            title="Change categories"
            sub="Categories offered when raising change requests"
            values={draft.changeCategories}
            usageCount={usage.changeCategory}
            onChange={(v) => setPart("changeCategories", v)}
          />
        </Card>
        <Card style={{ padding: 18 }}>
          <LookupListEditor
            title="Project types"
            sub="Types offered when maintaining projects"
            values={draft.projectTypes}
            usageCount={usage.projectType}
            onChange={(v) => setPart("projectTypes", v)}
          />
        </Card>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            marginTop: 16,
            zIndex: 20,
          }}
        >
          <Card
            style={{
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: T.shadow8,
              border: `1px solid ${alpha(T.brand, 34)}`,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1 }}>
              You have unsaved configuration changes.
            </span>
            <Btn
              variant="subtle"
              icon={RotateCcw}
              onClick={() => setDraft(config)}
              disabled={saving}
            >
              Reset
            </Btn>
            <Btn variant="primary" icon={Save} onClick={() => void save()} loading={saving}>
              Save Configuration
            </Btn>
          </Card>
        </div>
      )}
    </div>
  );
}
