import { useQuery } from '@tanstack/react-query'
import { getKPIs, getComparativo, getMetas, getAvaliacaoAtual, getMeses } from '../api'
import { dashboardInsightSpecialist } from '../business/insights'
import styles from './InsightsPanel.module.css'

const CATEGORIA = {
  performance:  { label: 'Performance',       cor: '#ccf46a', bg: 'rgba(204,244,106,0.10)' },
  anomalia:     { label: 'Anomalia',           cor: '#f87171', bg: 'rgba(248,113,113,0.10)' },
  correlacao:   { label: 'Correlação',         cor: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  oportunidade: { label: 'Oportunidade',       cor: '#34d399', bg: 'rgba(52,211,153,0.10)'  },
  risco:        { label: 'Risco',              cor: '#f59e0b', bg: 'rgba(245,158,11,0.10)'  },
  acao:         { label: 'Ação Executiva',     cor: '#60a5fa', bg: 'rgba(96,165,250,0.10)'  },
}

const PRIORIDADE = {
  critico: { label: 'CRÍTICO', cor: '#f87171' },
  alto:    { label: 'ALTO',    cor: '#f59e0b' },
  medio:   { label: 'MÉDIO',   cor: '#60a5fa' },
  info:    { label: 'INFO',    cor: '#6b7280' },
}

export default function InsightsPanel({ mes }) {
  const { data: kpis }            = useQuery({ queryKey: ['kpis', mes],           queryFn: () => getKPIs(mes) })
  const { data: comparativo = [] }= useQuery({ queryKey: ['comparativo'],          queryFn: getComparativo })
  const { data: metas }           = useQuery({ queryKey: ['metas'],                queryFn: getMetas })
  const { data: trimestral }      = useQuery({ queryKey: ['trimestral-atual'],     queryFn: getAvaliacaoAtual })
  const { data: meses = [] }      = useQuery({ queryKey: ['meses'],               queryFn: getMeses })

  // KPIs do mês anterior para análise de tendência
  const idxAtual = mes ? meses.findIndex(m => m.valor === mes) : meses.length - 1
  const mesPrev  = idxAtual > 0 ? meses[idxAtual - 1]?.valor : null
  const { data: kpisPrev } = useQuery({
    queryKey: ['kpis', mesPrev],
    queryFn:  () => getKPIs(mesPrev),
    enabled:  !!mesPrev,
  })

  if (!kpis || !metas) return null

  const PRIORIDADE_ORDEM = { critico: 0, alto: 1, medio: 2, info: 3 }
  const insights = dashboardInsightSpecialist({ kpis, kpisPrev, comparativo, metas, trimestral, mes })
    .sort((a, b) => (PRIORIDADE_ORDEM[a.prioridade] ?? 99) - (PRIORIDADE_ORDEM[b.prioridade] ?? 99))

  if (insights.length === 0) return null

  const criticos = insights.filter(i => i.prioridade === 'critico').length
  const altos    = insights.filter(i => i.prioridade === 'alto').length

  return (
    <section className={styles.section}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.aiIcon}>✦</span>
          <div>
            <h2 className={styles.title}>Insights Estratégicos com IA</h2>
            <p className={styles.subtitle}>
              {insights.length} insight{insights.length > 1 ? 's' : ''} detectado{insights.length > 1 ? 's' : ''}
              {criticos > 0 && <span className={styles.alertCount} style={{ color: '#f87171' }}> · {criticos} crítico{criticos > 1 ? 's' : ''}</span>}
              {altos    > 0 && <span className={styles.alertCount} style={{ color: '#f59e0b' }}> · {altos} alto{altos > 1 ? 's' : ''}</span>}
            </p>
          </div>
        </div>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          Análise em tempo real
        </div>
      </div>

      {/* ── Grade de cards ── */}
      <div className={styles.grid}>
        {insights.map(insight => {
          const cat = CATEGORIA[insight.categoria] || CATEGORIA.acao
          const pri = PRIORIDADE[insight.prioridade] || PRIORIDADE.info
          return (
            <div
              key={insight.id}
              className={styles.card}
              style={{ '--border-cor': cat.cor }}
            >
              <div className={styles.cardTop}>
                <span className={styles.catTag} style={{ color: cat.cor, background: cat.bg }}>
                  {cat.label}
                </span>
                <span className={styles.priTag} style={{ color: pri.cor }}>
                  {pri.label}
                </span>
              </div>

              <h3 className={styles.cardTitle}>{insight.titulo}</h3>
              <p className={styles.cardDesc}>{insight.descricao}</p>

              <div className={styles.impacto}>
                <span className={styles.impactoLabel}>Impacto</span>
                <span className={styles.impactoText}>{insight.impacto}</span>
              </div>

              <div className={styles.rec}>
                <span className={styles.recArrow} style={{ color: cat.cor }}>→</span>
                <span className={styles.recText}>{insight.recomendacao}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
