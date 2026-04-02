import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getKPIs, getMetas, updateMetas } from '../api'
import { useToast } from './Toast'
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

export default function RitmoCard({ mes }) {
  const filtroMes = mes || mesAtual()
  const [editando, setEditando] = useState(false)
  const [formMetas, setFormMetas] = useState({ meta_mrr: '', meta_ades: '' })
  const toast = useToast()
  const qc = useQueryClient()

  const { data: kpis } = useQuery({
    queryKey: ['kpis', filtroMes],
    queryFn: () => getKPIs(filtroMes),
  })

  const { data: metas } = useQuery({
    queryKey: ['metas'],
    queryFn: getMetas,
  })

  const salvarMetas = useMutation({
    mutationFn: updateMetas,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas'] })
      setEditando(false)
      toast('Metas atualizadas!')
    },
    onError: () => toast('Erro ao salvar metas.', 'error'),
  })

  const diasRestantes = diasUteisRestantes()
  const META_MRR  = metas?.meta_mrr  ?? 5000
  const META_ADES = metas?.meta_ades ?? 3000

  if (!kpis) return <div className={`card ${styles.card}`}><span className="trend-flat">Carregando...</span></div>

  const mrr  = +kpis.total_mrr
  const ades = +kpis.total_adesao

  const mrrNec  = diasRestantes > 0 ? (META_MRR  - mrr)  / diasRestantes : 0
  const adesNec = diasRestantes > 0 ? (META_ADES - ades) / diasRestantes : 0

  const pctMrr  = Math.min(100, Math.round((mrr  / META_MRR)  * 100))
  const pctAdes = Math.min(100, Math.round((ades / META_ADES) * 100))

  function abrirEdit() {
    setFormMetas({ meta_mrr: META_MRR, meta_ades: META_ADES })
    setEditando(true)
  }

  function salvar(e) {
    e.preventDefault()
    salvarMetas.mutate({
      meta_mrr:  parseFloat(formMetas.meta_mrr)  || 5000,
      meta_ades: parseFloat(formMetas.meta_ades) || 3000,
    })
  }

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Ritmo do Mês</h3>
        {!editando && (
          <button className={styles.editBtn} onClick={abrirEdit} title="Editar metas">✏️</button>
        )}
      </div>
      <p className={styles.sub}>{diasRestantes} dia(s) útil(eis) restante(s)</p>

      {editando ? (
        <form onSubmit={salvar} className={styles.editForm}>
          <div className={styles.editField}>
            <label>Meta MRR (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formMetas.meta_mrr}
              onChange={e => setFormMetas(f => ({ ...f, meta_mrr: e.target.value }))}
            />
          </div>
          <div className={styles.editField}>
            <label>Meta Adesão (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formMetas.meta_ades}
              onChange={e => setFormMetas(f => ({ ...f, meta_ades: e.target.value }))}
            />
          </div>
          <div className={styles.editActions}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditando(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvarMetas.isPending}>
              {salvarMetas.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
