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

const EMPTY_FORM = { mes: '', comis_mrr: '', comis_ades: '', obs: '' }

function gerarMeses(n = 20) {
  const meses = [], now = new Date()
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  for (let i = 0; i < n; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    meses.push({ val, label: `${nomes[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` })
  }
  return meses
}

export default function ComissoesPanel() {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [calc, setCalc]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(null) // { message, onConfirm }
  const qc    = useQueryClient()
  const toast = useToast()

  // useMemo garante que os cards de mês reflitam o mês correto mesmo se a
  // aba ficar aberta durante a virada do mês
  const MESES = useMemo(() => gerarMeses(20), [])

  const { data: comissoes = [], isLoading } = useQuery({
    queryKey: ['comissoes'],
    queryFn: getComissoes,
  })

  const { data: metasMensais = [] } = useQuery({
    queryKey: ['metasMensais'],
    queryFn: getMetasMensais,
  })

  const criar = useMutation({
    mutationFn: criarComissao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comissoes'] })
      setForm(EMPTY_FORM)
      setCalc(null)
      toast('Comissão registrada!')
    },
    onError: () => toast('Erro ao registrar comissão.', 'error'),
  })

  const excluir = useMutation({
    mutationFn: excluirComissao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comissoes'] })
      toast('Comissão excluída.')
    },
    onError: () => toast('Erro ao excluir comissão.', 'error'),
  })

  // total_pago derivado dos campos — sem estado separado nem double-setState
  const totalPago = useMemo(() => {
    const mrr  = parseFloat(form.comis_mrr)  || 0
    const ades = parseFloat(form.comis_ades) || 0
    return Math.round((mrr + ades) * 100) / 100
  }, [form.comis_mrr, form.comis_ades])

  async function selecionarMes(mes) {
    const novo = form.mes === mes ? '' : mes
    setForm(f => ({ ...f, mes: novo, comis_mrr: '', comis_ades: '' }))
    setCalc(null)
    if (!novo) return

    setLoading(true)
    try {
      const kpi0    = await getKPIs(novo)
      const mrr     = parseFloat(kpi0.total_mrr    || 0)
      const ades    = parseFloat(kpi0.total_adesao  || 0)
      const churn3m = parseFloat(kpi0.churn_mrr     || 0)
      const anuais  = parseInt(kpi0.anuais           || 0)

      // Prioridade: metas configuradas no banco → METAS_FIXAS de rampagem → padrão
      const metaConfig = metasMensais.find(m => m.mes === novo)
      const meta = metaConfig?.meta_mrr || METAS_FIXAS[novo] || META_PADRAO

      const resultado = calcularComissao({ mrr, ades, churn3m, anuais, meta })
      setCalc({ mrr, ades, churn3m, anuais, meta, ...resultado })
      setForm(f => ({
        ...f,
        comis_mrr:  String(resultado.comis_mrr),
        comis_ades: String(resultado.comis_ades),
      }))
    } catch {
      toast('Erro ao calcular comissão.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.mes) return alert('Selecione o mês.')
    criar.mutate({
      mes:        form.mes,
      comis_mrr:  parseFloat(form.comis_mrr)  || 0,
      comis_ades: parseFloat(form.comis_ades) || 0,
      total_pago: totalPago,
      obs:        form.obs || null,
    })
  }

  function pedirConfirmacao(id) {
    setConfirm({
      message: 'Deseja excluir esta comissão? Esta ação não pode ser desfeita.',
      onConfirm: () => {
        excluir.mutate(id)
        setConfirm(null)
      },
    })
  }

  const mesesCadastrados = new Set(comissoes.map(c => c.mes))
  const mesLabel = MESES.find(m => m.val === form.mes)?.label

  return (
    <div className={styles.wrap}>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className={`card ${styles.formCard}`}>
        <h3 className={styles.title}>Registrar Comissão</h3>
        <form onSubmit={handleSubmit}>

          {/* Seletor de mês por cards */}
          <div className={styles.mesLabel}>Mês</div>
          <div className={styles.mesGrid}>
            {MESES.map(({ val, label }) => {
              const jaExiste    = mesesCadastrados.has(val)
              const selecionado = form.mes === val
              return (
                <button
                  key={val}
                  type="button"
                  className={`${styles.mesCard} ${selecionado ? styles.mesCardOn : ''} ${jaExiste ? styles.mesCardExiste : ''}`}
                  onClick={() => selecionarMes(val)}
                  title={jaExiste ? `${label} já cadastrado` : label}
                >
                  {label}
                  {jaExiste && <span className={styles.dot} />}
                </button>
              )
            })}
          </div>

          {/* Painel de cálculo automático */}
          {loading && (
            <div className={styles.calcBox}>
              <span className={styles.calcLoading}>Calculando comissão...</span>
            </div>
          )}

          {calc && !loading && (
            <div className={styles.calcBox}>
              <div className={styles.calcTitle}>Cálculo automático — {mesLabel}</div>
              <div className={styles.calcGrid}>
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>MRR vendido</span>
                  <span className={styles.calcVal}>{fmt(calc.mrr)}</span>
                </div>
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>% comis. MRR</span>
                  <span className={styles.calcVal}>{(calc.mrrPct * 100).toFixed(1)}%</span>
                </div>
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>Churn no mês</span>
                  <span className={styles.calcValRed}>{fmt(calc.churn3m)}</span>
                </div>
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>% churn desc.</span>
                  <span className={styles.calcValRed}>{(calc.churnPct * 100).toFixed(1)}%</span>
                </div>
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>Contratos anuais</span>
                  <span className={styles.calcVal}>{calc.anuais} → +{(ANNUAL_TABLE[Math.min(calc.anuais, 5)] * 100).toFixed(0)}%</span>
                </div>
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>Meta</span>
                  <span className={styles.calcVal}>{fmt(calc.meta)} → {(calc.atingimento * 100).toFixed(0)}%</span>
                </div>
                {calc.metaBonus > 0 && (
                  <div className={styles.calcItem}>
                    <span className={styles.calcKey}>Bônus meta 100%</span>
                    <span className={styles.calcValGreen}>+{fmt(calc.metaBonus)}</span>
                  </div>
                )}
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>Adesão vendida</span>
                  <span className={styles.calcVal}>{fmt(calc.ades)}</span>
                </div>
                <div className={styles.calcItem}>
                  <span className={styles.calcKey}>% comis. ades.</span>
                  <span className={styles.calcVal}>{(calc.adesPct * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className={styles.calcNote}>Valores pré-preenchidos abaixo — edite se necessário</div>
            </div>
          )}

          {/* Resumo total */}
          {(parseFloat(form.comis_mrr) > 0 || parseFloat(form.comis_ades) > 0) && (
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total a pagar</span>
              <span className={styles.totalVal}>
                {Number(totalPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Comissão MRR (R$)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.comis_mrr}
                onChange={e => setField('comis_mrr', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="field">
              <label>Comissão Adesão (R$)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.comis_ades}
                onChange={e => setField('comis_ades', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="field full">
              <label>Obs</label>
              <textarea
                value={form.obs}
                onChange={e => setField('obs', e.target.value)}
                placeholder="opcional"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={criar.isPending || !form.mes}>
              {criar.isPending ? 'Salvando...' : form.mes ? `Registrar ${mesLabel}` : 'Selecione um mês'}
            </button>
          </div>
        </form>
      </div>

      <div className={`card ${styles.listaCard}`}>
        <h3 className={styles.title}>Histórico de Comissões</h3>
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
                  <th>Total Pago</th>
                  <th>Comis. MRR</th>
                  <th>Comis. Adesão</th>
                  <th>Obs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comissoes.map(c => (
                  <tr key={c.id}>
                    <td><span className={styles.mesBadge}>{c.mes}</span></td>
                    <td className={`${styles.mono} ${styles.green}`}>{fmt(c.total_pago)}</td>
                    <td className={styles.mono}>{fmt(c.comis_mrr)}</td>
                    <td className={styles.mono}>{fmt(c.comis_ades)}</td>
                    <td className={styles.muted}>{c.obs || '—'}</td>
                    <td>
                      <button
                        className={styles.btnDel}
                        onClick={() => pedirConfirmacao(c.id)}
                      >
                        Excluir
                      </button>
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
