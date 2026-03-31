import { useQuery } from '@tanstack/react-query'
import { getKPIs } from '../api'
import styles from './RitmoCard.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function diasUteisRestantes() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const ultimo = new Date(ano, mes + 1, 0).getDate()
  let uteis = 0
  for (let d = hoje.getDate(); d <= ultimo; d++) {
    const dia = new Date(ano, mes, d).getDay()
    if (dia !== 0 && dia !== 6) uteis++
  }
  return uteis
}

function mesAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

// Meta mensal — ajuste conforme necessário
const META_MRR = 5000
const META_ADES = 3000

export default function RitmoCard({ mes }) {
  const filtroMes = mes || mesAtual()

  const { data: kpis } = useQuery({
    queryKey: ['kpis', filtroMes],
    queryFn: () => getKPIs(filtroMes),
  })

  const diasRestantes = diasUteisRestantes()

  if (!kpis) return <div className={`card ${styles.card}`}><span className="trend-flat">Carregando...</span></div>

  const mrr = +kpis.total_mrr
  const ades = +kpis.total_adesao

  const mrrNec = diasRestantes > 0 ? (META_MRR - mrr) / diasRestantes : 0
  const adesNec = diasRestantes > 0 ? (META_ADES - ades) / diasRestantes : 0

  const pctMrr  = Math.min(100, Math.round((mrr  / META_MRR)  * 100))
  const pctAdes = Math.min(100, Math.round((ades / META_ADES) * 100))

  return (
    <div className={`card ${styles.card}`}>
      <h3 className={styles.title}>Ritmo do Mês</h3>
      <p className={styles.sub}>{diasRestantes} dia(s) útil(eis) restante(s)</p>

      <div className={styles.item}>
        <div className={styles.itemHeader}>
          <span>MRR</span>
          <span>{fmt(mrr)} / {fmt(META_MRR)}</span>
        </div>
        <div className={styles.bar}>
          <div className={styles.fill} style={{ width: `${pctMrr}%`, background: 'var(--accent)' }} />
        </div>
        <span className={styles.nec}>
          {mrrNec > 0 ? `${fmt(mrrNec)}/dia necessário` : '✅ Meta atingida'}
        </span>
      </div>

      <div className={styles.item}>
        <div className={styles.itemHeader}>
          <span>Adesão</span>
          <span>{fmt(ades)} / {fmt(META_ADES)}</span>
        </div>
        <div className={styles.bar}>
          <div className={styles.fill} style={{ width: `${pctAdes}%`, background: 'var(--accent2)' }} />
        </div>
        <span className={styles.nec}>
          {adesNec > 0 ? `${fmt(adesNec)}/dia necessário` : '✅ Meta atingida'}
        </span>
      </div>
    </div>
  )
}
