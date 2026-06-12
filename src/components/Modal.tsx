import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { T } from "../theme/tokens";
import { Card } from "./ui";

/* ----------------------------------------------------------------------------
   Generic modal for forms (invite user, edit roles…). Escape and the backdrop
   close it; ConfirmDialog remains the right choice for yes/no confirmations.
   -------------------------------------------------------------------------- */
export function Modal({
  open,
  title,
  width = 480,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  width?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.42)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <Card style={{ maxWidth: width, width: "100%", boxShadow: T.shadow8, maxHeight: "90vh", overflow: "auto" }}>
        <div role="document" onClick={(e) => e.stopPropagation()} style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.textTer,
                padding: 4,
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ marginTop: 14 }}>{children}</div>
        </div>
      </Card>
    </div>
  );
}
