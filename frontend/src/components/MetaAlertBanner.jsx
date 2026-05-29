import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKPIs, getMetas, getMetasMensais } from '../api'
import { fmt } from '../utils/fmt'
import { mesAtual, diasUteisRestantes } from '../utils/date'
import { METAS_FIXAS, META_PADRAO } from '../business/comissoes.constants'
import styles from './MetaAlertBanner.module.css'

const MES_CORRENTE = mesAtual()

/**
 * Retorna o nível de alerta com base no atingimento e dias restantes.
 * null = sem alerta (confortável ou meta já batida).
 */
function calcNivel(atingimento, diasRestantes) {
  if (atingimento >= 100)                              return null
  if (diasRestantes <= 5  && atingimento < 65)         return 'critico'
  if (diasRestantes <= 8  && atingimento < 78)         return 'alto'
  if (diasRestantes <= 12 && atingimento < 88)         return 'medio'
  return null
}

const NIVEL = {
  critico: { cor: '#f87171', bg: 'rgba(248,113,113,0.09)', border: 'rgba(248,113,113,0.28)', icon: '⚠',  label: 'CRÍTICO' },
  alto:    { cor: '#f59e0b', bg: 'rgba(245,158,11,0.09)',  border: 'rgba(245,158,11,0.28)',  icon: '⚡', label: 'ATENÇÃO' },
  medio:   { cor: '#60a5fa', bg: 'rgba(96,165,250,0.09)',  border: 'rgba(96,165,250,0.28)',  icon: '◎',  label: 'ALERTA'  },
}

export default function MetaAlertBanner({ mes }) {
  /* Dismiss por sessão — o alerta some até o usuário recarregar */
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(`meta-alert-${MES_CORRENTE}`) === '1'
  )

  /* Só relevante para o mês atual */
  const mesEfetivo = mes || MES_CORRENTE
  const isMesAtual = mesEfetivo === MES_CORRENTE

  const { data: kpis } = useQuery({
    queryKey:  ['kpis', mesEfetivo],
    queryFn:   () => getKPIs(mesEfetivo),
    enabled:   isMesAtual,
    staleTime: 60_000,
  })

  const { data: metas } = useQuery({
    queryKey:  ['metas'],
    queryFn:   getMetas,
    enabled:   isMesAtual,
    staleTime: 300_000,
  })

  const { data: metasMensais = [] } = useQuery({
    queryKey:  ['metasMensais'],
    queryFn:   getMetasMensais,
    enabled:   isMesAtual,
    staleTime: 300_000,
  })

  if (!isMesAtual || dismissed || !kpis || !metas) return null

  const mrr          = Number(kpis.total_mrr) || 0
  const metaConfig   = metasMensais.find(m => m.mes === mesEfetivo)
  const meta         = metaConfig?.meta_mrr || METAS_FIXAS[mesEfetivo] || metas.meta_mrr || META_PADRAO
  const atingimento  = meta > 0 ? (mrr / meta) * 100 : 0
  const diasRestantes = diasUteisRestantes()
  const falta        = Math.max(0, meta - mrr)
  const taxaDiaria   = diasRestantes > 0 ? falta / diasRestantes : 0

  const nivel = calcNivel(atingimento, diasRestantes)
  if (!nivel) return null

  const cfg = NIVEL[nivel]

  function dismiss() {
    sessionStorage.setItem(`meta-alert-${MES_CORRENTE}`, '1')
    setDismissed(true)
  }

  return (
    <div className={styles.banner} style={{ background: cfg.bg, borderColor: cfg.border }}>
      <span className={styles.icon} style={{ color: cfg.cor }}>{cfg.icon}</span>
      <span className={styles.tag}  style={{ color: cfg.cor }}>{cfg.label}</span>
      <span className={styles.text}>
        <strong style={{ color: cfg.cor }}>{atingimento.toFixed(0)}%</strong> da meta atingida
        {' · '}faltam{' '}<strong style={{ color: 'var(--text)' }}>{fmt(falta)}</strong>
        {' · '}<strong style={{ color: 'var(--text)' }}>{diasRestantes}</strong> dias úteis restantes
        {taxaDiaria > 0 && (
          <>{' · '}necessário{' '}
            <strong style={{ color: cfg.cor }}>{fmt(taxaDiaria)}/dia</strong>
            {' '}para bater a meta
          </>
        )}
      </span>
      <button className={styles.close} onClick={dismiss} title="Fechar alerta" aria-label="Fechar alerta">
        ×
      </button>
    </div>
  )
}
