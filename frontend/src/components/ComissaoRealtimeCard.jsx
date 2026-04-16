import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKPIs, getMetasMensais } from '../api'
import { calcularComissao } from '../business/comissoes.calc'
import { METAS_FIXAS, META_PADRAO } from '../business/comissoes.constants'
import styles from './ComissaoRealtimeCard.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtPct = (v) =>
  `${(Number(v) * 100).toFixed(0)}%`

const MES_CORRENTE = new Date().toISOString().slice(0, 7)

function barColor(atingimento) {
  if (atingimento >= 1)    return { bar: '#ccf46a', cls: styles.green  }
  if (atingimento >= 0.7)  return { bar: '#fbbf24', cls: styles.yellow }
  return                          { bar: '#f87171', cls: styles.red    }
}

export default function ComissaoRealtimeCard({ mes }) {
  /* Se mesFiltro = 'all' (null), usa o mês corrente; caso contrário usa o selecionado */
  const mesEfetivo = mes || MES_CORRENTE
  const isAoVivo   = mesEfetivo === MES_CORRENTE

  const { data: kpi, isLoading: loadingKpi } = useQuery({
    queryKey: ['kpis', mesEfetivo],
    queryFn:  () => getKPIs(mesEfetivo),
    staleTime: 60_000,
  })

  const { data: metasMensais = [], isLoading: loadingMeta } = useQuery({
    queryKey: ['metasMensais'],
    queryFn:  getMetasMensais,
    staleTime: 300_000,
  })

  const calc = useMemo(() => {
    if (!kpi) return null
    const mrr     = parseFloat(kpi.total_mrr    || 0)
    const ades    = parseFloat(kpi.total_adesao || 0)
    const churn3m = parseFloat(kpi.churn_mrr    || 0)
    const anuais  = parseInt(kpi.anuais          || 0)
    const metaConfig = metasMensais.find(m => m.mes === mesEfetivo)
    const meta = metaConfig?.meta_mrr || METAS_FIXAS[mesEfetivo] || META_PADRAO
    return { mrr, ades, churn3m, anuais, meta, ...calcularComissao({ mrr, ades, churn3m, anuais, meta }) }
  }, [kpi, metasMensais, mesEfetivo])

  const isLoading = loadingKpi || loadingMeta

  if (isLoading) {
    return (
      <div className="card">
        <div className={styles.card}>
          <div className={styles.titleRow}>
            <p className={styles.title}>Comissão do Mês</p>
          </div>
          <div className={styles.skeleton}>
            <div className={styles.skBlock} style={{ height: 14, width: '55%' }} />
            <div className={styles.skBlock} style={{ height: 32, width: '70%' }} />
            <div className={styles.skBlock} style={{ height: 60, borderRadius: 10 }} />
            <div className={styles.skBlock} style={{ height: 6, borderRadius: 999 }} />
            <div className={styles.skBlock} style={{ height: 40, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!calc) return null

  const { atingimento } = calc
  const { bar, cls }    = barColor(atingimento)
  const pctClamp        = Math.min(atingimento * 100, 100)

  return (
    <div className="card">
      <div className={styles.card}>
        {/* Título */}
        <div className={styles.titleRow}>
          <p className={styles.title}>Comissão — {mesEfetivo}</p>
          {isAoVivo ? (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              Tempo Real
            </span>
          ) : (
            <span className={styles.liveBadge} style={{ background: 'rgba(255,255,255,.06)', color: 'var(--muted)', borderColor: 'var(--border)' }}>
              Histórico
            </span>
          )}
        </div>

        {/* Valor principal */}
        <div className={styles.valorWrap}>
          <span className={styles.valorLabel}>Total</span>
          <span className={styles.valor}>{fmt(calc.total_pago)}</span>
        </div>

        {/* Grid MRR / Adesão / Churn / Anuais */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCell}>
            <span className={styles.metricLabel}>MRR vendido</span>
            <span className={styles.metricVal}>{fmt(calc.mrr)}</span>
          </div>
          <div className={styles.metricCell}>
            <span className={styles.metricLabel}>Meta MRR</span>
            <span className={styles.metricVal}>{fmt(calc.meta)}</span>
          </div>
          <div className={styles.metricCell}>
            <span className={styles.metricLabel}>Churn 3m</span>
            <span className={styles.metricVal}>{fmt(calc.churn3m)}</span>
          </div>
          <div className={styles.metricCell}>
            <span className={styles.metricLabel}>Anuais</span>
            <span className={styles.metricVal}>{calc.anuais}</span>
          </div>
        </div>

        {/* Barra de atingimento */}
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Atingimento meta</span>
          <span className={`${styles.metaPct} ${cls}`}>{fmtPct(atingimento)}</span>
        </div>
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{ width: `${pctClamp}%`, background: bar }}
          />
        </div>

        {/* Detalhamento MRR + Adesão */}
        <div className={styles.splitRow}>
          <div className={styles.splitItem}>
            <span className={styles.splitLabel}>Comis. MRR</span>
            <span className={styles.splitVal}>{fmt(calc.comis_mrr)}</span>
          </div>
          <div className={styles.splitItem}>
            <span className={styles.splitLabel}>Comis. Adesão</span>
            <span className={styles.splitVal}>{fmt(calc.comis_ades)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
