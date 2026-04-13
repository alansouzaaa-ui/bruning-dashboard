import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getKPIs, getMetas, updateMetas } from '../api'
import { useToast } from './Toast'
import { diasUteisRestantes, mesAtual } from '../utils/date'
import styles from './RitmoCard.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ProgressBar({ pct, color }) {
  const bg = color === 'green'  ? 'var(--c-green)'
           : color === 'yellow' ? 'var(--c-yellow)'
           : 'var(--c-red)'
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${Math.min(100, pct)}%`, background: bg }} />
    </div>
  )
}

function MetricBlock({ label, vendido, meta, diasUteis, isMesAtual }) {
  const falta  = Math.max(0, meta - vendido)
  const pct    = meta > 0 ? (vendido / meta) * 100 : 0
  const color  = pct >= 100 ? 'green' : pct >= 70 ? 'yellow' : 'red'
  const porDia = isMesAtual && diasUteis > 0 && falta > 0 ? falta / diasUteis : 0

  return (
    <div className={styles.metricBlock}>
      <div className={styles.metricHeader}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles[`pct${color.charAt(0).toUpperCase() + color.slice(1)}`]}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className={styles.metricValues}>
        <span className={styles.metricVendido}>{fmt(vendido)}</span>
        <span className={styles.metricMeta}>/ {fmt(meta)}</span>
      </div>
      <ProgressBar pct={pct} color={color} />
      <div className={styles.metricFooter}>
        {falta > 0 ? (
          <>
            <span className={styles[color === 'red' ? 'statusRed' : 'statusYellow']}>
              {color === 'green' ? '✓ Meta atingida' : `Falta ${fmt(falta)}`}
            </span>
            {isMesAtual && porDia > 0 && (
              <span className={styles.porDia}>{fmt(porDia)}/dia · {diasUteis}d restantes</span>
            )}
          </>
        ) : (
          <span className={styles.statusGreen}>✓ Meta atingida!</span>
        )}
      </div>
    </div>
  )
}

export default function RitmoCard({ mes }) {
  const filtroMes  = mes || mesAtual()
  const isMesAtual = filtroMes === mesAtual()
  const [editando, setEditando]   = useState(false)
  const [formMetas, setFormMetas] = useState({ meta_mrr: '', meta_ades: '' })
  const toast = useToast()
  const qc    = useQueryClient()

  const { data: kpis  } = useQuery({ queryKey: ['kpis', filtroMes], queryFn: () => getKPIs(filtroMes) })
  const { data: metas } = useQuery({ queryKey: ['metas'],            queryFn: getMetas })

  const salvarMetas = useMutation({
    mutationFn: updateMetas,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metas'] }); setEditando(false); toast('Metas atualizadas!') },
    onError: () => toast('Erro ao salvar metas.', 'error'),
  })

  const diasUteis = diasUteisRestantes()
  const META_MRR  = metas?.meta_mrr  ?? 5000
  const META_ADES = metas?.meta_ades ?? 3000

  // Label do mês
  const [ano, mesN] = filtroMes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const mesLabel = `${nomes[+mesN - 1]}/${ano}`

  if (!kpis) return <div className={`card ${styles.card}`}><span style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando...</span></div>

  const mrr  = +kpis.total_mrr
  const ades = +kpis.total_adesao

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
        <div>
          <h3 className={styles.title}>Ritmo do Mês</h3>
          <span className={styles.subtitle}>Meta de {mesLabel}</span>
        </div>
        {!editando && (
          <button className={styles.editBtn} onClick={abrirEdit}>⚙ Meta</button>
        )}
      </div>

      {editando ? (
        <form onSubmit={salvar} className={styles.editForm}>
          <div className={styles.editField}>
            <label>Meta MRR (R$)</label>
            <input type="number" step="0.01" value={formMetas.meta_mrr}
              onChange={e => setFormMetas(f => ({ ...f, meta_mrr: e.target.value }))} />
          </div>
          <div className={styles.editField}>
            <label>Meta Adesão (R$)</label>
            <input type="number" step="0.01" value={formMetas.meta_ades}
              onChange={e => setFormMetas(f => ({ ...f, meta_ades: e.target.value }))} />
          </div>
          <div className={styles.editActions}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvarMetas.isPending}>
              {salvarMetas.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.blocks}>
          <MetricBlock label="MRR"    vendido={mrr}  meta={META_MRR}  diasUteis={diasUteis} isMesAtual={isMesAtual} />
          <MetricBlock label="Adesão" vendido={ades} meta={META_ADES} diasUteis={diasUteis} isMesAtual={isMesAtual} />
        </div>
      )}
    </div>
  )
}
