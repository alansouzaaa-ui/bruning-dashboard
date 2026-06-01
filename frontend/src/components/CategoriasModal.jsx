/**
 * CategoriasModal — gerencia as opções de Plano, Segmento e Origem.
 * Aberto a partir da tela de Vendas.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCategorias, criarCategoria, excluirCategoria } from '../api'
import { useToast } from './Toast'
import styles from './CategoriasModal.module.css'

const TIPOS = [
  { key: 'plano',    label: 'Planos',    emoji: '📋' },
  { key: 'segmento', label: 'Segmentos', emoji: '🏷️' },
  { key: 'origem',   label: 'Origens',   emoji: '📡' },
]

function TipoSection({ tipo, label, emoji }) {
  const [novo, setNovo] = useState('')
  const qc    = useQueryClient()
  const toast = useToast()

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['categorias', tipo],
    queryFn:  () => getCategorias(tipo),
    staleTime: 60_000,
  })

  const criar = useMutation({
    mutationFn: () => criarCategoria({ tipo, valor: novo.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias', tipo] })
      qc.invalidateQueries({ queryKey: ['categorias-all'] })
      setNovo('')
      toast(`"${novo.trim()}" adicionado!`)
    },
    onError: (e) => {
      const msg = e?.response?.data?.detail || 'Erro ao adicionar.'
      toast(msg, 'error')
    },
  })

  const excluir = useMutation({
    mutationFn: excluirCategoria,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['categorias', tipo] })
      qc.invalidateQueries({ queryKey: ['categorias-all'] })
    },
    onError: () => toast('Erro ao excluir.', 'error'),
  })

  function handleAdd(e) {
    e.preventDefault()
    if (!novo.trim()) return
    criar.mutate()
  }

  return (
    <div className={styles.tipoSection}>
      <div className={styles.tipoHeader}>
        <span className={styles.tipoEmoji}>{emoji}</span>
        <h3 className={styles.tipoTitle}>{label}</h3>
        <span className={styles.tipoCount}>{itens.length}</span>
      </div>

      <div className={styles.tipoList}>
        {isLoading ? (
          <span className={styles.loading}>Carregando…</span>
        ) : itens.length === 0 ? (
          <span className={styles.empty}>Nenhuma opção ainda.</span>
        ) : (
          itens.map(item => (
            <div key={item.id} className={styles.tipoItem}>
              <span className={styles.tipoItemValor}>{item.valor}</span>
              <button
                className={styles.removeBtn}
                onClick={() => excluir.mutate(item.id)}
                disabled={excluir.isPending}
                title={`Remover "${item.valor}"`}
                aria-label={`Remover ${item.valor}`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          className={styles.addInput}
          placeholder={`Nova opção de ${label.toLowerCase()}…`}
          value={novo}
          onChange={e => setNovo(e.target.value)}
          maxLength={100}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!novo.trim() || criar.isPending}
          style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
        >
          {criar.isPending ? '…' : '+ Adicionar'}
        </button>
      </form>
    </div>
  )
}

export default function CategoriasModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${styles.modal}`}>
        <div className={styles.modalHeader}>
          <h2>⚙ Categorias de Vendas</h2>
          <p className={styles.modalSub}>
            Gerencie as opções disponíveis nos campos de Plano, Segmento e Origem ao cadastrar uma venda.
          </p>
        </div>

        <div className={styles.grid}>
          {TIPOS.map(t => (
            <TipoSection key={t.key} tipo={t.key} label={t.label} emoji={t.emoji} />
          ))}
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
