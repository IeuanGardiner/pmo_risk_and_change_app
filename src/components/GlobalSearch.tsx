import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { T } from "../theme/tokens";
import { useAppData } from "../store/AppData";

/* ----------------------------------------------------------------------------
   Global search (sidebar) — finds risks and changes by reference, title or
   owner. Full keyboard support: ↑/↓ to move, Enter to open, Escape to close.
   -------------------------------------------------------------------------- */

interface Hit {
  kind: "Risk" | "Change";
  reference: string;
  title: string;
  archived: boolean;
  to: string;
}

const MAX_HITS = 8;

export function GlobalSearch() {
  const { risks, changes } = useAppData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = (...fields: (string | null)[]) =>
      fields.some((f) => f?.toLowerCase().includes(q));
    const riskHits: Hit[] = risks
      .filter((r) => matches(r.riskReference, r.title, r.owner))
      .slice(0, MAX_HITS)
      .map((r) => ({
        kind: "Risk",
        reference: r.riskReference,
        title: r.title,
        archived: r.archived,
        to: `/risks/${r.riskReference}`,
      }));
    const changeHits: Hit[] = changes
      .filter((c) => matches(c.changeReference, c.title, c.owner))
      .slice(0, MAX_HITS)
      .map((c) => ({
        kind: "Change",
        reference: c.changeReference,
        title: c.title,
        archived: false,
        to: `/changes/${c.changeReference}`,
      }));
    return [...riskHits, ...changeHits].slice(0, MAX_HITS);
  }, [query, risks, changes]);

  const close = () => {
    setQuery("");
    setHighlight(0);
  };

  const open = (hit: Hit) => {
    navigate(hit.to);
    close();
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (hits.length === 0) {
      if (e.key === "Escape") close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      open(hits[Math.min(highlight, hits.length - 1)]);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <div style={{ position: "relative", padding: "0 12px 6px" }}>
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: T.textTer,
            pointerEvents: "none",
          }}
        />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-label="Search risks and changes"
          placeholder="Search risks & changes…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 10px 8px 30px",
            borderRadius: 6,
            border: "none",
            outline: "none",
            background: T.sidebarItem,
            color: "#fff",
            fontSize: 12.5,
            fontFamily: T.font,
          }}
        />
      </div>
      {hits.length > 0 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 12,
            right: 12,
            zIndex: 60,
            background: T.surface,
            border: `1px solid ${T.stroke}`,
            borderRadius: 6,
            boxShadow: T.shadow8,
            overflow: "hidden",
          }}
        >
          {hits.map((h, i) => (
            <div
              key={`${h.kind}-${h.reference}`}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                open(h);
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
                background: i === highlight ? T.brandBg : T.surface,
                borderTop: i === 0 ? "none" : `1px solid ${T.strokeSubtle}`,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  fontWeight: 700,
                  fontSize: 10.5,
                  color: h.kind === "Risk" ? T.critical : T.brand,
                }}
              >
                {h.reference}
              </span>
              <span
                style={{
                  color: T.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {h.title}
              </span>
              {h.archived && (
                <span style={{ fontSize: 10, color: T.textTer, fontWeight: 600 }}>archived</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
