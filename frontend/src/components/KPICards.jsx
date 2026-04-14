import { useQuery } from '@tanstack/react-query'
import { getKPIs, getMeses, getMetas } from '../api'
import styles from './KPICards.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtPct = (v) => `${Number(v).toFixed(1)}%`

function TrendBadge({ curr, prev, prefix = '', reversed = false }) {
  if (prev == null || prev === 0) return null
  const diff = curr - prev
  const pct  = Math.round((diff / prev) * 100)
  const isGood = reversed ? diff < 0 : diff > 0
  const isBad  = reversed ? diff > 0 : diff < 0
  const cls    = isGood ? 'trend-up' : isBad ? 'trend-down' : 'trend-flat'
  const arrow  = diff > 0 ? '▲' : diff < 0 ? '▼' : '—'
  return (
    <span className={cls}>
      {arrow} {Math.abs(pct)}%{prefix}
    </span>
  )
}

function KPICard({ icon, title, value, sub, trend, color = 'green' }) {
  return (
    <div className={`${styles.card} ${styles[color]}`}>
      <div className={styles.inner}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{title}</span>
        <span className={styles.value}>{value}</span>
        <div className={styles.footer}>
          <span className={styles.sub}>{sub}</span>
          {trend}
        </div>
      </div>
    </div>
  )
}

export default function KPICards({ mes }) {
  const { data: kpis, isLoading, isError } = useQuery({
    queryKey: ['kpis', mes],
    queryFn: () => getKPIs(mes),
  })

  const { data: metas } = useQuery({ queryKey: ['metas'], queryFn: getMetas })

  const { data: meses = [] } = useQuery({ queryKey: ['meses'], queryFn: getMeses })
  const idxAtual = meses.findIndex(m => m.valor === mes)
  const mesPrev  = idxAtual > 0 ? meses[idxAtual - 1].valor : null

  const { data: kpisPrev } = useQuery({
    queryKey: ['kpis', mesPrev],
    queryFn: () => getKPIs(mesPrev),
    enabled: !!mesPrev && !!mes,
  })

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    )
  }

  if (isError || !kpis) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`${styles.card} ${styles.green}`} style={{ opacity: .4 }}>
            <div className={styles.inner}>
              <span className={styles.title}>—</span>
              <span className={styles.value}>—</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const p = kpisPrev

  const meta_mrr    = metas?.meta_mrr ?? 5000
  const atingimento = meta_mrr > 0 ? (+kpis.total_mrr / meta_mrr) * 100 : 0
  const atingPrev   = p && meta_mrr > 0 ? (+p.total_mrr / meta_mrr) * 100 : null
  const atingColor  = atingimento >= 100 ? 'green' : atingimento >= 70 ? 'yellow' : 'red'
  const atingEmoji  = atingimento >= 100 ? '🟢' : atingimento >= 70 ? '🟡' : '🔴'

  const taxaChurn     = (kpis.ativos + kpis.churns) > 0
    ? (kpis.churns / (kpis.ativos + kpis.churns)) * 100
    : 0
  const taxaChurnPrev = p && (p.ativos + p.churns) > 0
    ? (p.churns / (p.ativos + p.churns)) * 100
    : null

  return (
    <div className={styles.grid}>
      <KPICard
        icon="💰"
        color="green"
        title="MRR Ativo"
        value={fmt(kpis.total_mrr)}
        sub={`${kpis.ativos} clientes ativos`}
        trend={<TrendBadge curr={+kpis.total_mrr} prev={p ? +p.total_mrr : null} />}
      />
      <KPICard
        icon="🏷️"
        color="cyan"
        title="Adesão"
        value={fmt(kpis.total_adesao)}
        sub="total no período"
        trend={<TrendBadge curr={+kpis.total_adesao} prev={p ? +p.total_adesao : null} />}
      />
      <KPICard
        icon="🎯"
        color="purple"
        title="Ticket Médio"
        value={fmt(kpis.ticket_medio)}
        sub="por cliente ativo"
        trend={<TrendBadge curr={+kpis.ticket_medio} prev={p ? +p.ticket_medio : null} />}
      />
      <KPICard
        icon="👥"
        color="blue"
        title="Carteira"
        value={kpis.ativos}
        sub={`${kpis.anuais} anuais · ${kpis.mensais ?? (kpis.ativos - kpis.anuais)} mensais`}
      />
      <KPICard
        icon="📉"
        color="red"
        title="Churns"
        value={kpis.churns}
        sub={`${fmt(kpis.churn_mrr)} MRR perdido`}
      />
      <KPICard
        icon="⚠️"
        color="orange"
        title="Taxa de Churn"
        value={fmtPct(taxaChurn)}
        sub={`${kpis.churns} contrato${kpis.churns !== 1 ? 's' : ''} cancelado${kpis.churns !== 1 ? 's' : ''}`}
        trend={
          <TrendBadge
            curr={taxaChurn}
            prev={taxaChurnPrev}
            reversed
          />
        }
      />
      <KPICard
        icon="📊"
        color={atingColor}
        title="Atingimento"
        value={`${atingimento.toFixed(1)}%`}
        sub={`${atingEmoji} meta ${fmt(meta_mrr)}`}
        trend={<TrendBadge curr={atingimento} prev={atingPrev} prefix="pp" />}
      />
    </div>
  )
}
