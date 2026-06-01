/**
 * FunilDiarioPanel — registro e análise da atividade comercial diária.
 * Dados persistidos exclusivamente em localStorage (sem chamadas à API).
 */
import { useState, useEffect, useMemo } from 'react'
import styles from './FunilDiarioPanel.module.css'

const STORAGE_KEY = 'funil_diario'

const METAS_DIA = {
  contatos:       15,
  followups:      10,
  demos:           3,
  propostas:       2,
  fechamentos:     1,
  reativacoes:     3,
  tempo_resposta:  5,   // meta MÁXIMA em minutos (menor = melhor)
}

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY = {
  data:           TODAY(),
  contatos:       '',
  followups:      '',
  demos:          '',
  propostas:      '',
  fechamentos:    '',
  reativacoes:    '',
  tempo_resposta: '',
}

/* ── localStorage helpers ─────────────────────────────────────── */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveHistory(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
}

/* ── color helpers ────────────────────────────────────────────── */
function kpiColor(value, meta, inverso = false) {
  if (value === '' || value === null) return 'neutral'
  const v = Number(value)
  if (inverso) {
    if (v <= meta)  return 'green'
    if (v <= 60)    return 'yellow'
    return 'red'
  }
  const pct = meta > 0 ? (v / meta) * 100 : 0
  if (pct >= 100) return 'green'
  if (pct >= 67)  return 'yellow'
  return 'red'
}

function barPct(value, meta, inverso = false) {
  if (value === '' || meta <= 0) return 0
  const v = Number(value)
  if (inverso) return Math.min(100, (meta / Math.max(v, 0.1)) * 100)
  return Math.min(100, (v / meta) * 100)
}

/* ── sub-components ───────────────────────────────────────────── */
function ProgressBar({ pct, color }) {
  return (
    <div className={styles.barTrack}>
      <div
        className={styles.barFill}
        style={{
          width: `${pct}%`,
          background: color === 'green'  ? 'var(--c-green)'
                    : color === 'yellow' ? 'var(--c-yellow)'
                    : color === 'red'    ? 'var(--c-red)'
                    : 'var(--border)',
        }}
      />
    </div>
  )
}

function KPICard({ label, value, meta, unit = '', inverso = false }) {
  const display = value !== '' && value !== null
    ? `${unit === '%' ? Number(value).toFixed(1) : Number(value)}${unit}`
    : '—'
  const color   = kpiColor(value, meta, inverso)
  const pct     = barPct(value, meta, inverso)
  const metaLabel = inverso ? `≤ ${meta}${unit}` : `${meta}${unit}`

  return (
    <div className={`${styles.kpiCard} ${styles[color]}`}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{display}</span>
      <ProgressBar pct={pct} color={color} />
      <span className={styles.kpiMeta}>Meta: {metaLabel}</span>
    </div>
  )
}

/* ── main component ───────────────────────────────────────────── */
export default function FunilDiarioPanel() {
  const [form,    setForm]    = useState({ ...EMPTY, data: TODAY() })
  const [history, setHistory] = useState([])
  const [saved,   setSaved]   = useState(false)

  /* Carregar histórico e pré-popular form com entrada de hoje se existir */
  useEffect(() => {
    const h = loadHistory()
    setHistory(h)
    const hoje = TODAY()
    const entrada = h.find(e => e.data === hoje)
    if (entrada) setForm({ ...EMPTY, ...entrada })
    else setForm({ ...EMPTY, data: hoje })
  }, [])

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setSaved(false)
  }

  function handleSave(e) {
    e.preventDefault()
    const hoje = form.data || TODAY()
    const updated = [
      ...history.filter(e => e.data !== hoje),
      { ...form, data: hoje },
    ].sort((a, b) => b.data.localeCompare(a.data))
    setHistory(updated)
    saveHistory(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClear() {
    if (!confirm('Limpar todo o histórico do funil diário? Esta ação não pode ser desfeita.')) return
    setHistory([])
    saveHistory([])
    setForm({ ...EMPTY, data: TODAY() })
  }

  /* KPIs calculados */
  const kpis = useMemo(() => {
    const n = (v) => Number(v) || 0
    const contatos   = n(form.contatos)
    const demos      = n(form.demos)
    const propostas  = n(form.propostas)
    const fechamentos = n(form.fechamentos)
    return {
      contatos,
      followups:   n(form.followups),
      demos,
      propostas,
      fechamentos,
      reativacoes: n(form.reativacoes),
      tempo:       n(form.tempo_resposta),
      taxaLD:      contatos  > 0 ? (demos      / contatos)  * 100 : '',
      taxaDP:      demos     > 0 ? (propostas  / demos)     * 100 : '',
      taxaPF:      propostas > 0 ? (fechamentos / propostas) * 100 : '',
    }
  }, [form])

  /* Últimos 7 dias para a tabela */
  const ultimos7 = history.slice(0, 7)

  const totais = useMemo(() => {
    if (!ultimos7.length) return null
    const soma = (campo) => ultimos7.reduce((s, e) => s + (Number(e[campo]) || 0), 0)
    const c = soma('contatos'), d = soma('demos'), p = soma('propostas'), f = soma('fechamentos')
    return {
      contatos: c, followups: soma('followups'), demos: d,
      propostas: p, fechamentos: f, reativacoes: soma('reativacoes'),
      tempo: ultimos7.length > 0
        ? (ultimos7.reduce((s, e) => s + (Number(e.tempo_resposta) || 0), 0) / ultimos7.length).toFixed(0)
        : '—',
      taxaLD: c > 0 ? ((d / c) * 100).toFixed(1) : '—',
      taxaPF: p > 0 ? ((f / p) * 100).toFixed(1) : '—',
    }
  }, [ultimos7])

  const numField = (label, field, placeholder = '0') => (
    <div className={styles.field}>
      <label>{label}</label>
      <input
        type="number" min="0"
        placeholder={placeholder}
        value={form[field]}
        onChange={e => set(field, e.target.value)}
      />
    </div>
  )

  return (
    <div className={styles.panel}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Funil Diário</h1>
        <p className={styles.pageSub}>Registre sua atividade comercial do dia e acompanhe suas taxas de conversão</p>
      </div>

      {/* ── Seção A — Formulário ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📝 Entrada do Dia</h2>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Data</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} required />
            </div>
            {numField('Contatos feitos', 'contatos')}
            {numField('Follow-ups', 'followups')}
            {numField('Demos realizadas', 'demos')}
            {numField('Propostas enviadas', 'propostas')}
            {numField('Fechamentos', 'fechamentos')}
            {numField('Reativações', 'reativacoes')}
            <div className={styles.field}>
              <label>Tempo de resposta (min)</label>
              <input
                type="number" min="0"
                placeholder="ex: 8"
                value={form.tempo_resposta}
                onChange={e => set('tempo_resposta', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={`btn btn-primary ${styles.saveBtn}`}>
              {saved ? '✓ Salvo!' : 'Salvar dia'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Seção B — KPI cards ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 KPIs do Dia</h2>
        <div className={styles.kpiGrid}>
          <KPICard label="Contatos"         value={kpis.contatos}   meta={METAS_DIA.contatos} />
          <KPICard label="Follow-ups"       value={kpis.followups}  meta={METAS_DIA.followups} />
          <KPICard label="Demos"            value={kpis.demos}      meta={METAS_DIA.demos} />
          <KPICard label="Propostas"        value={kpis.propostas}  meta={METAS_DIA.propostas} />
          <KPICard label="Fechamentos"      value={kpis.fechamentos} meta={METAS_DIA.fechamentos} />
          <KPICard label="Reativações"      value={kpis.reativacoes} meta={METAS_DIA.reativacoes} />
          <KPICard label="Tempo Resposta"   value={kpis.tempo}      meta={METAS_DIA.tempo_resposta} unit="min" inverso />
          <KPICard label="Taxa Lead→Demo"   value={kpis.taxaLD}     meta={15} unit="%" />
          <KPICard label="Taxa Demo→Prop."  value={kpis.taxaDP}     meta={40} unit="%" />
          <KPICard label="Taxa Prop.→Fech." value={kpis.taxaPF}     meta={25} unit="%" />
        </div>
      </section>

      {/* ── Seção C — Histórico ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📅 Histórico — Últimos 7 dias</h2>
          {history.length > 0 && (
            <button className={`btn btn-secondary ${styles.clearBtn}`} onClick={handleClear}>
              Limpar histórico
            </button>
          )}
        </div>

        {ultimos7.length === 0 ? (
          <p className={styles.empty}>Nenhum registro ainda. Preencha o formulário acima para começar.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cont.</th>
                  <th>Follow</th>
                  <th>Demos</th>
                  <th>Prop.</th>
                  <th>Fech.</th>
                  <th>Reat.</th>
                  <th>T.Resp.</th>
                  <th>L→D%</th>
                  <th>P→F%</th>
                </tr>
              </thead>
              <tbody>
                {ultimos7.map((e, i) => {
                  const c = Number(e.contatos) || 0
                  const d = Number(e.demos) || 0
                  const p = Number(e.propostas) || 0
                  const f = Number(e.fechamentos) || 0
                  const taxaLD = c > 0 ? ((d / c) * 100).toFixed(0) + '%' : '—'
                  const taxaPF = p > 0 ? ((f / p) * 100).toFixed(0) + '%' : '—'
                  return (
                    <tr key={i} className={e.data === TODAY() ? styles.rowHoje : ''}>
                      <td className={styles.dateCell}>{e.data}</td>
                      <td>{e.contatos   || '—'}</td>
                      <td>{e.followups  || '—'}</td>
                      <td>{e.demos      || '—'}</td>
                      <td>{e.propostas  || '—'}</td>
                      <td>{e.fechamentos || '—'}</td>
                      <td>{e.reativacoes || '—'}</td>
                      <td>{e.tempo_resposta ? `${e.tempo_resposta}min` : '—'}</td>
                      <td className={styles.taxaCell}>{taxaLD}</td>
                      <td className={styles.taxaCell}>{taxaPF}</td>
                    </tr>
                  )
                })}
              </tbody>
              {totais && (
                <tfoot>
                  <tr className={styles.totalsRow}>
                    <td>Totais / Média</td>
                    <td>{totais.contatos}</td>
                    <td>{totais.followups}</td>
                    <td>{totais.demos}</td>
                    <td>{totais.propostas}</td>
                    <td>{totais.fechamentos}</td>
                    <td>{totais.reativacoes}</td>
                    <td>{totais.tempo}min</td>
                    <td className={styles.taxaCell}>{totais.taxaLD}%</td>
                    <td className={styles.taxaCell}>{totais.taxaPF}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
