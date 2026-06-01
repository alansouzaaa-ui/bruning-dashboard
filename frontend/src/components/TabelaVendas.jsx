import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVendas, excluirVenda } from '../api'
import { useToast } from './Toast'
import { fmt, exportarCSV } from '../utils/fmt'
import CategoriasModal from './CategoriasModal'
import styles from './TabelaVendas.module.css'

function Badge({ status }) {
  const map = {
    Ativo:     'badge-ativo',
    Cancelado: 'badge-cancelado',
    Trial:     'badge-trial',
    Pausado:   'badge-pausado',
  }
  return <span className={`badge ${map[status] || ''}`}>{status}</span>
}

function PaymentBadge({ status }) {
  const isPaid = (status || 'pending') === 'paid'
  return (
    <span
      className="badge"
      style={{
        background: isPaid ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
        color:      isPaid ? '#22c55e' : '#f59e0b',
        border:     `1px solid ${isPaid ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
        fontWeight: 600,
        fontSize:   '0.7rem',
        padding:    '2px 8px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {isPaid ? '✓ Pago' : '⏳ Aguardando'}
    </span>
  )
}

export default function TabelaVendas({ mes, onEditar }) {
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [paymentFiltro, setPaymentFiltro] = useState('')
  const [zendeskFiltro, setZendeskFiltro] = useState('')
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const qc = useQueryClient()
  const toast = useToast()

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas', mes, statusFiltro, paymentFiltro],
    queryFn: () => getVendas({
      mes:            mes || undefined,
      status:         statusFiltro    || undefined,
      payment_status: paymentFiltro   || undefined,
    }),
  })

  const deletar = useMutation({
    mutationFn: excluirVenda,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['comparativo'] })
      qc.invalidateQueries({ queryKey: ['meses'] })
      toast('Venda excluída.')
    },
    onError: () => toast('Erro ao excluir venda.', 'error'),
  })

  function handleDelete(id, cliente) {
    if (!confirm(`Excluir venda de "${cliente}"?`)) return
    deletar.mutate(id)
  }

  const filtradas = vendas.filter(v => {
    const matchBusca = v.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      (v.cnpj || '').includes(busca) ||
      (v.cod || '').toLowerCase().includes(busca.toLowerCase())
    const matchZendesk = !zendeskFiltro || (v.zendesk || '') === zendeskFiltro
    return matchBusca && matchZendesk
  })

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.toolbar}>
        <h3 className={styles.title}>Vendas</h3>
        <div className={styles.filters}>
          <input
            className={styles.search}
            placeholder="Buscar cliente, CNPJ, cód..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select className={styles.select} value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
            <option value="">Todos status</option>
            <option>Ativo</option>
            <option>Cancelado</option>
            <option>Trial</option>
            <option>Pausado</option>
          </select>
          <select className={styles.select} value={paymentFiltro} onChange={e => setPaymentFiltro(e.target.value)}>
            <option value="">Todos pagamentos</option>
            <option value="paid">✓ Pago</option>
            <option value="pending">⏳ Aguardando</option>
          </select>
          <select className={styles.select} value={zendeskFiltro} onChange={e => setZendeskFiltro(e.target.value)}>
            <option value="">Zendesk — todos</option>
            <option value="Sim">✓ Sim</option>
            <option value="Não">✗ Não</option>
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => setCategoriasOpen(true)}
            title="Gerenciar planos, segmentos e origens"
            style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            ⚙ Categorias
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => exportarCSV(filtradas, mes)}
            title={`Exportar ${filtradas.length} registro(s) como CSV`}
            style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.loading}>Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className={styles.loading}>Nenhuma venda encontrada.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Entrada CRM</th>
                <th>Fechamento</th>
                <th>Cliente</th>
                <th>Plano</th>
                <th>Contrato</th>
                <th>MRR</th>
                <th>Adesão</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Zendesk</th>
                <th>Origem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => (
                <tr key={v.id}>
                  <td className={styles.muted} style={{ whiteSpace: 'nowrap' }}>
                    {v.data_crm || <span style={{ opacity: 0.3 }}>—</span>}
                  </td>
                  <td className={styles.muted} style={{ whiteSpace: 'nowrap' }}>{v.data}</td>
                  <td>
                    <div className={styles.clienteNome}>{v.cliente}</div>
                    {v.cnpj && <div className={styles.cnpj}>{v.cnpj}</div>}
                  </td>
                  <td className={styles.muted}>{v.plano || '—'}</td>
                  <td className={styles.muted}>{v.contrato || '—'}</td>
                  <td className={styles.mono}>{fmt(v.mrr)}</td>
                  <td className={styles.mono}>{fmt(v.adesao)}</td>
                  <td><Badge status={v.status} /></td>
                  <td><PaymentBadge status={v.payment_status} /></td>
                  <td style={{
                    color: v.zendesk === 'Sim' ? '#22c55e'
                         : v.zendesk === 'Não' ? '#f59e0b'
                         : 'var(--muted)',
                    fontSize: 11,
                    fontWeight: v.zendesk ? 600 : 400,
                  }}>
                    {v.zendesk === 'Sim' ? '✓ Sim'
                   : v.zendesk === 'Não' ? '✗ Não'
                   : '—'}
                  </td>
                  <td className={styles.muted}>{v.origem || '—'}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={`btn btn-secondary ${styles.btnSm}`}
                        onClick={() => onEditar(v)}
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn btn-danger ${styles.btnSm}`}
                        onClick={() => handleDelete(v.id, v.cliente)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {categoriasOpen && (
      <CategoriasModal onClose={() => setCategoriasOpen(false)} />
    )}
  )
}
