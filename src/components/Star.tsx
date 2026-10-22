// The eight-point star: SAC's recurring geometric motif.

export function StarMark({ size = 34, fill = "#007041", center = "#F1C85D" }: { size?: number; fill?: string; center?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g transform="translate(20 20)">
        <rect x="-12" y="-12" width="24" height="24" fill={fill} />
        <rect x="-12" y="-12" width="24" height="24" fill={fill} transform="rotate(45)" />
        <circle r="5" fill={center} />
      </g>
    </svg>
  );
}

// An outlined star with rings, used as a large slow-turning decoration.
export function StarOutline({
  size,
  stroke = "#E2E8E2",
  inner,
  strokeWidth = 0.5,
  className = "",
  style,
}: {
  size: number;
  stroke?: string;
  inner?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className} style={style}>
      <g transform="translate(50 50)" fill="none" stroke={stroke} strokeWidth={strokeWidth}>
        <rect x="-34" y="-34" width="68" height="68" />
        <rect x="-34" y="-34" width="68" height="68" transform="rotate(45)" />
        {inner && (
          <>
            <rect x="-22" y="-22" width="44" height="44" stroke={inner} />
            <rect x="-22" y="-22" width="44" height="44" transform="rotate(45)" stroke={inner} />
          </>
        )}
        <circle r="48" />
      </g>
    </svg>
  );
}
