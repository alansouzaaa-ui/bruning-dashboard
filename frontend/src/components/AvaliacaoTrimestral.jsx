import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAvaliacaoAtual, getHistoricoTrimestral, salvarMetaTrimestral } from '../api'
import { useToast } from './Toast'
import styles from './AvaliacaoTrimestral.module.css'

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtPct = (v) => `${Number(v).toFixed(1)}%`

function NivelBadge({ nivel }) {
  return (
    <span className={styles.nivelBadge} style={{ background: nivel.cor + '22', color: nivel.cor, borderColor: nivel.cor + '44' }}>
      {nivel.label}
    </span>
  )
}

function BarraProgresso({ valor, meta, cor }) {
  const pct = Math.min(100, Math.round((valor / meta) * 100))
  return (
    <div className={styles.barWrap}>
      <div className={styles.bar}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: cor }} />
      </div>
      <span className={styles.barPct}>{pct}%</span>
    </div>
  )
}

function CardAvaliacao({ av, destaque = false }) {
  return (
    <div className={`${styles.card} ${destaque ? styles.destaque : ''}`}>
      <div className={styles.cardTop}>
        <div>
          <span className={styles.cardLabel}>{av.label}</span>
          <div className={styles.cardMeses}>{av.meses.join(' · ')}</div>
        </div>
        <NivelBadge nivel={av.nivel} />
      </div>

      <div className={styles.atingimentoGeral}>
        <span className={styles.atingimentoNum} style={{ color: av.nivel.cor }}>
          {fmtPct(av.atingimento_geral)}
        </span>
        <span className={styles.atingimentoSub}>atingimento geral</span>
      </div>

      <div className={styles.metricas}>
        <div className={styles.metrica}>
          <div className={styles.metricaHeader}>
            <span>MRR</span>
            <span>{fmt(av.realizado_mrr)} / {fmt(av.meta_mrr)}</span>
          </div>
          <BarraProgresso valor={av.realizado_mrr} meta={av.meta_mrr} cor={av.nivel.cor} />
        </div>
        <div className={styles.metrica}>
          <div className={styles.metricaHeader}>
            <span>Adesão</span>
            <span>{fmt(av.realizado_ades)} / {fmt(av.meta_ades)}</span>
          </div>
          <BarraProgresso valor={av.realizado_ades} meta={av.meta_ades} cor={av.nivel.cor} />
        </div>
      </div>

      {destaque && (
        <div className={styles.planoAcao} style={{ borderColor: av.nivel.cor + '44' }}>
          <div className={styles.planoHeader} style={{ color: av.nivel.cor }}>Plano de Ação</div>
          <div className={styles.planoGrid}>
            <div><span className={styles.planoLabel}>Ação</span><span>{av.nivel.acao}</span></div>
            <div><span className={styles.planoLabel}>Prazo</span><span>{av.nivel.prazo}</span></div>
            <div><span className={styles.planoLabel}>Meta</span><span>{av.nivel.meta_plano}</span></div>
            <div className={styles.planoCons}><span className={styles.planoLabel}>Consequência</span><span>{av.nivel.consequencia}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AvaliacaoTrimestral() {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ meta_mrr: '', meta_ades: '' })
  const qc = useQueryClient()
  const toast = useToast()

  const { data: atual, isLoading } = useQuery({
    queryKey: ['trimestral-atual'],
    queryFn: getAvaliacaoAtual,
  })

  const { data: historico = [] } = useQuery({
    queryKey: ['trimestral-historico'],
    queryFn: getHistoricoTrimestral,
  })

  const salvar = useMutation({
    mutationFn: salvarMetaTrimestral,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trimestral-atual'] })
      qc.invalidateQueries({ queryKey: ['trimestral-historico'] })
      setEditando(false)
      toast('Metas do trimestre salvas!')
    },
    onError: () => toast('Erro ao salvar metas.', 'error'),
  })

  function abrirEdit() {
    setForm({ meta_mrr: atual?.meta_mrr ?? 15000, meta_ades: atual?.meta_ades ?? 9000 })
    setEditando(true)
  }

  function handleSalvar(e) {
    e.preventDefault()
    salvar.mutate({
      trimestre: atual.trimestre,
      meta_mrr:  parseFloat(form.meta_mrr)  || 15000,
      meta_ades: parseFloat(form.meta_ades) || 9000,
    })
  }

  if (isLoading) return <div className="card"><span className="trend-flat">Carregando...</span></div>

  // histórico sem o trimestre atual (já exibido em destaque)
  const historicoPast = historico.filter(h => h.trimestre !== atual?.trimestre)

  return (
    <div className={styles.wrap}>
      {/* Trimestre atual em destaque */}
      <div className={styles.atualWrap}>
        <div className={styles.atualHeader}>
          <h2 className={styles.titulo}>Avaliação Trimestral</h2>
          <button className={styles.editBtn} onClick={abrirEdit} title="Definir metas">
            ✏️ Definir metas
          </button>
        </div>

        {editando ? (
          <div className="card">
            <form onSubmit={handleSalvar} className={styles.editForm}>
              <h3 className={styles.editTitulo}>Metas — {atual?.label}</h3>
              <div className={styles.editGrid}>
                <div className={styles.editField}>
                  <label>Meta MRR do Trimestre (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={form.meta_mrr}
                    onChange={e => setForm(f => ({ ...f, meta_mrr: e.target.value }))}
                  />
                </div>
                <div className={styles.editField}>
                  <label>Meta Adesão do Trimestre (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={form.meta_ades}
                    onChange={e => setForm(f => ({ ...f, meta_ades: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.editActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvar.isPending}>
                  {salvar.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          atual && <CardAvaliacao av={atual} destaque />
        )}
      </div>

      {/* Histórico dos trimestres anteriores */}
      {historicoPast.length > 0 && (
        <div className={styles.historicoWrap}>
          <h3 className={styles.historicoTitulo}>Histórico</h3>
          <div className={styles.historicoGrid}>
            {historicoPast.map(h => (
              <CardAvaliacao key={h.trimestre} av={h} />
            ))}
          </div>
        </div>
      )}

      {/* Tabela de referência dos níveis */}
      <div className="card">
        <h3 className={styles.tabelaTitulo}>Tabela de Níveis de Performance</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Faixa</th>
                <th>Nível</th>
                <th>Ação do Líder</th>
                <th>Prazo</th>
                <th>Meta do Plano</th>
              </tr>
            </thead>
            <tbody>
              {[
                { faixa: '95% – 100%+', nivel: 'Excelente',              cor: '#22c55e', acao: 'Referência do time',       prazo: 'Contínuo',    meta: 'Ponto de referência para todos' },
                { faixa: '85% – 95%',   nivel: 'Ótimo',                  cor: '#84cc16', acao: 'Replicar práticas',        prazo: 'Contínuo',    meta: 'Manter e evoluir para ≥ 95%' },
                { faixa: '75% – 85%',   nivel: 'Satisfatório',           cor: '#eab308', acao: 'PDI próximo trimestre',    prazo: 'Trimestral',  meta: 'Evolução mínima de +5pp' },
                { faixa: '70% – 75%',   nivel: 'Repescagem',             cor: '#f97316', acao: 'Plano de Ação',            prazo: '60 dias',     meta: 'Mínimo 90% de atingimento' },
                { faixa: '60% – 70%',   nivel: 'Nível Máx. de Atenção',  cor: '#ef4444', acao: 'Plano de Ação urgente',   prazo: '30 dias',     meta: '100% de atingimento' },
              ].map(row => (
                <tr key={row.faixa}>
                  <td><span className={styles.faixaBadge} style={{ color: row.cor }}>{row.faixa}</span></td>
                  <td><span className={styles.nivelBadge} style={{ background: row.cor + '22', color: row.cor, borderColor: row.cor + '44' }}>{row.nivel}</span></td>
                  <td className={styles.muted}>{row.acao}</td>
                  <td className={styles.muted}>{row.prazo}</td>
                  <td className={styles.muted}>{row.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
