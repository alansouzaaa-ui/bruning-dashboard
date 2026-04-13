import styles from './Gauge.module.css'

// ── Constantes do layout SVG ──────────────────────────────
const RADIUS       = 78
const STROKE_WIDTH = 16
const CENTER_X     = 110
const CENTER_Y     = 105

/** Cap visual: 130% = 30% acima da meta para dar espaço na escala */
const GAUGE_MAX_PCT = 130

function colorForPct(pct) {
  if (pct < 50)  return '#ff4d6a'
  if (pct < 80)  return '#ffb830'
  if (pct < 100) return '#e5e578'
  return '#ccf46a'
}

/**
 * Gauge semi-circular SVG reutilizável.
 *
 * @param {{ pct: number, label: string }} props
 *   pct   — percentual de atingimento (0–130+)
 *   label — texto abaixo do percentual (ex.: "MRR", "Adesão")
 */
export default function Gauge({ pct, label }) {
  const arc     = Math.PI * RADIUS
  const clamped = Math.min(pct, GAUGE_MAX_PCT)
  const filled  = (clamped / GAUGE_MAX_PCT) * arc
  const color   = colorForPct(pct)
  const glow    = pct >= 100 ? `drop-shadow(0 0 6px ${color})` : 'none'

  // Posição do marcador de 100% na escala visual
  const marker100Angle = Math.PI * (100 / GAUGE_MAX_PCT)
  const markerX1 = CENTER_X + RADIUS       * Math.cos(Math.PI - marker100Angle)
  const markerY1 = CENTER_Y - RADIUS       * Math.sin(marker100Angle)
  const markerX2 = CENTER_X + (RADIUS + 10) * Math.cos(Math.PI - marker100Angle)
  const markerY2 = CENTER_Y - (RADIUS + 10) * Math.sin(marker100Angle)

  const arcPath = `M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`

  return (
    <svg viewBox="0 0 220 115" className={styles.svg}>
      {/* Trilha de fundo */}
      <path
        d={arcPath}
        fill="none"
        stroke="#141c2e"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      {/* Progresso */}
      <path
        d={arcPath}
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${arc}`}
        className={styles.gaugeArc}
        style={{ filter: glow }}
      />
      {/* Marcador de 100% */}
      <line
        x1={markerX1} y1={markerY1}
        x2={markerX2} y2={markerY2}
        stroke="rgba(204,244,106,.4)"
        strokeWidth="1.5"
      />
      {/* Percentual */}
      <text x={CENTER_X} y={CENTER_Y - 20} textAnchor="middle" className={styles.gaugePct} fill={color}>
        {pct}%
      </text>
      {/* Label */}
      <text x={CENTER_X} y={CENTER_Y - 4} textAnchor="middle" className={styles.gaugeLabel} fill="var(--muted)">
        {label}
      </text>
    </svg>
  )
}
