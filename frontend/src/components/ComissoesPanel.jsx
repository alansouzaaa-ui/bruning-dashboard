import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getComissoes, criarComissao, excluirComissao, getKPIs, getMetasMensais } from '../api'
import { useToast } from './Toast'
import ConfirmModal from './ConfirmModal'
import { calcularComissao } from '../business/comissoes.calc'
import { ANNUAL_TABLE, METAS_FIXAS, META_PADRAO } from '../business/comissoes.constants'
import styles from './ComissoesPanel.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtPct = (v) => `${(Number(v) * 100).toFixed(1)}%`

function gerarMeses(n = 20) {
  const meses = [], now = new Date()
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  for (let i = 0; i < n; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    meses.push({ val, label: `${nomes[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, labelLong: `${nomes[d.getMonth()]}/${d.getFullYear()}` })
  }
  return meses
}

const MESES = gerarMeses(20)

export default function ComissoesPanel() {
  const [mesSel, setMesSel]   = useState(MESES[0].val)   // mês padrão = atual
  const [calc, setCalc]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [mesIdx, setMesIdx]   = useState(0)             // índice na lista
  const qc    = useQueryClient()
  const toast = useToast()

  const { data: comissoes = [], isLoading } = useQuery({ queryKey: ['comissoes'], queryFn: getComissoes })
  const { data: metasMensais = [] }         = useQuery({ queryKey: ['metasMensais'], queryFn: getMetasMensais })

  const mesAtual = MESES[mesIdx]
  const mesLabel = mesAtual?.labelLong ?? ''
  const jaExiste = comissoes.some(c => c.mes === mesAtual?.val)

  async function recalcular() {
    if (!mesAtual) return
    setLoading(true)
    try {
      const kpi0    = await getKPIs(mesAtual.val)
      const mrr     = parseFloat(kpi0.total_mrr    || 0)
      const ades    = parseFloat(kpi0.total_adesao || 0)
      const churn3m = parseFloat(kpi0.churn_mrr    || 0)
      const anuais  = parseInt(kpi0.anuais          || 0)
      const metaConfig = metasMensais.find(m => m.mes === mesAtual.val)
      const meta = metaConfig?.meta_mrr || METAS_FIXAS[mesAtual.val] || META_PADRAO
      const resultado = calcularComissao({ mrr, ades, churn3m, anuais, meta })
      setCalc({ mrr, ades, churn3m, anuais, meta, ...resultado })
    } catch {
      toast('Erro ao calcular comissão.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Recalcula ao trocar mês
  function navMes(dir) {
    const next = mesIdx + dir
    if (next < 0 || next >= MESES.length) return
    setMesIdx(next)
    setCalc(null)
  }

  const criar = useMutation({
    mutationFn: criarComissao,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comissoes'] }); toast('Comissão registrada!') },
    onError: () => toast('Erro ao registrar comissão.', 'error'),
  })

  const excluir = useMutation({
    mutationFn: excluirComissao,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comissoes'] }); toast('Comissão excluída.') },
    onError: () => toast('Erro ao excluir comissão.', 'error'),
  })

  function registrar() {
    if (!calc) return toast('Calcule primeiro.', 'error')
    criar.mutate({
      mes:        mesAtual.val,
      comis_mrr:  calc.comis_mrr,
      comis_ades: calc.comis_ades,
      total_pago: calc.comis_mrr + calc.comis_ades,
      obs:        null,
    })
  }

  function pedirConfirmacao(id) {
    setConfirm({ message: 'Deseja excluir esta comissão?', onConfirm: () => { excluir.mutate(id); setConfirm(null) } })
  }

  return (
    <div className={styles.wrap}>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* ── Painel de simulação ── */}
      <div className={`card ${styles.simCard}`}>

        {/* Cabeçalho */}
        <div className={styles.simHeader}>
          <div>
            <div className={styles.simTitle}>Simulação — {mesLabel}</div>
            <div className={styles.simSub}>Cálculo baseado nas vendas ativas do mês</div>
          </div>
          <div className={styles.simActions}>
            <div className={styles.mesNav}>
              <button className={styles.mesNavBtn} onClick={() => navMes(1)} disabled={mesIdx >= MESES.length - 1}>‹</button>
              <span className={styles.mesNavLabel}>{mesAtual?.label}</span>
              <button className={styles.mesNavBtn} onClick={() => navMes(-1)} disabled={mesIdx <= 0}>›</button>
            </div>
            <button className={styles.btnRecalc} onClick={recalcular} disabled={loading}>
              {loading ? 'Calculando...' : '↻ Recalcular'}
            </button>
            <button
              className={styles.btnRegistrar}
              onClick={registrar}
              disabled={!calc || criar.isPending || jaExiste}
              title={jaExiste ? 'Mês já registrado' : ''}
            >
              {jaExiste ? '✓ Registrado' : criar.isPending ? 'Salvando...' : '✓ Registrar'}
            </button>
          </div>
        </div>

        {/* Corpo 3 colunas */}
        {!calc && !loading && (
          <div className={styles.emptyCalc}>
            <span>Clique em <strong>Recalcular</strong> para calcular a comissão de {mesLabel}</span>
          </div>
        )}
        {loading && (
          <div className={styles.emptyCalc}><span>Calculando...</span></div>
        )}

        {calc && !loading && (
          <div className={styles.simBody}>
            {/* Coluna MRR */}
            <div className={styles.simCol}>
              <div className={styles.colTitle}>MRR</div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>MRR Líquido total</span>
                <span className={styles.simVal}>{fmt(calc.mrr)}</span>
              </div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>Atingimento</span>
                <span className={`${styles.simVal} ${calc.atingimento >= 1 ? styles.green : calc.atingimento >= 0.7 ? styles.yellow : styles.red}`}>
                  {(calc.atingimento * 100).toFixed(1)}%
                </span>
              </div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>% Comissão MRR</span>
                <span className={styles.simVal}>{fmtPct(calc.mrrPct)}</span>
              </div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>Dedução churn ({fmtPct(calc.churnPct)})</span>
                <span className={`${styles.simVal} ${styles.red}`}>-{fmt(calc.churn3m * calc.churnPct)}</span>
              </div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>MRR base</span>
                <span className={styles.simVal}>{fmt(calc.mrr - calc.churn3m * calc.churnPct)}</span>
              </div>
              <div className={`${styles.simRow} ${styles.simRowBold}`}>
                <span className={styles.simKey}>Comissão MRR</span>
                <span className={`${styles.simVal} ${styles.green}`}>{fmt(calc.comis_mrr)}</span>
              </div>
            </div>

            {/* Coluna Adesão & Bônus */}
            <div className={styles.simCol}>
              <div className={styles.colTitle}>Adesão &amp; Bônus</div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>% Comissão adesão</span>
                <span className={styles.simVal}>{fmtPct(calc.adesPct)}</span>
              </div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>Comissão adesão</span>
                <span className={`${styles.simVal} ${styles.cyan}`}>{fmt(calc.comis_ades)}</span>
              </div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>Bônus plano anual (+{((ANNUAL_TABLE[Math.min(calc.anuais, 5)] || 0) * 100).toFixed(0)}%)</span>
                <span className={`${styles.simVal} ${styles.cyan}`}>{calc.anuais > 0 ? fmt(calc.comis_mrr * (ANNUAL_TABLE[Math.min(calc.anuais, 5)] || 0)) : '—'}</span>
              </div>
              <div className={styles.simRow}>
                <span className={styles.simKey}>Bônus meta 100%</span>
                <span className={`${styles.simVal} ${calc.metaBonus > 0 ? styles.green : styles.muted}`}>
                  {calc.metaBonus > 0 ? fmt(calc.metaBonus) : '—'}
                </span>
              </div>
            </div>

            {/* Coluna Total */}
            <div className={`${styles.simCol} ${styles.simColTotal}`}>
              <div className={styles.totalLabel}>Total do Mês</div>
              <div className={styles.totalVal}>{fmt(calc.comis_mrr + calc.comis_ades)}</div>
              <div className={styles.totalSub}>{calc.anuais} contrato{calc.anuais !== 1 ? 's' : ''} anual{calc.anuais !== 1 ? 'is' : ''}</div>
              <div className={styles.totalMeta}>
                <span>Meta</span>
                <span>{fmt(calc.meta)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Histórico ── */}
      <div className={`card ${styles.listaCard}`}>
        <h3 className={styles.listaTitle}>Histórico de Comissões</h3>
        {isLoading ? (
          <p className={styles.empty}>Carregando...</p>
        ) : comissoes.length === 0 ? (
          <p className={styles.empty}>Nenhuma comissão registrada ainda.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Comis. MRR</th>
                  <th>Comis. Adesão</th>
                  <th>Total</th>
                  <th>Obs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comissoes.map(c => (
                  <tr key={c.id}>
                    <td><span className={styles.mesBadge}>{c.mes}</span></td>
                    <td className={styles.mono}>{fmt(c.comis_mrr)}</td>
                    <td className={styles.mono}>{fmt(c.comis_ades)}</td>
                    <td className={`${styles.mono} ${styles.totalCell}`}>{fmt(c.total_pago)}</td>
                    <td className={styles.muted}>{c.obs || '—'}</td>
                    <td>
                      <button className={styles.btnDel} onClick={() => pedirConfirmacao(c.id)}>Excluir</button>
                    </td>
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
