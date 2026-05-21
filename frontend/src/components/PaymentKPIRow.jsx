import { useQuery } from '@tanstack/react-query'
import { getKPIs } from '../api'
import styles from './PaymentKPIRow.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PaymentKPIRow({ mes }) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis', mes],
    queryFn:  () => getKPIs(mes),
  })

  if (isLoading || !kpis) return null

  const recebida  = Number(kpis.adesao_recebida)  || 0
  const pendente  = Number(kpis.adesao_pendente)  || 0
  const pagas     = Number(kpis.vendas_pagas)     || 0
  const pendentes = Number(kpis.vendas_pendentes) || 0
  const total     = recebida + pendente
  const pctRecebido = total > 0 ? (recebida / total) * 100 : 0

  return (
    <div className={styles.row}>
      {/* header */}
      <div className={styles.header}>
        <span className={styles.icon}>💳</span>
        <span className={styles.title}>Status de Pagamentos</span>
        <span className={styles.sub}>Adesões do período</span>
      </div>

      {/* 4 cards */}
      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.neutral}`}>
          <span className={styles.cardLabel}>Total Adesão</span>
          <span className={styles.cardValue}>{fmt(total)}</span>
          <span className={styles.cardSub}>{pagas + pendentes} vendas</span>
        </div>

        <div className={`${styles.card} ${styles.paid}`}>
          <span className={styles.cardLabel}>✓ Recebido</span>
          <span className={styles.cardValue} style={{ color: '#22c55e' }}>{fmt(recebida)}</span>
          <span className={styles.cardSub}>{pagas} pag{pagas !== 1 ? 'as' : 'a'}</span>
        </div>

        <div className={`${styles.card} ${styles.pending}`}>
          <span className={styles.cardLabel}>⏳ Em Aberto</span>
          <span className={styles.cardValue} style={{ color: '#f59e0b' }}>{fmt(pendente)}</span>
          <span className={styles.cardSub}>{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
        </div>

        <div className={`${styles.card} ${styles.pct}`}>
          <span className={styles.cardLabel}>% Recebido</span>
          <span
            className={styles.cardValue}
            style={{ color: pctRecebido >= 80 ? '#22c55e' : pctRecebido >= 50 ? '#f59e0b' : '#f87171' }}
          >
            {pctRecebido.toFixed(0)}%
          </span>
          <span className={styles.cardSub}>do total em adesão</span>
        </div>
      </div>

      {/* split bar */}
      {total > 0 && (
        <div className={styles.splitBar}>
          <div
            className={styles.splitFill}
            style={{ width: `${pctRecebido}%`, background: '#22c55e' }}
            title={`Recebido: ${fmt(recebida)}`}
          />
          <div
            className={styles.splitFill}
            style={{ width: `${100 - pctRecebido}%`, background: '#f59e0b' }}
            title={`Em aberto: ${fmt(pendente)}`}
          />
        </div>
      )}

      {total > 0 && (
        <div className={styles.splitLabels}>
          <span style={{ color: '#22c55e' }}>■ Recebido {pctRecebido.toFixed(0)}%</span>
          <span style={{ color: '#f59e0b' }}>■ Pendente {(100 - pctRecebido).toFixed(0)}%</span>
        </div>
      )}
    </div>
  )
}
