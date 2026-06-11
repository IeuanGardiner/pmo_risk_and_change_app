import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { Btn, Field, Input, Select } from "../../components/ui";
import { BrandMark } from "../../components/Brand";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { useTheme } from "../../theme/ThemeProvider";
import { alpha, T } from "../../theme/tokens";
import { BRAND_PRESETS, type BrandingConfig, type ThemeMode } from "../../types/config";

/* ============================================================================
   BrandingEditor — white-label controls: product name, strapline, accent
   colour, logo upload and the default colour scheme. Edits the draft branding;
   the parent's sticky save bar persists it. The live light/dark preference is
   applied immediately (it's a per-user, per-browser choice, not config).
   ========================================================================== */

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match system" },
];

export function BrandingEditor({
  value,
  onChange,
}: {
  value: BrandingConfig;
  onChange: (next: BrandingConfig) => void;
}) {
  const { uploadLogo } = useAppData();
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof BrandingConfig>(k: K, v: BrandingConfig[K]) =>
    onChange({ ...value, [k]: v });

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadLogo(file);
      set("logoUrl", url);
      toast.success("Logo uploaded — save to apply");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Logo + live preview */}
      <Field label="Logo">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BrandMark logoUrl={value.logoUrl} appName={value.appName} size={48} radius={10} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: "none" }}
                onChange={(e) => void onPickFile(e.target.files?.[0])}
              />
              <Btn
                variant="subtle"
                icon={ImageUp}
                loading={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {value.logoUrl ? "Replace" : "Upload"}
              </Btn>
              {value.logoUrl && (
                <Btn variant="subtle" icon={Trash2} onClick={() => set("logoUrl", null)}>
                  Remove
                </Btn>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.textTer }}>
              PNG, JPEG, SVG or WebP · up to 512 KB
            </div>
          </div>
        </div>
      </Field>

      <Field label="Product name">
        <Input
          value={value.appName}
          maxLength={60}
          placeholder="e.g. Company X Risk & Change Portal"
          onChange={(e) => set("appName", e.target.value)}
        />
      </Field>

      <Field label="Strapline">
        <Input
          value={value.tagline}
          maxLength={60}
          placeholder="e.g. Risk & Change"
          onChange={(e) => set("tagline", e.target.value)}
        />
      </Field>

      {/* Accent colour: presets + custom picker */}
      <Field label="Accent colour">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {BRAND_PRESETS.map((p) => {
            const active = value.brandColor.toLowerCase() === p.value.toLowerCase();
            return (
              <button
                key={p.value}
                title={p.label}
                aria-label={p.label}
                aria-pressed={active}
                onClick={() => set("brandColor", p.value)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: p.value,
                  cursor: "pointer",
                  border: active ? `2px solid ${T.text}` : `1px solid ${alpha(T.text, 20)}`,
                  outline: active ? `2px solid ${alpha(p.value, 40)}` : "none",
                  outlineOffset: 1,
                }}
              />
            );
          })}
          <span style={{ width: 1, height: 22, background: T.stroke, margin: "0 2px" }} />
          <input
            type="color"
            value={value.brandColor}
            aria-label="Custom accent colour"
            onChange={(e) => set("brandColor", e.target.value)}
            style={{
              width: 34,
              height: 30,
              padding: 0,
              border: `1px solid ${T.stroke}`,
              borderRadius: 6,
              background: T.surface,
              cursor: "pointer",
            }}
          />
          <code
            style={{
              fontSize: 12,
              color: T.textSec,
              background: T.bg,
              padding: "3px 7px",
              borderRadius: 4,
            }}
          >
            {value.brandColor.toUpperCase()}
          </code>
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Default colour scheme">
          <Select
            value={value.defaultTheme}
            onChange={(v) => set("defaultTheme", v as ThemeMode)}
            options={THEME_OPTIONS}
          />
        </Field>
        <Field label="Preview on this device">
          <Select
            value={preference}
            onChange={(v) => setPreference(v as ThemeMode)}
            options={THEME_OPTIONS}
          />
        </Field>
      </div>
      <div style={{ fontSize: 11.5, color: T.textTer, marginTop: -6 }}>
        “Default colour scheme” is the deployment default (saved with the config). “Preview on this
        device” is your personal override, remembered in this browser only.
      </div>
    </div>
  );
}
