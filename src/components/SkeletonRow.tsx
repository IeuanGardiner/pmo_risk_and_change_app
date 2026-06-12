import { T } from "../theme/tokens";

const SkeletonCell = ({ width, animate }: { width: string; animate?: boolean }) => (
  <td style={{ padding: "11px 14px" }}>
    <div
      style={{
        width,
        height: 12,
        borderRadius: 4,
        background: T.strokeSubtle,
        animation: animate !== false ? "rs-pulse 1.4s ease-in-out infinite" : undefined,
      }}
    />
  </td>
);

export function SkeletonRow() {
  return (
    <tr style={{ borderTop: `1px solid ${T.strokeSubtle}` }}>
      <SkeletonCell width="48px" />
      <SkeletonCell width="170px" />
      <SkeletonCell width="95px" />
      <SkeletonCell width="65px" />
      <SkeletonCell width="85px" />
      <SkeletonCell width="70px" />
      <SkeletonCell width="70px" />
    </tr>
  );
}
