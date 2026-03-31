import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getComissoes, criarComissao, excluirComissao } from '../api'
import styles from './ComissoesPanel.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const EMPTY_FORM = { mes: '', comis_mrr: '', comis_ades: '', total_pago: '', obs: '' }

export default function ComissoesPanel() {
  const [form, setForm] = useState(EMPTY_FORM)
  const qc = useQueryClient()

  const { data: comissoes = [], isLoading } = useQuery({
    queryKey: ['comissoes'],
    queryFn: getComissoes,
  })

  const criar = useMutation({
    mutationFn: criarComissao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comissoes'] })
      setForm(EMPTY_FORM)
    },
  })

  const excluir = useMutation({
    mutationFn: excluirComissao,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comissoes'] }),
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.mes) return alert('Informe o mês.')
    criar.mutate({
      mes:        form.mes,
      comis_mrr:  parseFloat(form.comis_mrr) || 0,
      comis_ades: parseFloat(form.comis_ades) || 0,
      total_pago: parseFloat(form.total_pago) || 0,
      obs:        form.obs || null,
    })
  }

  return (
    <div className={styles.wrap}>
      <div className={`card ${styles.formCard}`}>
        <h3 className={styles.title}>Registrar Comissão Paga</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Mês</label>
              <input type="month" value={form.mes} onChange={e => set('mes', e.target.value)} required />
            </div>
            <div className="field">
              <label>Total Pago (R$)</label>
              <input type="number" step="0.01" min="0" value={form.total_pago} onChange={e => set('total_pago', e.target.value)} placeholder="0,00" />
            </div>
            <div className="field">
              <label>Comissão MRR (R$)</label>
              <input type="number" step="0.01" min="0" value={form.comis_mrr} onChange={e => set('comis_mrr', e.target.value)} placeholder="0,00" />
            </div>
            <div className="field">
              <label>Comissão Adesão (R$)</label>
              <input type="number" step="0.01" min="0" value={form.comis_ades} onChange={e => set('comis_ades', e.target.value)} placeholder="0,00" />
            </div>
            <div className="field full">
              <label>Obs</label>
              <textarea value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="opcional" />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={criar.isPending}>
              {criar.isPending ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>

      <div className={`card ${styles.listaCard}`}>
        <h3 className={styles.title}>Histórico de Comissões</h3>
        {isLoading ? (
          <p className={styles.empty}>Carregando...</p>
        ) : comissoes.length === 0 ? (
          <p className={styles.empty}>Nenhuma comissão registrada.</p>
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
                    <td>{c.mes}</td>
                    <td className={styles.mono}>{fmt(c.total_pago)}</td>
                    <td className={styles.mono}>{fmt(c.comis_mrr)}</td>
                    <td className={styles.mono}>{fmt(c.comis_ades)}</td>
                    <td className={styles.muted}>{c.obs || '—'}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                        onClick={() => confirm('Excluir esta comissão?') && excluir.mutate(c.id)}
                      >
                        🗑
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
