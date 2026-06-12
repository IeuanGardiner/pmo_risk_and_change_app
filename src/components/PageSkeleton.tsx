import { T } from "../theme/tokens";

const SkeletonBlock = ({ width, height }: { width: string; height: number }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 4,
      background: T.strokeSubtle,
      animation: "rs-pulse 1.4s ease-in-out infinite",
    }}
  />
);

export function PageSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <style>{`@keyframes rs-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <SkeletonBlock width="220px" height={28} />
        <SkeletonBlock width="130px" height={34} />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: T.surface,
            border: `1px solid ${T.stroke}`,
            borderRadius: 8,
            marginBottom: 14,
            padding: 18,
          }}
        >
          <SkeletonBlock width="55%" height={16} />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            {[0, 1, 2].map((j) => (
              <SkeletonBlock key={j} width={j % 2 === 0 ? "80%" : "60%"} height={12} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
