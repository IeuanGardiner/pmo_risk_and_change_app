import { useEffect } from "react";
import { T } from "../theme/tokens";
import { Btn, Card } from "./ui";

/* ----------------------------------------------------------------------------
   Confirmation dialog for destructive / significant actions (archive risk,
   delete draft change). Escape cancels; the confirm button shows a busy state
   while the mutation runs.
   -------------------------------------------------------------------------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  variant = "danger",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
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
      <Card
        style={{ maxWidth: 440, width: "100%", padding: 22, boxShadow: T.shadow8 }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
          <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, marginTop: 8 }}>
            {message}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <Btn variant="default" onClick={onCancel} disabled={busy}>
              Cancel
            </Btn>
            <Btn variant={variant} onClick={onConfirm} loading={busy}>
              {confirmLabel}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
