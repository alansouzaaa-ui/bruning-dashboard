import { useQuery } from '@tanstack/react-query'
import { getKPIs, getMeses } from '../api'
import styles from './KPICards.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function TrendBadge({ curr, prev, prefix = '' }) {
  if (prev == null || prev === 0) return null
  const diff = curr - prev
  const pct = Math.round((diff / prev) * 100)
  const cls = diff > 0 ? 'trend-up' : diff < 0 ? 'trend-down' : 'trend-flat'
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—'
  return (
    <span className={cls}>
      {arrow} {Math.abs(pct)}%{prefix}
    </span>
  )
}

function KPICard({ title, value, sub, trend }) {
  return (
    <div className={`card ${styles.card}`}>
      <span className={styles.title}>{title}</span>
      <span className={styles.value}>{value}</span>
      <div className={styles.footer}>
        <span className={styles.sub}>{sub}</span>
        {trend}
      </div>
    </div>
  )
}

export default function KPICards({ mes }) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis', mes],
    queryFn: () => getKPIs(mes),
  })

  // KPI do mês anterior para comparação
  const { data: meses = [] } = useQuery({ queryKey: ['meses'], queryFn: getMeses })
  const idxAtual = meses.findIndex(m => m.valor === mes)
  const mesPrev = idxAtual > 0 ? meses[idxAtual - 1].valor : null

  const { data: kpisPrev } = useQuery({
    queryKey: ['kpis', mesPrev],
    queryFn: () => getKPIs(mesPrev),
    enabled: !!mesPrev && !!mes,
  })

  if (isLoading || !kpis) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`card ${styles.card} ${styles.skeleton}`} />
        ))}
      </div>
    )
  }

  const p = kpisPrev

  return (
    <div className={styles.grid}>
      <KPICard
        title="MRR Ativo"
        value={fmt(kpis.total_mrr)}
        sub={`${kpis.ativos} clientes ativos`}
        trend={<TrendBadge curr={+kpis.total_mrr} prev={p ? +p.total_mrr : null} />}
      />
      <KPICard
        title="Adesão"
        value={fmt(kpis.total_adesao)}
        sub="total no período"
        trend={<TrendBadge curr={+kpis.total_adesao} prev={p ? +p.total_adesao : null} />}
      />
      <KPICard
        title="Ticket Médio"
        value={fmt(kpis.ticket_medio)}
        sub="por cliente ativo"
        trend={<TrendBadge curr={+kpis.ticket_medio} prev={p ? +p.ticket_medio : null} />}
      />
      <KPICard
        title="Ativos"
        value={kpis.ativos}
        sub={`${kpis.anuais} anuais · ${kpis.mensais} mensais`}
      />
      <KPICard
        title="Churns"
        value={kpis.churns}
        sub={`${fmt(kpis.churn_mrr)} MRR perdido`}
      />
      <KPICard
        title="Contratos Anuais"
        value={kpis.anuais}
        sub={`${kpis.ativos ? Math.round((kpis.anuais / kpis.ativos) * 100) : 0}% do total`}
      />
    </div>
  )
}
