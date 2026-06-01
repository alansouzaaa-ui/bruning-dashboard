import { useQuery } from '@tanstack/react-query'
import { getKPIs } from '../api'
import { fmt } from '../utils/fmt'
import styles from './PaymentKPIRow.module.css'


function SplitSection({ label, total, recebido, pendente, pagas, pendentes }) {
  const pct = total > 0 ? (recebido / total) * 100 : 0
  const cor  = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f87171'

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>{label}</span>
        <span className={styles.sectionPct} style={{ color: cor }}>
          {pct.toFixed(0)}% recebido
        </span>
      </div>

      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.neutral}`}>
          <span className={styles.cardLabel}>Total</span>
          <span className={styles.cardValue}>{fmt(total)}</span>
          <span className={styles.cardSub}>{(pagas + pendentes)} venda{(pagas + pendentes) !== 1 ? 's' : ''}</span>
        </div>

        <div className={`${styles.card} ${styles.paid}`}>
          <span className={styles.cardLabel}>✓ Recebido</span>
          <span className={styles.cardValue} style={{ color: '#22c55e' }}>{fmt(recebido)}</span>
          <span className={styles.cardSub}>{pagas} pago{pagas !== 1 ? 's' : ''}</span>
        </div>

        <div className={`${styles.card} ${styles.pending}`}>
          <span className={styles.cardLabel}>⏳ Em Aberto</span>
          <span className={styles.cardValue} style={{ color: '#f59e0b' }}>{fmt(pendente)}</span>
          <span className={styles.cardSub}>{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
        </div>

        <div className={`${styles.card} ${styles.pct}`}>
          <span className={styles.cardLabel}>% Recebido</span>
          <span className={styles.cardValue} style={{ color: cor }}>
            {pct.toFixed(0)}%
          </span>
          <span className={styles.cardSub}>do total</span>
        </div>
      </div>

      {total > 0 && (
        <>
          <div className={styles.splitBar}>
            <div
              className={styles.splitFill}
              style={{ width: `${pct}%`, background: '#22c55e' }}
            />
            <div
              className={styles.splitFill}
              style={{ width: `${100 - pct}%`, background: '#f59e0b' }}
            />
          </div>
          <div className={styles.splitLabels}>
            <span style={{ color: '#22c55e' }}>■ Recebido {pct.toFixed(0)}%</span>
            <span style={{ color: '#f59e0b' }}>■ Pendente {(100 - pct).toFixed(0)}%</span>
          </div>
        </>
      )}
    </div>
  )
}

export default function PaymentKPIRow({ mes }) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis', mes],
    queryFn:  () => getKPIs(mes),
  })

  if (isLoading || !kpis) return null

  const mrrRecebido    = Number(kpis.mrr_recebido)    || 0
  const mrrPendente    = Number(kpis.mrr_pendente)    || 0
  const adesaoRecebida = Number(kpis.adesao_recebida) || 0
  const adesaoPendente = Number(kpis.adesao_pendente) || 0
  const pagas          = Number(kpis.vendas_pagas)    || 0
  const pendentes      = Number(kpis.vendas_pendentes)|| 0

  const mrrTotal    = mrrRecebido + mrrPendente
  const adesaoTotal = adesaoRecebida + adesaoPendente

  // Com mês sem vendas ainda, omite este bloco — o alerta de meta já cobre a situação
  if (mrrTotal === 0 && adesaoTotal === 0 && pagas === 0 && pendentes === 0) return null

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.icon}>💳</span>
        <span className={styles.title}>Status de Pagamentos</span>
        <span className={styles.sub}>{pagas + pendentes} vendas · {pagas} pagas · {pendentes} pendentes</span>
      </div>

      <div className={styles.twoCol}>
        {mrrTotal > 0 && (
          <SplitSection
            label="MRR (contratos ativos)"
            total={mrrTotal}
            recebido={mrrRecebido}
            pendente={mrrPendente}
            pagas={pagas}
            pendentes={pendentes}
          />
        )}
        {adesaoTotal > 0 && (
          <SplitSection
            label="Adesão (taxa de onboarding)"
            total={adesaoTotal}
            recebido={adesaoRecebida}
            pendente={adesaoPendente}
            pagas={pagas}
            pendentes={pendentes}
          />
        )}
      </div>
    </div>
  )
}

