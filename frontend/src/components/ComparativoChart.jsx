import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { getComparativo } from '../api'
import styles from './ComparativoChart.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function ComparativoChart() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['comparativo'],
    queryFn: getComparativo,
  })

  const chartData = data.map(d => ({
    name: d.label,
    MRR: +d.mrr,
    Adesão: +d.adesao,
    vendas: d.vendas,
  }))

  return (
    <div className={`card ${styles.card}`}>
      <h3 className={styles.title}>Comparativo — Últimos 6 Meses</h3>
      {isLoading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            <Bar dataKey="MRR"    fill="rgba(204,244,106,.8)" radius={[4,4,0,0]} />
            <Bar dataKey="Adesão" fill="rgba(96,165,250,.8)"  radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
