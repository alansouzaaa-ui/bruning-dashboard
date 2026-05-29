/**
 * LTVCard — Lifetime Value estimado da carteira ativa.
 *
 * Metodologia: LTV = ticket_médio / churn_rate_MRR_mensal
 *
 * Por que churn de MRR e não de contratos?
 * O churn de MRR captura o impacto financeiro real — um cliente de R$800
 * cancelado pesa mais do que um de R$200. Para empresas com ticket variável
 * (como esta), é a métrica mais relevante.
 *
 * Quando churn_mrr = 0 (base 100% retida):
 * O LTV técnico seria infinito. Exibimos um aviso e mostramos o valor mínimo
 * projetado com base em 1% de churn (conservador) como referência.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKPIs, getVendas } from '../api'
import { fmt } from '../utils/fmt'
import styles from './LTVCard.module.css'

/* ── helpers ─────────────────────────────────────────────────── */
function agruparPor(vendas, campo) {
  const mapa = {}
  for (const v of vendas) {
    const chave = v[campo]?.trim() || 'Não informado'
    if (!mapa[chave]) mapa[chave] = { total: 0, count: 0 }
    mapa[chave].total += parseFloat(v.mrr || 0)
    mapa[chave].count += 1
  }
  return Object.entries(mapa)
    .map(([nome, { total, count }]) => ({
      nome,
      totalMRR: total,
      count,
      avgMRR: count > 0 ? total / count : 0,
    }))
    .sort((a, b) => b.avgMRR - a.avgMRR)
}

/* ── sub-components ──────────────────────────────────────────── */
function BreakdownRow({ nome, avgMRR, count, maxMRR }) {
  const pct = maxMRR > 0 ? (avgMRR / maxMRR) * 100 : 0
  return (
    <div className={styles.bRow}>
      <span className={styles.bLabel} title={nome}>{nome}</span>
      <div className={styles.bBar}>
        <div className={styles.bFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.bMRR}>{fmt(avgMRR)}</span>
      <span className={styles.bCount}>{count}×</span>
    </div>
  )
}

/* ── main component ──────────────────────────────────────────── */
export default function LTVCard() {
  /* KPIs globais (sem filtro de mês) para churn rate real da carteira */
  const { data: kpis } = useQuery({
    queryKey:  ['kpis', null],
    queryFn:   () => getKPIs(null),
    staleTime: 60_000,
  })

  /* Todos os clientes ativos (sem filtro de mês) */
  const { data: vendas = [] } = useQuery({
    queryKey:  ['ltv-vendas-ativas'],
    queryFn:   () => getVendas({ status: 'Ativo' }),
    staleTime: 120_000,
  })

  const calc = useMemo(() => {
    if (!kpis) return null

    const totalMRR = Number(kpis.total_mrr)  || 0
    const churnMRR = Number(kpis.churn_mrr)  || 0
    const ticket   = Number(kpis.ticket_medio) || 0

    /* MRR churn rate mensal: churn_mrr / base_inicial (base_inicial = ativo + churn) */
    const baseInicial = totalMRR + churnMRR
    const churnRate   = baseInicial > 0 ? churnMRR / baseInicial : 0

    /* LTV: null quando não há churn (infinito técnico) */
    const ltv       = churnRate > 0 ? Math.round(ticket / churnRate)  : null
    const ltvRef    = Math.round(ticket / 0.01)   // referência conservadora 1%/mês
    const mesesVida = churnRate > 0 ? Math.round(1 / churnRate) : null

    const ativos = vendas.filter(v => v.status === 'Ativo')
    return {
      ltv, ltvRef, mesesVida, churnRate, ticket, totalMRR,
      segmentos: agruparPor(ativos, 'segmento').slice(0, 6),
      planos:    agruparPor(ativos, 'plano').slice(0, 6),
    }
  }, [kpis, vendas])

  if (!calc) return null

  const { ltv, ltvRef, mesesVida, churnRate, segmentos, planos } = calc
  const maxSeg  = Math.max(...segmentos.map(s => s.avgMRR), 1)
  const maxPlan = Math.max(...planos.map(p => p.avgMRR), 1)

  const churnColor = churnRate > 0.05 ? '#f87171'
                   : churnRate > 0.02 ? '#f59e0b'
                   : '#ccf46a'

  return (
    <div className="card">
      <div className={styles.card}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <p className={styles.title}>LTV Estimado da Carteira</p>
          <span className={styles.metodo}>ticket médio ÷ churn rate MRR</span>
        </div>

        {/* ── KPI row ── */}
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>LTV Médio</span>
            <span className={styles.kpiValue} style={{ color: '#ccf46a' }}>
              {ltv ? fmt(ltv) : '—'}
            </span>
            {!ltv && (
              <span className={styles.kpiSub}>
                ref. conservadora: {fmt(ltvRef)}
              </span>
            )}
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Vida Média Estimada</span>
            <span className={styles.kpiValue}>
              {mesesVida ? `~${mesesVida} meses` : '—'}
            </span>
            {!mesesVida && (
              <span className={styles.kpiSub}>base 100% retida</span>
            )}
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Churn Rate MRR / mês</span>
            <span className={styles.kpiValue} style={{ color: churnColor }}>
              {churnRate > 0 ? `${(churnRate * 100).toFixed(1)}%` : '0%'}
            </span>
            <span className={styles.kpiSub}>
              {churnRate === 0
                ? 'nenhuma receita perdida'
                : churnRate < 0.02 ? 'nível saudável (<2%)'
                : churnRate < 0.05 ? 'atenção (2–5%)'
                : 'crítico (>5%)'}
            </span>
          </div>
        </div>

        {/* ── Breakdown ── */}
        {(segmentos.length > 0 || planos.length > 0) && (
          <div className={styles.breakdown}>
            {segmentos.length > 0 && (
              <div className={styles.bCol}>
                <p className={styles.bTitle}>Ticket médio por Segmento</p>
                {segmentos.map(s => (
                  <BreakdownRow key={s.nome} {...s} maxMRR={maxSeg} />
                ))}
              </div>
            )}
            {planos.length > 0 && (
              <div className={styles.bCol}>
                <p className={styles.bTitle}>Ticket médio por Plano</p>
                {planos.map(p => (
                  <BreakdownRow key={p.nome} {...p} maxMRR={maxPlan} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Nota metodológica ── */}
        <p className={styles.nota}>
          Estimativa linear. Não considera expansão de receita, sazonalidade ou downgrades.
          {!ltv && ' Sem churn histórico — valor calculado com 1%/mês como referência conservadora.'}
        </p>

      </div>
    </div>
  )
}
