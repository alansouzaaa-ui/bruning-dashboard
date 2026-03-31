import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { criarVenda, editarVenda, buscarCNPJ } from '../api'
import styles from './ModalVenda.module.css'

const EMPTY = {
  data: new Date().toISOString().slice(0, 10),
  cod: '', cliente: '', cnpj: '', segmento: '', plano: '',
  contrato: 'Mensal', mrr: '', adesao: '', churn_mrr: '',
  status: 'Ativo', tipo: '', obs: '',
}

export default function ModalVenda({ venda, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [showChurn, setShowChurn] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    if (venda) {
      setForm({
        data:      venda.data || EMPTY.data,
        cod:       venda.cod || '',
        cliente:   venda.cliente || '',
        cnpj:      venda.cnpj || '',
        segmento:  venda.segmento || '',
        plano:     venda.plano || '',
        contrato:  venda.contrato || 'Mensal',
        mrr:       venda.mrr != null ? String(venda.mrr) : '',
        adesao:    venda.adesao != null ? String(venda.adesao) : '',
        churn_mrr: venda.churn_mrr != null ? String(venda.churn_mrr) : '',
        status:    venda.status || 'Ativo',
        tipo:      venda.tipo || '',
        obs:       venda.obs || '',
      })
      setShowChurn(venda.status === 'Cancelado')
    }
  }, [venda])

  useEffect(() => {
    setShowChurn(form.status === 'Cancelado')
  }, [form.status])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['vendas'] })
    qc.invalidateQueries({ queryKey: ['kpis'] })
    qc.invalidateQueries({ queryKey: ['comparativo'] })
    qc.invalidateQueries({ queryKey: ['meses'] })
    onClose()
  }

  const criar = useMutation({ mutationFn: criarVenda, onSuccess: invalidate })
  const editar = useMutation({ mutationFn: ({ id, body }) => editarVenda(id, body), onSuccess: invalidate })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleCNPJBlur() {
    const raw = form.cnpj.replace(/\D/g, '')
    if (raw.length !== 14) return
    setCnpjLoading(true)
    try {
      const data = await buscarCNPJ(raw)
      set('cliente', data.razao_social || data.nome_fantasia || form.cliente)
      set('segmento', data.cnae_fiscal_descricao || form.segmento)
    } catch {
      // silencioso — CNPJ não encontrado
    } finally {
      setCnpjLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.cliente.trim()) return alert('Informe o cliente.')
    if (+form.mrr <= 0 && form.status !== 'Cancelado') return alert('MRR deve ser maior que zero.')

    const body = {
      data:      form.data,
      cod:       form.cod || null,
      cliente:   form.cliente.trim(),
      cnpj:      form.cnpj || null,
      segmento:  form.segmento || null,
      plano:     form.plano || null,
      contrato:  form.contrato || null,
      mrr:       parseFloat(form.mrr) || 0,
      adesao:    parseFloat(form.adesao) || 0,
      churn_mrr: parseFloat(form.churn_mrr) || 0,
      status:    form.status || null,
      tipo:      form.tipo || null,
      obs:       form.obs || null,
    }

    if (venda) {
      editar.mutate({ id: venda.id, body })
    } else {
      criar.mutate(body)
    }
  }

  const loading = criar.isPending || editar.isPending

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{venda ? 'Editar Venda' : 'Nova Venda'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Data</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} required />
            </div>
            <div className="field">
              <label>Cód. Cliente</label>
              <input value={form.cod} onChange={e => set('cod', e.target.value)} placeholder="opcional" />
            </div>

            <div className="field">
              <label>CNPJ</label>
              <input
                value={form.cnpj}
                onChange={e => set('cnpj', e.target.value)}
                onBlur={handleCNPJBlur}
                placeholder="00.000.000/0000-00"
              />
              {cnpjLoading && <span className={styles.hint}>Buscando...</span>}
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Ativo</option>
                <option>Cancelado</option>
                <option>Trial</option>
                <option>Pausado</option>
              </select>
            </div>

            <div className="field full">
              <label>Cliente / Razão Social</label>
              <input value={form.cliente} onChange={e => set('cliente', e.target.value)} required placeholder="Nome do cliente" />
            </div>

            <div className="field">
              <label>Segmento</label>
              <input value={form.segmento} onChange={e => set('segmento', e.target.value)} placeholder="ex: Varejo" />
            </div>
            <div className="field">
              <label>Plano</label>
              <input value={form.plano} onChange={e => set('plano', e.target.value)} placeholder="ex: Pro" />
            </div>

            <div className="field">
              <label>Contrato</label>
              <select value={form.contrato} onChange={e => set('contrato', e.target.value)}>
                <option>Mensal</option>
                <option>Anual</option>
              </select>
            </div>
            <div className="field">
              <label>Tipo</label>
              <input value={form.tipo} onChange={e => set('tipo', e.target.value)} placeholder="ex: Novo, Expansão" />
            </div>

            <div className="field">
              <label>MRR (R$)</label>
              <input type="number" step="0.01" min="0" value={form.mrr} onChange={e => set('mrr', e.target.value)} placeholder="0,00" />
            </div>
            <div className="field">
              <label>Adesão (R$)</label>
              <input type="number" step="0.01" min="0" value={form.adesao} onChange={e => set('adesao', e.target.value)} placeholder="0,00" />
            </div>

            {showChurn && (
              <div className="field">
                <label>Churn MRR (R$)</label>
                <input type="number" step="0.01" min="0" value={form.churn_mrr} onChange={e => set('churn_mrr', e.target.value)} placeholder="0,00" />
              </div>
            )}

            <div className="field full">
              <label>Observações</label>
              <textarea value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="Notas opcionais" />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : venda ? 'Salvar' : 'Criar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
