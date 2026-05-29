import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKPIs, getMetas } from '../api'
import { mesAtual, diasUteisNoMes, diasUteisDecorridos } from '../utils/date'
import { fmt } from '../utils/fmt'
import styles from './RitmoDiarioCard.module.css'


export default function RitmoDiarioCard({ mes }) {
  const mesRef = (!mes || mes === 'all') ? mesAtual() : mes
  const [ano, mesNum] = mesRef.split('-').map(Number)

  // Dias podem ser sobrescritos manualmente pelo usuário
  const calcTotal      = diasUteisNoMes(ano, mesNum)
  const calcDecorridos = diasUteisDecorridos(ano, mesNum)
  const [diasTotal,      setDiasTotal]      = useState('')
  const [diasDecorridos, setDiasDecorridos] = useState('')
  const [ajustando, setAjustando] = useState(false)

  const total      = parseInt(diasTotal)      || calcTotal
  const decorridos = parseInt(diasDecorridos) || calcDecorridos

  const { data: kpis }  = useQuery({ queryKey: ['kpis',  mesRef], queryFn: () => getKPIs(mesRef) })
  const { data: metas } = useQuery({ queryKey: ['metas'],          queryFn: getMetas })

  const calc = useMemo(() => {
    if (!kpis || !metas) return null
    const meta      = metas.meta_mrr ?? 5000
    const vendido   = +kpis.total_mrr
    const restantes = Math.max(0, total - decorridos)
    const idealDia  = total > 0 ? meta / total : 0
    const atualDia  = decorridos > 0 ? vendido / decorridos : 0
    const precisaDia = restantes > 0 ? Math.max(0, meta - vendido) / restantes : 0
    const projecao  = atualDia * total
    const status    = projecao >= meta ? 'green' : projecao >= meta * 0.85 ? 'yellow' : 'red'
    const label     = status === 'green'  ? `No ritmo · ${restantes}d restantes`
                    : status === 'yellow' ? `Moderado · ${restantes}d restantes`
                    : `Atrasado · ${restantes}d restantes`
    return { meta, vendido, restantes, idealDia, atualDia, precisaDia, projecao, status, label }
  }, [kpis, metas, total, decorridos])

  if (!calc) return <div className="card"><span style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando...</span></div>

  const { meta, vendido, idealDia, atualDia, precisaDia, projecao, status, label } = calc

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Ritmo Diário</h3>
        <button
          className={styles.configNote}
          onClick={() => setAjustando(v => !v)}
          title={ajustando ? 'Fechar ajuste de dias' : 'Ajustar dias úteis manualmente'}
          style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          ⚙ {ajustando ? 'Fechar' : 'Ajustar dias'}
        </button>
      </div>

      {/* Inputs de dias — ocultos por padrão */}
      {ajustando && (
        <div className={styles.diasInputs}>
          <div className={styles.diasField}>
            <label className={styles.diasLabel}>Dias Úteis Total</label>
            <input
              className={styles.diasInput}
              type="number" min="1" max="31"
              value={diasTotal}
              onChange={e => setDiasTotal(e.target.value)}
              placeholder={String(calcTotal)}
            />
          </div>
          <div className={styles.diasField}>
            <label className={styles.diasLabel}>Dias Passados</label>
            <input
              className={styles.diasInput}
              type="number" min="0" max="31"
              value={diasDecorridos}
              onChange={e => setDiasDecorridos(e.target.value)}
              placeholder={String(calcDecorridos)}
            />
          </div>
        </div>
      )}

      {/* Grid de métricas 2x2 */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCell}>
          <span className={styles.metricLabel}>Ideal / Dia</span>
          <span className={styles.metricVal}>{fmt(idealDia)}</span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.metricLabel}>Atual / Dia</span>
          <span className={`${styles.metricVal} ${styles[status]}`}>
            {atualDia > 0 ? fmt(atualDia) : <span style={{ color: 'var(--muted)' }}>—</span>}
          </span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.metricLabel}>Precisa / Dia</span>
          <span className={`${styles.metricVal} ${styles[status]}`}>
            {precisaDia > 0 ? fmt(precisaDia) : <span style={{ color: 'var(--c-green)' }}>✓</span>}
          </span>
        </div>
        <div className={styles.metricCell}>
          <span className={styles.metricLabel}>Projeção Final</span>
          <span className={`${styles.metricVal} ${styles[status]}`}>{fmt(projecao)}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className={`${styles.statusBadge} ${styles[`badge${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
        <span className={styles.statusDot} />
        {label}
      </div>

      {/* Barra meta */}
      <div className={styles.metaRow}>
        <span className={styles.metaLabel}>Vendido</span>
        <span className={styles.metaLabel}>Meta: {fmt(meta)}</span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{
            width: `${Math.min(100, meta > 0 ? (vendido / meta) * 100 : 0)}%`,
            background: `var(--c-${status})`,
          }}
        />
      </div>
      <div className={styles.metaVal}>{fmt(vendido)}</div>
    </div>
  )
}

