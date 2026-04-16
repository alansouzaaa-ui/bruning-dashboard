import { useQuery } from '@tanstack/react-query'
import { getVendas } from '../api'
import styles from './VendasMesCard.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/* Mês atual fixo (não segue mesFiltro do header — sempre "agora") */
const MES_ATUAL = new Date().toISOString().slice(0, 7)

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmtData(str) {
  if (!str) return '—'
  const [, m, d] = str.split('-')
  return `${d}/${MESES_PT[parseInt(m, 10) - 1]}`
}

function StatusBadge({ status }) {
  const map = {
    'Ativo':      styles.ativo,
    'Trial':      styles.trial,
    'Cancelado':  styles.cancelado,
    'Pausado':    styles.pausado,
  }
  const cls = map[status] || styles.outro
  return <span className={`${styles.badge} ${cls}`}>{status || '—'}</span>
}

export default function VendasMesCard() {
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas', MES_ATUAL],
    queryFn:  () => getVendas({ mes: MES_ATUAL }),
    staleTime: 60_000,
  })

  const totalMRR  = vendas.reduce((s, v) => s + parseFloat(v.mrr   || 0), 0)
  const totalAdes = vendas.reduce((s, v) => s + parseFloat(v.adesao || 0), 0)

  /* Ordena por data decrescente (mais recentes primeiro) */
  const lista = [...vendas].sort((a, b) =>
    (b.data || '').localeCompare(a.data || '')
  )

  if (isLoading) {
    return (
      <div className="card">
        <div className={styles.card}>
          <div className={styles.titleRow}>
            <div className={styles.titleLeft}>
              <p className={styles.title}>Vendas do Mês</p>
            </div>
          </div>
          <div className={styles.skeleton}>
            {[100, 80, 100, 80, 100].map((w, i) => (
              <div key={i} className={styles.skBlock} style={{ height: 14, width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className={styles.card}>
        {/* Cabeçalho */}
        <div className={styles.titleRow}>
          <div className={styles.titleLeft}>
            <p className={styles.title}>Vendas do Mês</p>
            {vendas.length > 0 && (
              <span className={styles.countBadge}>{vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'}</span>
            )}
          </div>
        </div>

        {/* Totais */}
        {vendas.length > 0 && (
          <div className={styles.totais}>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>MRR total:</span>
              <span className={styles.totalVal}>{fmt(totalMRR)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>Adesão total:</span>
              <span className={styles.totalVal}>{fmt(totalAdes)}</span>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {lista.length === 0 ? (
          <div className={styles.empty}>Nenhuma venda registrada este mês.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Plano</th>
                  <th>MRR</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 11 }}>
                      {fmtData(v.data)}
                    </td>
                    <td className={styles.cliente} title={v.cliente}>{v.cliente || '—'}</td>
                    <td style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>{v.plano || '—'}</td>
                    <td className={styles.mrr}>{fmt(v.mrr)}</td>
                    <td><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
