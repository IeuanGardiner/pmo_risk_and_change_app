import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { T } from "../theme/tokens";

/* ----------------------------------------------------------------------------
   Lightweight toast notifications — success/error feedback for every
   mutation. No dependencies; auto-dismisses after 4s, click to dismiss.
   -------------------------------------------------------------------------- */

type ToastKind = "success" | "error";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_STYLES: Record<ToastKind, { c: string; bg: string; icon: typeof CheckCircle2 }> = {
  success: { c: T.low, bg: T.lowBg, icon: CheckCircle2 },
  error: { c: T.critical, bg: T.criticalBg, icon: XCircle },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1100,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 380,
        }}
      >
        {toasts.map((t) => {
          const s = KIND_STYLES[t.kind];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                padding: "11px 14px",
                background: s.bg,
                border: `1px solid ${s.c}55`,
                borderLeft: `3px solid ${s.c}`,
                borderRadius: 6,
                boxShadow: T.shadow8,
                fontSize: 13,
                color: T.text,
                fontFamily: T.font,
                cursor: "pointer",
              }}
            >
              <Icon size={16} style={{ color: s.c, flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.45 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
