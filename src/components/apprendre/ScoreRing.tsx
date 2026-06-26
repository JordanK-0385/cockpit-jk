/** Anneau de score — couleur selon la performance. Réutilisé fiche & révision. */
export function ScoreRing({
  pct,
  size = 48,
  label,
}: {
  pct: number
  size?: number
  label?: string
}) {
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const offset = c * (1 - clamped / 100)
  const color = clamped >= 80 ? '#7DD3A0' : clamped >= 50 ? '#A5D8E6' : '#E8946A'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-medium"
        style={{ color }}
      >
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  )
}
