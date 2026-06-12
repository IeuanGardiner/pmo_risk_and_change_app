import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, Pill, Select, TextArea } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { useAppData } from "../../store/AppData";
import { T } from "../../theme/tokens";
import type { Rating, Risk } from "../../types/domain";
import { calcLevel, calcScore, IMPACTS, LIKELIHOODS } from "../../types/lookups";
import { formatDate } from "../../utils/format";

/* ----------------------------------------------------------------------------
   Formal risk review workflow. Logs an append-only review record with who,
   when and what changed: the (re-)assessed likelihood/impact become the risk's
   current scoring, and the next review date is set from the configured cadence
   so the dashboard's overdue-review flag resets automatically.
   -------------------------------------------------------------------------- */

const today = () => new Date().toISOString().slice(0, 10);

/** yyyy-mm-dd plus N days, computed in UTC so no timezone day-shift occurs. */
const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const ratingOptions = (labels: Record<Rating, string>) =>
  ([1, 2, 3, 4, 5] as Rating[]).map((n) => ({ value: n, label: `${n} – ${labels[n]}` }));

export function RiskReviewDialog({
  open,
  risk,
  onClose,
}: {
  open: boolean;
  risk: Risk;
  onClose: () => void;
}) {
  const { config, addRiskReview } = useAppData();
  const toast = useToast();

  const [date, setDate] = useState(today());
  const [likelihood, setLikelihood] = useState(String(risk.likelihood));
  const [impact, setImpact] = useState(String(risk.impact));
  const [comment, setComment] = useState("");
  const [nextReview, setNextReview] = useState("");
  // Stop re-deriving the default once the user has touched the field.
  const [nextEdited, setNextEdited] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset to the risk's current assessment each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const d = today();
    setDate(d);
    setLikelihood(String(risk.likelihood));
    setImpact(String(risk.impact));
    setComment("");
    setNextReview(addDays(d, config.reviewCadenceDays));
    setNextEdited(false);
    setAttempted(false);
  }, [open, risk.likelihood, risk.impact, config.reviewCadenceDays]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const lastReview = risk.reviews[risk.reviews.length - 1];
  const resultingLevel = calcLevel(config.matrix, +likelihood as Rating, +impact as Rating);
  const resultingScore = calcScore(+likelihood as Rating, +impact as Rating);
  const commentError = attempted && !comment.trim() ? "Summarise the review outcome" : undefined;

  const onDateChange = (v: string) => {
    setDate(v);
    if (!nextEdited && v) setNextReview(addDays(v, config.reviewCadenceDays));
  };

  const save = async () => {
    if (!comment.trim() || !date) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    try {
      const previousLevel = risk.level;
      const rec = await addRiskReview(risk.riskReference, {
        date,
        comment: comment.trim(),
        likelihood: +likelihood as Rating,
        impact: +impact as Rating,
        nextReviewDate: nextReview || null,
      });
      toast.success(
        rec.level !== previousLevel
          ? `Review logged for ${risk.riskReference} — risk re-scored to ${rec.level}`
          : `Review logged for ${risk.riskReference}`,
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logging the review failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Log review for ${risk.riskReference}`}
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
      <Card style={{ maxWidth: 520, width: "100%", padding: 22, boxShadow: T.shadow8 }}>
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              Log Review – {risk.riskReference}
            </div>
            <Pill level={risk.level} small />
          </div>
          <div style={{ fontSize: 12.5, color: T.textSec, marginTop: 4 }}>
            {lastReview
              ? `Last reviewed ${formatDate(lastReview.date)} by ${lastReview.reviewer}`
              : "No formal review has been logged yet"}
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginTop: 16 }}
          >
            <Field label="Review Date" required>
              <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
            </Field>
            <div />
            <Field label="Likelihood" required>
              <Select
                value={likelihood}
                onChange={setLikelihood}
                options={ratingOptions(LIKELIHOODS)}
              />
            </Field>
            <Field label="Impact" required>
              <Select value={impact} onChange={setImpact} options={ratingOptions(IMPACTS)} />
            </Field>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textSec }}>
              Resulting level:
            </span>
            <Pill level={resultingLevel} />
            <span style={{ fontSize: 12, color: T.textTer }}>
              {risk.score} → {resultingScore}
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Comment" required error={commentError}>
              <TextArea
                style={{ minHeight: 70 }}
                autoFocus
                placeholder="What was reviewed, what changed and why…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
          </div>

          <div style={{ marginTop: 14, maxWidth: 240 }}>
            <Field label="Next Review Date">
              <Input
                type="date"
                value={nextReview}
                onChange={(e) => {
                  setNextReview(e.target.value);
                  setNextEdited(true);
                }}
              />
            </Field>
            <div style={{ fontSize: 11.5, color: T.textTer, marginTop: 5 }}>
              Defaults to the review date + {config.reviewCadenceDays} days (Settings).
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <Btn variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={() => void save()} loading={saving}>
              Log Review
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
