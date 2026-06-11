import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, TextArea } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { RISK_EVENT_STYLES, T } from "../../theme/tokens";
import type { Risk, RiskEventType } from "../../types/domain";
import { RISK_EVENT_TYPES } from "../../types/lookups";
import { currencySymbol, moneyFull, parseNum } from "../../utils/format";

/* ----------------------------------------------------------------------------
   Update / close-risk workflow. Logs a draw-down event against a risk:
     - Realised  the risk happened — record the actual cost and when.
     - Released  value handed back (in full or in part); can close the risk.
     - Reduced   the estimate is revised down while the risk stays open.
   The risk's realised / released / reduced totals are derived from these
   entries, so the charts and reports reflect what actually happened, when.
   -------------------------------------------------------------------------- */

const HELP: Record<RiskEventType, string> = {
  Realised: "The risk has occurred. Record the cost incurred and the date it happened.",
  Released: "The risk (or part of it) will not occur — release the value back to the budget.",
  Reduced: "Revise the estimated exposure down while keeping the risk open.",
};

const today = () => new Date().toISOString().slice(0, 10);

export function RiskUpdateDialog({
  open,
  risk,
  defaultType = "Realised",
  prefillRemaining = false,
  defaultClose = false,
  onClose,
}: {
  open: boolean;
  risk: Risk;
  defaultType?: RiskEventType;
  /** Pre-fill the amount with the remaining open exposure (used by Close Risk). */
  prefillRemaining?: boolean;
  defaultClose?: boolean;
  onClose: () => void;
}) {
  const { addRiskEvent } = useAppData();
  const toast = useToast();

  const remaining = Math.max(
    risk.estimatedTotal - risk.realisedTotal - risk.releasedTotal - risk.reducedTotal,
    0,
  );

  const [type, setType] = useState<RiskEventType>(defaultType);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [closeRisk, setCloseRisk] = useState(defaultClose);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset to the requested defaults each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setAmount(prefillRemaining ? String(remaining) : "");
    setDate(today());
    setNote("");
    setCloseRisk(defaultClose);
    setAttempted(false);
  }, [open, defaultType, defaultClose, prefillRemaining, remaining]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const value = parseNum(amount);
  const amountError =
    attempted && !(value > 0) ? "Enter an amount greater than zero" : undefined;
  const overRemaining = type !== "Realised" && value > remaining + 1;

  const save = async () => {
    if (!(value > 0)) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      await addRiskEvent(risk.riskReference, {
        type,
        amount: value,
        date,
        note,
        closeRisk,
      });
      toast.success(
        closeRisk
          ? `${risk.riskReference} updated and closed`
          : `${type} update logged against ${risk.riskReference}`,
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logging the update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Log update for ${risk.riskReference}`}
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
      <Card style={{ maxWidth: 480, width: "100%", padding: 22, boxShadow: T.shadow8 }}>
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
            Log Risk Update – {risk.riskReference}
          </div>
          <div style={{ fontSize: 12.5, color: T.textSec, marginTop: 4 }}>
            Remaining open exposure: <strong>{moneyFull(remaining)}</strong>
          </div>

          {/* Event type */}
          <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
            {RISK_EVENT_TYPES.map((t) => {
              const s = RISK_EVENT_STYLES[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: T.font,
                    cursor: "pointer",
                    background: active ? s.bg : T.surface,
                    color: active ? s.c : T.textSec,
                    border: `1px solid ${active ? s.c : T.stroke}`,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: T.textTer, marginTop: 8, lineHeight: 1.5 }}>
            {HELP[type]}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginTop: 16 }}>
            <Field label={`Amount (${currencySymbol()})`} required error={amountError}>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={type === "Realised" ? "Date incurred" : "Date actioned"} required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          {overRemaining && (
            <div style={{ fontSize: 11.5, color: T.high, fontWeight: 600, marginTop: -4 }}>
              That is more than the remaining exposure of {moneyFull(remaining)}.
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Field label="Note">
              <TextArea
                style={{ minHeight: 70 }}
                placeholder="Explain what changed and why…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              fontSize: 13,
              fontWeight: 600,
              color: T.text,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={closeRisk}
              onChange={(e) => setCloseRisk(e.target.checked)}
              style={{ accentColor: T.brand }}
            />
            Close this risk after logging the update
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <Btn variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={() => void save()} loading={saving}>
              {closeRisk ? "Log & Close Risk" : "Log Update"}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
