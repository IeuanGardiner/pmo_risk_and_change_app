import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Btn, Input, SectionTitle } from "../../components/ui";
import { T } from "../../theme/tokens";

/* ----------------------------------------------------------------------------
   Editable lookup list (categories, workstreams). Values that are in use by
   existing records cannot be renamed or deleted — the usage count is shown so
   admins know why.
   -------------------------------------------------------------------------- */
export function LookupListEditor({
  title,
  sub,
  values,
  usageCount,
  onChange,
}: {
  title: string;
  sub?: string;
  values: string[];
  /** How many records currently use a value (rename/delete blocked when > 0). */
  usageCount: (value: string) => number;
  onChange: (next: string[]) => void;
}) {
  const [newValue, setNewValue] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [issue, setIssue] = useState<string | null>(null);

  const isDuplicate = (v: string, ignore?: string) =>
    values.some((x) => x !== ignore && x.toLowerCase() === v.toLowerCase());

  const add = () => {
    const v = newValue.trim();
    if (!v) return;
    if (isDuplicate(v)) {
      setIssue(`"${v}" already exists`);
      return;
    }
    onChange([...values, v]);
    setNewValue("");
    setIssue(null);
  };

  const commitRename = (original: string) => {
    const v = editValue.trim();
    if (!v || v === original) {
      setEditing(null);
      return;
    }
    if (isDuplicate(v, original)) {
      setIssue(`"${v}" already exists`);
      return;
    }
    onChange(values.map((x) => (x === original ? v : x)));
    setEditing(null);
    setIssue(null);
  };

  const remove = (v: string) => {
    if (values.length <= 1) {
      setIssue("At least one value must remain");
      return;
    }
    onChange(values.filter((x) => x !== v));
    setIssue(null);
  };

  return (
    <div>
      <SectionTitle sub={sub}>{title}</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {values.map((v) => {
          const uses = usageCount(v);
          const locked = uses > 0;
          const isEditing = editing === v;
          return (
            <div
              key={v}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 0",
                borderBottom: `1px solid ${T.strokeSubtle}`,
                fontSize: 13,
              }}
            >
              {isEditing ? (
                <>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={editValue}
                      autoFocus
                      aria-label={`Rename ${v}`}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(v);
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                  </div>
                  <IconBtn label="Save name" onClick={() => commitRename(v)}>
                    <Check size={14} />
                  </IconBtn>
                  <IconBtn label="Cancel rename" onClick={() => setEditing(null)}>
                    <X size={14} />
                  </IconBtn>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 600, color: T.text }}>{v}</span>
                  {uses > 0 && (
                    <span
                      title={`Used by ${uses} record${uses === 1 ? "" : "s"}`}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.textSec,
                        background: T.bg,
                        borderRadius: 10,
                        padding: "2px 8px",
                      }}
                    >
                      {uses} in use
                    </span>
                  )}
                  <IconBtn
                    label={locked ? `Cannot rename — in use by ${uses} records` : `Rename ${v}`}
                    disabled={locked}
                    onClick={() => {
                      setEditing(v);
                      setEditValue(v);
                    }}
                  >
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn
                    label={locked ? `Cannot delete — in use by ${uses} records` : `Delete ${v}`}
                    disabled={locked}
                    danger
                    onClick={() => remove(v)}
                  >
                    <Trash2 size={14} />
                  </IconBtn>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Add a value…"
            aria-label={`Add to ${title}`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <Btn variant="default" icon={Plus} onClick={add} disabled={!newValue.trim()}>
          Add
        </Btn>
      </div>
      {issue && (
        <div role="alert" style={{ fontSize: 12, color: T.critical, fontWeight: 600, marginTop: 7 }}>
          {issue}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "grid",
        placeItems: "center",
        width: 26,
        height: 26,
        borderRadius: 5,
        border: `1px solid ${T.stroke}`,
        background: T.surface,
        color: disabled ? T.textTer : danger ? T.critical : T.textSec,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
