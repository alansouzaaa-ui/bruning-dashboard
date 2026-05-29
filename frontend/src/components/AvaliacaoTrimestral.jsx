import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAvaliacaoAtual, getHistoricoTrimestral, getPerformanceGeral,
  salvarMetaTrimestral, getMetasMensais, salvarMetasMensais, deletarMetaMensal,
} from '../api'
import { useToast } from './Toast'
import styles from './AvaliacaoTrimestral.module.css'


const fmtPct = (v) => `${Number(v).toFixed(1)}%`

const NIVEL_CORES = {
  excelente:    '#22c55e',
  otimo:        '#84cc16',
  satisfatorio: '#eab308',
  repescagem:   '#f97316',
  atencao:      '#ef4444',
}

function NivelBadge({ nivel }) {
  return (
    <span className={styles.nivelBadge} style={{ background: nivel.cor + '22', color: nivel.cor, borderColor: nivel.cor + '44' }}>
      {nivel.label}
    </span>
  )
}

function BarraProgresso({ valor, meta, cor }) {
  const pct = Math.min(100, Math.round((valor / (meta || 1)) * 100))
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
          <div className={styles.cardMeses}>
            {av.meses.join(' · ')}
            {av.usa_meta_mensal && (
              <span className={styles.rampTag}>rampagem</span>
            )}
          </div>
        </div>
        <NivelBadge nivel={av.nivel} />
      </div>

      <div className={styles.atingimentoGeral}>
        <span className={styles.atingimentoNum} style={{ color: av.nivel.cor }}>
          {fmtPct(av.atingimento_geral)}
        </span>
        <span className={styles.atingimentoSub}>atingimento MRR</span>
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
          <BarraProgresso valor={av.realizado_ades} meta={av.meta_ades} cor="#60a5fa" />
        </div>
      </div>

      {/* Detalhe mensal quando há metas individuais */}
      {av.usa_meta_mensal && av.metas_mensais?.length > 0 && (
        <div className={styles.detalhe}>
          {av.metas_mensais.map(m => (
            <div key={m.mes} className={styles.detalheRow}>
              <span className={styles.detalheMes}>{m.label}</span>
              <div className={styles.detalheBar}>
                <BarraProgresso valor={m.realizado_mrr} meta={m.meta_mrr || 1} cor={av.nivel.cor} />
              </div>
              <span className={styles.detalheVals}>
                {fmt(m.realizado_mrr)} / {fmt(m.meta_mrr)}
              </span>
            </div>
          ))}
        </div>
      )}

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

function MetasMensaisEditor({ onClose }) {
  const qc = useQueryClient()
  const toast = useToast()

  const { data: salvas = [] } = useQuery({
    queryKey: ['metas-mensais'],
    queryFn: getMetasMensais,
  })

  // Estado local: meses editáveis
  const [linhas, setLinhas] = useState(() => {
    // Pré-popular com meses do período de rampagem + todas as salvas
    const defaults = [
      { mes: '2024-11', meta_mrr: '' },
      { mes: '2024-12', meta_mrr: '' },
      { mes: '2025-01', meta_mrr: '' },
      { mes: '2025-02', meta_mrr: '' },
      { mes: '2025-03', meta_mrr: '' },
    ]
    return defaults
  })

  // Preencher com valores salvos quando carregados
  useState(() => {
    if (salvas.length) {
      setLinhas(prev => prev.map(l => {
        const salva = salvas.find(s => s.mes === l.mes)
        return salva ? { ...l, meta_mrr: salva.meta_mrr } : l
      }))
    }
  })

  const salvar = useMutation({
    mutationFn: salvarMetasMensais,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas-mensais'] })
      qc.invalidateQueries({ queryKey: ['trimestral-atual'] })
      qc.invalidateQueries({ queryKey: ['trimestral-historico'] })
      qc.invalidateQueries({ queryKey: ['trimestral-performance-geral'] })
      toast('Metas mensais salvas!')
      onClose()
    },
    onError: () => toast('Erro ao salvar.', 'error'),
  })

  function handleSalvar(e) {
    e.preventDefault()
    const validas = linhas
      .filter(l => l.mes && parseFloat(l.meta_mrr) > 0)
      .map(l => ({ mes: l.mes, meta_mrr: parseFloat(l.meta_mrr) }))
    if (!validas.length) return toast('Informe pelo menos uma meta.', 'error')
    salvar.mutate(validas)
  }

  function setLinha(idx, field, value) {
    setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function addLinha() {
    setLinhas(prev => [...prev, { mes: '', meta_mrr: '' }])
  }

  const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  function labelMes(mes) {
    if (!mes) return ''
    const [ano, m] = mes.split('-')
    return `${MESES_PT[parseInt(m) - 1]}/${ano.slice(2)}`
  }

  return (
    <div className="card">
      <form onSubmit={handleSalvar} className={styles.editForm}>
        <div className={styles.editTituloRow}>
          <h3 className={styles.editTitulo}>Metas Mensais — Período de Rampagem</h3>
          <span className={styles.editSubtitulo}>
            Defina metas individuais por mês. Trimestres com metas mensais usam a soma delas como meta trimestral.
          </span>
        </div>

        <div className={styles.mensaisTabela}>
          <div className={styles.mensaisHeader}>
            <span>Mês</span>
            <span>Meta MRR (R$)</span>
            <span></span>
          </div>
          {linhas.map((l, idx) => (
            <div key={idx} className={styles.mensaisRow}>
              <input
                type="month"
                value={l.mes}
                onChange={e => setLinha(idx, 'mes', e.target.value)}
                className={styles.mensaisInput}
              />
              <input
                type="number"
                step="0.01"
                placeholder="ex: 2000,00"
                value={l.meta_mrr}
                onChange={e => setLinha(idx, 'meta_mrr', e.target.value)}
                className={styles.mensaisInput}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => setLinhas(prev => prev.filter((_, i) => i !== idx))}
              >✕</button>
            </div>
          ))}
        </div>

        <button type="button" className={styles.addBtn} onClick={addLinha}>
          + Adicionar mês
        </button>

        <div className={styles.editActions}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando...' : 'Salvar metas mensais'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AvaliacaoTrimestral() {
  const [editando, setEditando] = useState(false)         // editar meta trimestral
  const [editandoMensais, setEditandoMensais] = useState(false)
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

  const { data: perfGeral } = useQuery({
    queryKey: ['trimestral-performance-geral'],
    queryFn: getPerformanceGeral,
  })

  const salvar = useMutation({
    mutationFn: salvarMetaTrimestral,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trimestral-atual'] })
      qc.invalidateQueries({ queryKey: ['trimestral-historico'] })
      qc.invalidateQueries({ queryKey: ['trimestral-performance-geral'] })
      setEditando(false)
      toast('Metas do trimestre salvas!')
    },
    onError: () => toast('Erro ao salvar metas.', 'error'),
  })

  function abrirEdit() {
    setForm({ meta_mrr: atual?.meta_mrr ?? 15000, meta_ades: atual?.meta_ades ?? 9000 })
    setEditando(true)
    setEditandoMensais(false)
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

  const historicoPast = historico.filter(h => h.trimestre !== atual?.trimestre)

  return (
    <div className={styles.wrap}>

      {/* Indicador de Performance Geral */}
      {perfGeral && perfGeral.trimestres_com_dados > 0 && (
        <div className={`card ${styles.geralCard}`}>
          <div className={styles.geralLeft}>
            <span className={styles.geralTitulo}>Performance Geral</span>
            <span className={styles.geralSub}>
              Média de {perfGeral.total_meses ?? perfGeral.trimestres_com_dados} mese{(perfGeral.total_meses ?? perfGeral.trimestres_com_dados) !== 1 ? 's' : ''} com dados
            </span>
          </div>
          <div className={styles.geralCenter}>
            <span className={styles.geralNum} style={{ color: perfGeral.nivel?.cor }}>
              {perfGeral.media_atingimento.toFixed(1)}%
            </span>
            <NivelBadge nivel={perfGeral.nivel} />
          </div>
          <div className={styles.geralDist}>
            {Object.entries(perfGeral.distribuicao).map(([codigo, qtd]) => (
              <div key={codigo} className={styles.distItem}>
                <span className={styles.distDot} style={{ background: NIVEL_CORES[codigo] }} />
                <span className={styles.distQtd}>{qtd}x</span>
                <span className={styles.distLabel}>{codigo.charAt(0).toUpperCase() + codigo.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metas mensais (rampagem) */}
      {editandoMensais ? (
        <MetasMensaisEditor onClose={() => setEditandoMensais(false)} />
      ) : null}

      {/* Trimestre atual em destaque */}
      <div className={styles.atualWrap}>
        <div className={styles.atualHeader}>
          <h2 className={styles.titulo}>Avaliação Trimestral</h2>
          <div className={styles.atualBtns}>
            <button className={styles.editBtn} onClick={() => { setEditandoMensais(v => !v); setEditando(false) }}>
              📅 Metas por mês
            </button>
            <button className={styles.editBtn} onClick={abrirEdit}>
              ✏️ Meta trimestral
            </button>
          </div>
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

      {/* Histórico */}
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
                { faixa: '95% – 100%+', nivel: 'Excelente',             cor: '#22c55e', acao: 'Referência do time',      prazo: 'Contínuo',   meta: 'Ponto de referência para todos' },
                { faixa: '85% – 95%',   nivel: 'Ótimo',                 cor: '#84cc16', acao: 'Replicar práticas',       prazo: 'Contínuo',   meta: 'Manter e evoluir para ≥ 95%' },
                { faixa: '75% – 85%',   nivel: 'Satisfatório',          cor: '#eab308', acao: 'PDI próximo trimestre',   prazo: 'Trimestral', meta: 'Evolução mínima de +5pp' },
                { faixa: '70% – 75%',   nivel: 'Repescagem',            cor: '#f97316', acao: 'Plano de Ação',           prazo: '60 dias',    meta: 'Mínimo 90% de atingimento' },
                { faixa: '60% – 70%',   nivel: 'Nível Máx. de Atenção', cor: '#ef4444', acao: 'Plano de Ação urgente',  prazo: '30 dias',    meta: '100% de atingimento' },
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

