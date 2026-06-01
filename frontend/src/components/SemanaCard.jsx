import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getVendas } from '../api'
import { mesAtual } from '../utils/date'
import { fmt } from '../utils/fmt'
import styles from './SemanaCard.module.css'

/**
 * Meta semanal fixa. Altere aqui para mudar o valor.
 * 4 semanas × R$1.250 = R$5.000/mês
 */
const META_SEMANA = 1250

/**
 * 4 semanas fixas por mês:
 *   S1 → dias  1–7
 *   S2 → dias  8–14
 *   S3 → dias 15–21
 *   S4 → dias 22–fim do mês
 */
function semanas4(ano, mes) {
  const ultimo = new Date(ano, mes, 0).getDate()
  return [
    { start: 1,  end: 7      },
    { start: 8,  end: 14     },
    { start: 15, end: 21     },
    { start: 22, end: ultimo },
  ]
}

/** Índice (0–3) da semana em que estamos hoje. null se não for o mês atual. */
function idxSemanaAtual(ano, mes) {
  const hoje = new Date()
  if (hoje.getFullYear() !== ano || hoje.getMonth() + 1 !== mes) return null
  return Math.min(3, Math.floor((hoje.getDate() - 1) / 7))
}

export default function SemanaCard({ mes }) {
  const mesRef     = (!mes || mes === 'all') ? mesAtual() : mes
  const [ano, mesNum] = mesRef.split('-').map(Number)
  const ehMesAtual = mesRef === mesAtual()

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas', mesRef],
    queryFn:  () => getVendas({ mes: mesRef }),
  })

  const resultado = useMemo(() => {
    const semanas  = semanas4(ano, mesNum)
    const idxAtual = ehMesAtual ? (idxSemanaAtual(ano, mesNum) ?? 3) : 3

    /* MRR vendido por semana (ignora cancelados) */
    const vendidoPorSemana = semanas.map(({ start, end }) =>
      vendas
        .filter(v => {
          if (v.status === 'Cancelado') return false
          const day = parseInt(v.data?.split('-')[2] ?? '0', 10)
          return day >= start && day <= end
        })
        .reduce((sum, v) => sum + (+v.mrr || 0), 0)
    )

    /*
     * Meta com rollover: déficit da semana passada acumula na próxima.
     * Ex: S1 vendeu R$800 (faltou R$450) → S2 fica com meta R$1.700.
     * Semanas futuras sempre mostram a meta base (sem rollover ainda).
     */
    const metaPorSemana = []
    let rollover = 0
    for (let i = 0; i < semanas.length; i++) {
      const metaEfetiva = Math.max(0, META_SEMANA + rollover)
      metaPorSemana.push(metaEfetiva)
      if (i < idxAtual) {
        rollover = metaEfetiva - vendidoPorSemana[i]
      } else {
        rollover = 0  // semanas futuras não acumulam déficit ainda
      }
    }

    return { semanas, metaPorSemana, vendidoPorSemana, idxAtual }
  }, [vendas, ano, mesNum, ehMesAtual])

  if (isLoading) {
    return <div className={`card ${styles.card}`}><span style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando...</span></div>
  }

  const { semanas, metaPorSemana, vendidoPorSemana, idxAtual } = resultado
  const metaSemana    = metaPorSemana[idxAtual]    ?? META_SEMANA
  const vendidoSemana = vendidoPorSemana[idxAtual] ?? 0
  const falta         = metaSemana - vendidoSemana
  const pct           = metaSemana > 0 ? Math.min(100, (vendidoSemana / metaSemana) * 100) : 0
  const barColor      = pct >= 100 ? 'var(--c-green)' : pct >= 70 ? 'var(--c-yellow)' : 'var(--c-red)'

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Ritmo Semanal</h3>
        <span className={styles.subtitle}>
          Meta {fmt(META_SEMANA)}/sem · saldo acumula
        </span>
      </div>

      {/* ── 4 abas de semana ── */}
      <div className={styles.weekTabs}>
        {semanas.map((s, i) => {
          const v   = vendidoPorSemana[i]
          const m   = metaPorSemana[i]
          const p   = m > 0 ? Math.min(100, (v / m) * 100) : 0
          const cur = i === idxAtual
          const fut = i > idxAtual

          const tabColor = cur              ? 'var(--c-blue, #4f8ef7)'
                         : !fut && p >= 100 ? 'var(--c-green)'
                         : !fut            ? 'var(--c-red)'
                         :                   'var(--muted)'

          return (
            <div
              key={i}
              className={`${styles.weekTab} ${cur ? styles.weekTabActive : ''} ${fut ? styles.weekTabFut : ''}`}
            >
              <span className={styles.weekTabLabel}>SEM {i + 1}</span>
              <span className={styles.weekTabPct} style={{ color: tabColor }}>
                {fut ? '—' : `${Math.round(p)}%`}
              </span>
              <span className={styles.weekTabVal} style={{ color: fut ? 'var(--muted)' : tabColor }}>
                {fut ? fmt(m) : fmt(v)}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Detalhes da semana atual ── */}
      <div className={styles.currentWeek}>
        <div className={styles.currentWeekHeader}>
          Semana {idxAtual + 1}
          <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
            {' '}· dias {semanas[idxAtual]?.start}–{semanas[idxAtual]?.end}
          </span>
          {' '}— Meta {fmt(metaSemana)}
          {metaSemana !== META_SEMANA && (
            <span style={{ fontSize: 10, color: 'var(--c-yellow)', marginLeft: 6 }}>
              (inclui saldo anterior)
            </span>
          )}
        </div>

        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <div className={styles.barPct}>{pct.toFixed(1)}%</div>

        <div className={styles.vendFalt}>
          <div className={styles.vfItem}>
            <span className={styles.vfLabel}>Vendido</span>
            <span className={`${styles.vfVal} ${styles.green}`}>{fmt(vendidoSemana)}</span>
          </div>
          <div className={styles.vfDivider} />
          <div className={styles.vfItem}>
            <span className={styles.vfLabel}>{falta <= 0 ? 'Excedeu' : 'Faltam'}</span>
            <span className={`${styles.vfVal} ${falta <= 0 ? styles.green : styles.red}`}>
              {falta <= 0 ? '+' : '-'}{fmt(Math.abs(falta))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabela das 4 semanas ── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>Sem</span><span>Meta</span><span>Vendido</span><span>Saldo</span>
        </div>
        {semanas.map((s, i) => {
          const diff  = vendidoPorSemana[i] - metaPorSemana[i]
          const isCur = i === idxAtual
          const isFut = i > idxAtual
          return (
            <div
              key={i}
              className={`${styles.tableRow} ${isCur ? styles.tableRowCur : ''} ${isFut ? styles.tableRowFut : ''}`}
            >
              <span className={styles.tableS}>
                S{i + 1} <span className={styles.tableRange}>({s.start}–{s.end})</span>
              </span>
              <span>{fmt(metaPorSemana[i])}</span>
              <span>{isFut ? '—' : fmt(vendidoPorSemana[i])}</span>
              <span className={isFut ? styles.muted : diff >= 0 ? styles.green : styles.red}>
                {isFut ? '—' : `${diff >= 0 ? '+' : ''}${fmt(diff)}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
