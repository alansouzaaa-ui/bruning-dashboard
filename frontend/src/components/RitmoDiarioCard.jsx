import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKPIs, getMetas } from '../api'
import { mesAtual, diasUteisNoMes, diasUteisDecorridos } from '../utils/date'
import styles from './RitmoDiarioCard.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function RitmoDiarioCard({ mes }) {
  const mesRef = (!mes || mes === 'all') ? mesAtual() : mes
  const [ano, mesNum] = mesRef.split('-').map(Number)

  const { data: kpis }  = useQuery({ queryKey: ['kpis',  mesRef], queryFn: () => getKPIs(mesRef) })
  const { data: metas } = useQuery({ queryKey: ['metas'],          queryFn: getMetas })

  const calc = useMemo(() => {
    if (!kpis || !metas) return null
    const meta        = metas.meta_mrr ?? 5000
    const vendido     = +kpis.total_mrr
    const totalUteis  = diasUteisNoMes(ano, mesNum)
    const decorridos  = diasUteisDecorridos(ano, mesNum)
    const restantes   = Math.max(0, totalUteis - decorridos)
    const ritmoDia    = decorridos > 0 ? vendido / decorridos : 0
    const projecao    = ritmoDia * totalUteis
    const necessDia   = restantes > 0 ? Math.max(0, meta - vendido) / restantes : 0
    const pctDias     = totalUteis > 0 ? Math.min(100, (decorridos / totalUteis) * 100) : 0
    const pctMeta     = meta > 0 ? Math.min(100, (vendido / meta) * 100) : 0
    const status      = projecao >= meta ? 'green' : projecao >= meta * 0.85 ? 'yellow' : 'red'
    const label       = status === 'green' ? 'No ritmo' : status === 'yellow' ? 'Moderado' : 'Abaixo da meta'
    return { meta, vendido, totalUteis, decorridos, restantes, ritmoDia, projecao, necessDia, pctDias, pctMeta, status, label }
  }, [kpis, metas, ano, mesNum])

  if (!calc) {
    return <div className="card"><span style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando...</span></div>
  }

  const { meta, vendido, totalUteis, decorridos, restantes, ritmoDia, projecao, necessDia, pctDias, pctMeta, status, label } = calc

  return (
    <div className={`card ${styles.card}`}>
      {/* Cabeçalho */}
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Ritmo Diário</h3>
        <span className={`${styles.statusBadge} ${styles[status]}`}>
          {status === 'green' ? '●' : status === 'yellow' ? '●' : '●'} {label}
        </span>
      </div>

      {/* Valor principal — ritmo atual */}
      <div className={`${styles.mainVal} ${styles[status]}`}>{fmt(ritmoDia)}</div>
      <div className={styles.mainSub}>por dia útil · projeção {fmt(projecao)}</div>

      {/* Barra — dias decorridos */}
      <div className={styles.barSection}>
        <div className={styles.barHeader}>
          <span className={styles.barLabel}>Dias úteis</span>
          <span className={styles.barVal}>{decorridos} / {totalUteis} <span style={{ color: 'var(--muted)' }}>({restantes} restantes)</span></span>
        </div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles.dim}`} style={{ width: `${pctDias}%` }} />
        </div>
      </div>

      {/* Barra — % meta */}
      <div className={styles.barSection}>
        <div className={styles.barHeader}>
          <span className={styles.barLabel}>Meta atingida</span>
          <span className={`${styles.barVal}`} style={{ color: `var(--c-${status})` }}>{pctMeta.toFixed(1)}%</span>
        </div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles[status]}`} style={{ width: `${pctMeta}%` }} />
        </div>
      </div>

      {/* Métricas */}
      <div className={styles.metricas}>
        <div className={styles.metrica}>
          <span className={styles.mLabel}>Vendido</span>
          <span className={styles.mVal}>{fmt(vendido)}</span>
        </div>
        <div className={styles.metrica}>
          <span className={styles.mLabel}>Meta mensal</span>
          <span className={`${styles.mVal} ${styles.muted}`}>{fmt(meta)}</span>
        </div>
        <div className={styles.metrica}>
          <span className={styles.mLabel}>Projeção final</span>
          <span className={`${styles.mVal} ${styles[status]}`}>{fmt(projecao)}</span>
        </div>
        <div className={styles.metrica}>
          <span className={styles.mLabel}>
            {restantes > 0 ? `Necessário/dia` : 'Status'}
          </span>
          <span className={`${styles.mVal} ${restantes === 0 ? styles.green : ''}`}>
            {restantes > 0
              ? <>{fmt(necessDia)}<span className={styles.mSuffix}>/dia</span></>
              : '✓ Atingida'}
          </span>
        </div>
      </div>
    </div>
  )
}
