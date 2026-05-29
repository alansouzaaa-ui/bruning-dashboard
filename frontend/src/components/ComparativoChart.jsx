import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { getComparativo } from '../api'
import { fmt } from '../utils/fmt'
import styles from './ComparativoChart.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const COLOR_MRR  = '#ccf46a'
const COLOR_ADES = '#00d4ff'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span style={{ color: 'var(--text1)' }}>{p.name}:</span>
          <span style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ComparativoChart() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['comparativo'],
    queryFn: getComparativo,
  })

  const chartData = data.map((d, i) => ({
    name: d.label,
    MRR: +d.mrr,
    Adesão: +d.adesao,
    isLast: i === data.length - 1,
  }))

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>MRR — Últimos 6 Meses</h3>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: COLOR_MRR }} />
            MRR
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: COLOR_ADES }} />
            Adesão
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chartData} barGap={3} barCategoryGap="32%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--mono)' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,.04)' }}
            />
            <Bar dataKey="MRR" radius={[5, 5, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isLast
                    ? COLOR_MRR
                    : 'rgba(204,244,106,.35)'}
                />
              ))}
            </Bar>
            <Bar dataKey="Adesão" radius={[5, 5, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isLast
                    ? COLOR_ADES
                    : 'rgba(0,212,255,.3)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

