import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import {
  cloneElement,
  isValidElement,
  useId,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  alpha,
  CHANGE_STATUS_STYLES,
  LEVEL_STYLES,
  PRIORITY_COLORS,
  riskStatusColor,
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
        border: `1px solid ${alpha(s.c, 20)}`,
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
  <span style={{ color: riskStatusColor(status), fontWeight: 600, fontSize: 13 }}>{status}</span>
);

export const ChangeStatusPill = ({ status, small }: { status: ChangeStatus; small?: boolean }) => {
  const s = CHANGE_STATUS_STYLES[status];
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
  loading,
  title,
  type,
  "aria-label": ariaLabel,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  icon?: LucideIcon;
  style?: CSSProperties;
  disabled?: boolean;
  /** Disables the button and shows an inline spinner while a mutation runs. */
  loading?: boolean;
  title?: string;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  "aria-label"?: string;
}) => {
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: { background: T.brand, color: "#fff", border: `1px solid ${T.brand}` },
    dark: { background: T.sidebar, color: "#fff", border: `1px solid ${T.sidebar}` },
    default: { background: T.surface, color: T.text, border: `1px solid ${T.stroke}` },
    subtle: { background: "transparent", color: T.text, border: `1px solid ${T.stroke}` },
    danger: { background: T.critical, color: "#fff", border: `1px solid ${T.critical}` },
    success: { background: T.low, color: "#fff", border: `1px solid ${T.low}` },
  };
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      type={type}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.font,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {loading ? (
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            border: "2px solid currentColor",
            borderRightColor: "transparent",
            borderRadius: "50%",
            animation: "rs-spin 0.8s linear infinite",
          }}
        />
      ) : (
        Icon && <Icon size={15} />
      )}
      {children}
    </button>
  );
};

/* ---- Form fields ------------------------------------------------------------ */
export const Field = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) => {
  const id = useId();
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; "aria-invalid"?: boolean }>, {
        id,
        "aria-invalid": error ? true : undefined,
      })
    : children;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>
        {label}
        {required && <span style={{ color: T.critical }}> *</span>}
      </label>
      {child}
      {error && (
        <div role="alert" style={{ fontSize: 11.5, color: T.critical, fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  );
};

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
  <input
    {...props}
    style={{
      ...inputStyle,
      ...(props["aria-invalid"] ? { borderColor: T.critical } : undefined),
      ...props.style,
    }}
  />
);

export const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    style={{
      ...inputStyle,
      minHeight: 64,
      resize: "vertical",
      ...(props["aria-invalid"] ? { borderColor: T.critical } : undefined),
      ...props.style,
    }}
  />
);

export interface SelectOption {
  value: string | number;
  label: string;
}

export const Select = ({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled,
  id,
  "aria-invalid": ariaInvalid,
}: {
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: (SelectOption | string)[];
  /** When set, an empty "clear" option is offered; omit for required enums. */
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
}) => (
  <div style={{ position: "relative" }}>
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={{
        ...inputStyle,
        appearance: "none",
        paddingRight: 28,
        ...(ariaInvalid ? { borderColor: T.critical } : undefined),
      }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
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

/* ---- Tables ----------------------------------------------------------------- */
export const SortableTh = ({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) => (
  <th
    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    style={{ padding: 0, textAlign: "left" }}
  >
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        width: "100%",
        padding: "10px 14px",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: T.font,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        color: active ? T.brand : "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {active && (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  </th>
);

export const Pagination = ({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) => {
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderTop: `1px solid ${T.strokeSubtle}`,
        fontSize: 12.5,
        color: T.textSec,
      }}
    >
      <span>
        Showing {from}–{to} of {total}
      </span>
      {pageCount > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Btn variant="subtle" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Go to previous page">
            Previous
          </Btn>
          <span style={{ fontWeight: 600 }}>
            Page {page + 1} of {pageCount}
          </span>
          <Btn variant="subtle" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} aria-label="Go to next page">
            Next
          </Btn>
        </div>
      )}
    </div>
  );
};

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

export const EmptyState = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div style={{ padding: 40, textAlign: "center", color: T.textTer, fontSize: 13 }}>
    {children}
    {action && <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>{action}</div>}
  </div>
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
