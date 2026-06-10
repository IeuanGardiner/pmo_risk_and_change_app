import { T } from "../theme/tokens";
import { Spinner, Btn } from "../components/ui";

/* Wireframe 00 — Landing / loading screen, shown while services initialise. */
export function Landing({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: T.sidebar,
        fontFamily: T.font,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: T.logo,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            margin: "0 auto 18px",
          }}
        >
          <div
            style={{
              width: 30,
              height: 22,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ height: 4.5, background: "#fff", borderRadius: 3 }} />
            ))}
          </div>
        </div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 26 }}>RiskShield</div>
        <div style={{ color: T.sidebarText, fontSize: 13, marginTop: 4 }}>
          Project &amp; Programme Risk + Change
        </div>
        <div style={{ marginTop: 28 }}>
          {error ? (
            <div>
              <div style={{ color: "#F1707B", fontSize: 13, marginBottom: 14, maxWidth: 420 }}>
                {error}
              </div>
              <Btn variant="primary" onClick={onRetry}>
                Retry
              </Btn>
            </div>
          ) : (
            <>
              <Spinner />
              <div style={{ color: T.textTer, fontSize: 12, marginTop: 12 }}>
                Connecting to data services…
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
