import { T } from "../theme/tokens";

/* ============================================================================
   BrandMark — the app logo. Renders the client's uploaded image when one is
   configured (branding.logoUrl), otherwise the built-in three-bar mark on the
   accent colour. Used by the sidebar and the splash screen.
   ========================================================================== */
export function BrandMark({
  logoUrl,
  appName,
  size = 34,
  radius = 8,
}: {
  logoUrl: string | null;
  appName: string;
  size?: number;
  radius?: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${appName} logo`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: "contain",
          flexShrink: 0,
          background: "#fff",
        }}
      />
    );
  }

  const barW = size * 0.47;
  const barH = size * 0.07;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: T.logo,
        borderRadius: radius,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <div
        style={{
          width: barW,
          height: size * 0.35,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ height: barH, background: "#fff", borderRadius: 2 }} />
        ))}
      </div>
    </div>
  );
}
