import { ChevronDown, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  CHANGE_STATUS_STYLES,
  LEVEL_STYLES,
  PRIORITY_COLORS,
  RISK_STATUS_COLORS,
  T,
} from "../theme/tokens";
import type { ChangePriority, ChangeStatus, RiskLevel, RiskStatus } from "../types/domain";

/* ---- Surfaces ------------------------------------------------------------ */
export const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.stroke}`,
      borderRadius: 8,
      boxShadow: T.shadow2,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ---- Badges --------------------------------------------------------------- */
export const Pill = ({ level, small }: { level: RiskLevel; small?: boolean }) => {
  const s = LEVEL_STYLES[level];
  return (
    <span
      style={{
        color: s.c,
        background: s.bg,
        border: `1px solid ${s.c}33`,
        borderRadius: 4,
        padding: small ? "1px 7px" : "3px 9px",
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
};

export const RiskStatusText = ({ status }: { status: RiskStatus }) => (
  <span style={{ color: RISK_STATUS_COLORS[status], fontWeight: 600, fontSize: 13 }}>{status}</span>
);

export const ChangeStatusPill = ({ status, small }: { status: ChangeStatus; small?: boolean }) => {
  const s = CHANGE_STATUS_STYLES[status];
  return (
    <span
      style={{
        color: s.c,
        background: s.bg,
        border: `1px solid ${s.c}33`,
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

export const PriorityText = ({ priority }: { priority: ChangePriority }) => (
  <span style={{ color: PRIORITY_COLORS[priority], fontWeight: 600, fontSize: 13 }}>{priority}</span>
);

/* ---- Buttons --------------------------------------------------------------- */
type BtnVariant = "primary" | "dark" | "default" | "subtle" | "danger" | "success";

export const Btn = ({
  children,
  onClick,
  variant = "default",
  icon: Icon,
  style,
  disabled,
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  icon?: LucideIcon;
  style?: CSSProperties;
  disabled?: boolean;
  title?: string;
}) => {
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: { background: T.brand, color: "#fff", border: `1px solid ${T.brand}` },
    dark: { background: T.sidebar, color: "#fff", border: `1px solid ${T.sidebar}` },
    default: { background: T.surface, color: T.text, border: `1px solid ${T.stroke}` },
    subtle: { background: "transparent", color: T.text, border: `1px solid ${T.stroke}` },
    danger: { background: T.critical, color: "#fff", border: `1px solid ${T.critical}` },
    success: { background: T.low, color: "#fff", border: `1px solid ${T.low}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.font,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
};

/* ---- Form fields ------------------------------------------------------------ */
export const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>
      {label}
      {required && <span style={{ color: T.critical }}> *</span>}
    </label>
    {children}
  </div>
);

export const inputStyle: CSSProperties = {
  padding: "8px 10px",
  border: `1px solid ${T.stroke}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  color: T.text,
  background: T.surface,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} style={{ ...inputStyle, ...props.style }} />
);

export const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    style={{ ...inputStyle, minHeight: 64, resize: "vertical", ...props.style }}
  />
);

export interface SelectOption {
  value: string | number;
  label: string;
}

export const Select = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string | number;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div style={{ position: "relative" }}>
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, appearance: "none", paddingRight: 28 }}
    >
      <option value="">{placeholder || "Select…"}</option>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
    <ChevronDown
      size={14}
      style={{ position: "absolute", right: 9, top: 11, color: T.textTer, pointerEvents: "none" }}
    />
  </div>
);

/* ---- Page scaffolding ---------------------------------------------------------- */
export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 18,
    }}
  >
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12.5, color: T.textTer, marginTop: 2 }}>{subtitle}</div>}
    </div>
    {action}
  </div>
);

export const SectionTitle = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{children}</div>
    {sub && <div style={{ fontSize: 12, color: T.textTer, marginTop: 2 }}>{sub}</div>}
  </div>
);

export const SubHead = ({ children }: { children: ReactNode }) => (
  <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, marginBottom: 14 }}>{children}</div>
);

export const Grid2 = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 28px" }}>{children}</div>
);

export const Divider = () => (
  <div style={{ height: 1, background: T.strokeSubtle, margin: "22px 0" }} />
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div style={{ padding: 40, textAlign: "center", color: T.textTer, fontSize: 13 }}>{children}</div>
);

/* ---- Loading spinner --------------------------------------------------------- */
export const Spinner = ({ size = 28 }: { size?: number }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      border: `3px solid ${T.strokeSubtle}`,
      borderTopColor: T.brand,
      borderRadius: "50%",
      animation: "rs-spin 0.9s linear infinite",
    }}
  />
);
