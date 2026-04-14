import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVendas, excluirVenda } from '../api'
import { useToast } from './Toast'
import styles from './TabelaVendas.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Badge({ status }) {
  const map = {
    Ativo:     'badge-ativo',
    Cancelado: 'badge-cancelado',
    Trial:     'badge-trial',
    Pausado:   'badge-pausado',
  }
  return <span className={`badge ${map[status] || ''}`}>{status}</span>
}

export default function TabelaVendas({ mes, onEditar }) {
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const qc = useQueryClient()
  const toast = useToast()

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas', mes, statusFiltro],
    queryFn: () => getVendas({ mes: mes || undefined, status: statusFiltro || undefined }),
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

  const filtradas = vendas.filter(v =>
    v.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    (v.cnpj || '').includes(busca) ||
    (v.cod || '').toLowerCase().includes(busca.toLowerCase())
  )

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
          <select
            className={styles.select}
            value={statusFiltro}
            onChange={e => setStatusFiltro(e.target.value)}
          >
            <option value="">Todos status</option>
            <option>Ativo</option>
            <option>Cancelado</option>
            <option>Trial</option>
            <option>Pausado</option>
          </select>
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
                <th>Data</th>
                <th>Cliente</th>
                <th>Plano</th>
                <th>Contrato</th>
                <th>MRR</th>
                <th>Adesão</th>
                <th>Status</th>
                <th>Origem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => (
                <tr key={v.id}>
                  <td className={styles.muted}>{v.data}</td>
                  <td>
                    <div className={styles.clienteNome}>{v.cliente}</div>
                    {v.cnpj && <div className={styles.cnpj}>{v.cnpj}</div>}
                  </td>
                  <td className={styles.muted}>{v.plano || '—'}</td>
                  <td className={styles.muted}>{v.contrato || '—'}</td>
                  <td className={styles.mono}>{fmt(v.mrr)}</td>
                  <td className={styles.mono}>{fmt(v.adesao)}</td>
                  <td><Badge status={v.status} /></td>
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
  )
}
