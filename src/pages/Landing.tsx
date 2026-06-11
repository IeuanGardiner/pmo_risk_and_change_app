import { T } from "../theme/tokens";
import { loadCachedBranding } from "../theme/branding";
import { BrandMark } from "../components/Brand";
import { Spinner, Btn } from "../components/ui";

/* Wireframe 00 — Landing / loading screen, shown while services initialise.
   Reads the cached branding so the splash carries the client's identity even
   before the config service responds. */
export function Landing({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  const { appName, tagline, logoUrl } = loadCachedBranding();
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <BrandMark logoUrl={logoUrl} appName={appName} size={64} radius={14} />
        </div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 26 }}>{appName}</div>
        <div style={{ color: T.sidebarText, fontSize: 13, marginTop: 4 }}>{tagline}</div>
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
