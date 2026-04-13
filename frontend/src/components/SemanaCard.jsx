import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getVendas, getMetas } from '../api'
import { mesAtual } from '../utils/date'
import styles from './SemanaCard.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function semanasDomes(ano, mes) {
  const daysInMonth = new Date(ano, mes, 0).getDate()
  const semanas = []
  for (let start = 1; start <= daysInMonth; start += 7) {
    semanas.push({ start, end: Math.min(start + 6, daysInMonth) })
  }
  return semanas
}

function idxSemanaHoje(ano, mes) {
  const hoje = new Date()
  if (hoje.getFullYear() !== ano || hoje.getMonth() + 1 !== mes) return null
  return Math.floor((hoje.getDate() - 1) / 7)
}

export default function SemanaCard({ mes }) {
  const mesRef = (!mes || mes === 'all') ? mesAtual() : mes
  const [ano, mesNum] = mesRef.split('-').map(Number)
  const ehMesAtual    = mesRef === mesAtual()

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas', mesRef, ''],
    queryFn:  () => getVendas({ mes: mesRef }),
  })

  const { data: metas, isLoading: loadingMetas } = useQuery({
    queryKey: ['metas'],
    queryFn:  getMetas,
  })

  const resultado = useMemo(() => {
    const meta_mrr = metas?.meta_mrr ?? 5000
    const semanas  = semanasDomes(ano, mesNum)
    const idxAtual = ehMesAtual ? (idxSemanaHoje(ano, mesNum) ?? semanas.length - 1) : semanas.length - 1

    const vendidoPorSemana = semanas.map(({ start, end }) =>
      vendas
        .filter(v => {
          if (v.status === 'Cancelado') return false
          const day = parseInt(v.data?.split('-')[2] ?? '0', 10)
          return day >= start && day <= end
        })
        .reduce((sum, v) => sum + (+v.mrr || 0), 0)
    )

    const metaBase = meta_mrr / semanas.length
    const metaPorSemana = []
    let rollover = 0
    for (let i = 0; i < semanas.length; i++) {
      const metaEfetiva = Math.max(0, metaBase + rollover)
      metaPorSemana.push(metaEfetiva)
      if (i < idxAtual) {
        rollover = metaEfetiva - vendidoPorSemana[i]
      } else {
        rollover = 0
      }
    }

    return { semanas, metaPorSemana, vendidoPorSemana, idxAtual, metaBase }
  }, [vendas, metas, ano, mesNum, ehMesAtual])

  if (loadingVendas || loadingMetas) {
    return <div className={`card ${styles.card}`}><span style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando...</span></div>
  }

  const { semanas, metaPorSemana, vendidoPorSemana, idxAtual, metaBase } = resultado
  const metaSemana    = metaPorSemana[idxAtual]    ?? 0
  const vendidoSemana = vendidoPorSemana[idxAtual] ?? 0
  const falta         = metaSemana - vendidoSemana
  const pct           = metaSemana > 0 ? Math.min(100, (vendidoSemana / metaSemana) * 100) : 0
  const barColor      = pct >= 100 ? 'var(--c-green)' : pct >= 70 ? 'var(--c-yellow)' : 'var(--c-red)'

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Ritmo Semanal</h3>
        <span className={styles.subtitle}>
          Meta base {fmt(metaBase)}/sem · saldo acumula
        </span>
      </div>

      {/* ── Abas das semanas ── */}
      <div className={styles.weekTabs}>
        {semanas.map((s, i) => {
          const v    = vendidoPorSemana[i]
          const m    = metaPorSemana[i]
          const p    = m > 0 ? Math.min(100, (v / m) * 100) : 0
          const past = i < idxAtual
          const cur  = i === idxAtual
          const fut  = i > idxAtual

          let tabColor = cur  ? 'var(--c-blue, #4f8ef7)'
                       : past && p >= 100 ? 'var(--c-green)'
                       : past ? 'var(--c-red)'
                       : 'var(--muted)'

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
          Semana {idxAtual + 1} — Meta {fmt(metaSemana)}
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

      {/* ── Tabela compacta ── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>Sem</span><span>Meta</span><span>Vendido</span><span>Saldo</span>
        </div>
        {semanas.map((s, i) => {
          const diff    = vendidoPorSemana[i] - metaPorSemana[i]
          const isCur   = i === idxAtual
          const isFut   = i > idxAtual
          return (
            <div key={i} className={`${styles.tableRow} ${isCur ? styles.tableRowCur : ''} ${isFut ? styles.tableRowFut : ''}`}>
              <span className={styles.tableS}>S{i + 1} <span className={styles.tableRange}>({s.start}–{s.end})</span></span>
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
