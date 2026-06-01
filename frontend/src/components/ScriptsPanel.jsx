import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScripts, criarScript, editarScript, excluirScript, toggleFavorito, seedScripts } from '../api'
import { useToast } from './Toast'
import styles from './ScriptsPanel.module.css'

/* ── Constants ─────────────────────────────────────────────────── */
const CATEGORIAS = ['Reativação', 'Objeção', 'Fechamento', 'Primeiro Contato', 'Follow-up', 'Outro']
const CANAIS     = ['WhatsApp texto', 'WhatsApp áudio', 'Ligação', 'Instagram DM', 'E-mail', 'Outro']
const PERFIS     = ['A', 'B', 'C', 'D', 'Geral']

const CAT_COLORS = {
  'Reativação':     { bg: 'rgba(96,165,250,0.12)',    color: '#60a5fa' },
  'Objeção':        { bg: 'rgba(248,113,113,0.12)',   color: '#f87171' },
  'Fechamento':     { bg: 'rgba(204,244,106,0.12)',   color: '#ccf46a' },
  'Primeiro Contato': { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  'Follow-up':      { bg: 'rgba(245,158,11,0.12)',   color: '#f59e0b' },
  'Outro':          { bg: 'rgba(255,255,255,0.06)',   color: '#6b7280' },
}

const EMPTY_FORM = {
  titulo: '', categoria: 'Reativação', canal: 'WhatsApp texto',
  perfil: 'Geral', dia_toque: '', conteudo: '', tags: '', favorito: false,
}

/* ── Badge ──────────────────────────────────────────────────────── */
function Badge({ text, tipo }) {
  const cfg = tipo === 'cat' ? (CAT_COLORS[text] || CAT_COLORS['Outro']) : null
  return (
    <span
      className={styles.badge}
      style={cfg ? { background: cfg.bg, color: cfg.color } : undefined}
    >
      {text}
    </span>
  )
}

/* ── CopyButton ────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handle() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button className={`btn btn-secondary ${styles.copyBtn}`} onClick={handle}>
      {copied ? '✓ Copiado!' : '📋 Copiar script'}
    </button>
  )
}

/* ── Modal ──────────────────────────────────────────────────────── */
function ScriptModal({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(initial || { ...EMPTY_FORM })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.conteudo.trim()) return
    onSave({
      ...form,
      dia_toque: form.dia_toque !== '' ? Number(form.dia_toque) : null,
      favorito:  Boolean(form.favorito),
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${styles.modal}`}>
        <h2>{initial ? 'Editar Script' : 'Novo Script'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalGrid}>
            <div className={`field ${styles.fullCol}`}>
              <label>Título *</label>
              <input value={form.titulo} onChange={e => set('titulo', e.target.value)} required placeholder="Ex: Reativação Dia 1 — Perfil A" />
            </div>
            <div className="field">
              <label>Categoria *</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Canal</label>
              <select value={form.canal} onChange={e => set('canal', e.target.value)}>
                <option value="">— nenhum —</option>
                {CANAIS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Perfil alvo</label>
              <select value={form.perfil} onChange={e => set('perfil', e.target.value)}>
                <option value="">— nenhum —</option>
                {PERFIS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Dia do toque</label>
              <input type="number" min="1" value={form.dia_toque} onChange={e => set('dia_toque', e.target.value)} placeholder="ex: 1, 2, 7..." />
            </div>
            <div className={`field ${styles.fullCol}`}>
              <label>Tags (separadas por vírgula)</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="ex: urgência, preço, objeção" />
            </div>
            <div className={`field ${styles.fullCol}`}>
              <label>Conteúdo do script *</label>
              <textarea
                value={form.conteudo}
                onChange={e => set('conteudo', e.target.value)}
                required
                rows={8}
                placeholder="Escreva o script aqui. Use [nome] para marcadores variáveis."
                className={styles.textarea}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : initial ? 'Salvar' : 'Criar Script'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function ScriptsPanel() {
  const qc    = useQueryClient()
  const toast = useToast()

  const [selected,   setSelected]   = useState(null)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  /* Filtros */
  const [busca,       setBusca]       = useState('')
  const [filtCat,     setFiltCat]     = useState('')
  const [filtCanal,   setFiltCanal]   = useState('')
  const [filtPerfil,  setFiltPerfil]  = useState('')
  const [filtFav,     setFiltFav]     = useState(false)

  /* Queries */
  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['scripts'],
    queryFn:  () => getScripts(),
    staleTime: 60_000,
  })

  /* Mutations */
  const invalidate = () => qc.invalidateQueries({ queryKey: ['scripts'] })

  const criar = useMutation({
    mutationFn: criarScript,
    onSuccess: (novo) => { invalidate(); setModalOpen(false); setSelected(novo); toast('Script criado!') },
    onError: () => toast('Erro ao criar script.', 'error'),
  })

  const editar = useMutation({
    mutationFn: ({ id, body }) => editarScript(id, body),
    onSuccess: (atualizado) => { invalidate(); setModalOpen(false); setSelected(atualizado); toast('Script atualizado!') },
    onError: () => toast('Erro ao editar script.', 'error'),
  })

  const excluir = useMutation({
    mutationFn: excluirScript,
    onSuccess: () => { invalidate(); setSelected(null); toast('Script excluído.') },
    onError: () => toast('Erro ao excluir script.', 'error'),
  })

  const favMut = useMutation({
    mutationFn: toggleFavorito,
    onSuccess: (atualizado) => { invalidate(); if (selected?.id === atualizado.id) setSelected(atualizado) },
  })

  const seed = useMutation({
    mutationFn: seedScripts,
    onSuccess: (r) => { invalidate(); toast(r.message) },
    onError: () => toast('Erro ao carregar scripts padrão.', 'error'),
  })

  /* Filtrado */
  const filtrados = useMemo(() => {
    let arr = scripts
    if (filtCat)   arr = arr.filter(s => s.categoria === filtCat)
    if (filtCanal) arr = arr.filter(s => s.canal === filtCanal)
    if (filtPerfil) arr = arr.filter(s => s.perfil === filtPerfil)
    if (filtFav)   arr = arr.filter(s => s.favorito)
    if (busca) {
      const q = busca.toLowerCase()
      arr = arr.filter(s => s.titulo.toLowerCase().includes(q) || s.conteudo.toLowerCase().includes(q))
    }
    return arr
  }, [scripts, filtCat, filtCanal, filtPerfil, filtFav, busca])

  function abrirNovo() { setEditTarget(null); setModalOpen(true) }
  function abrirEditar(s) { setEditTarget(s); setModalOpen(true) }

  function handleExcluir(s) {
    if (!confirm(`Excluir "${s.titulo}"?`)) return
    excluir.mutate(s.id)
  }

  function handleSave(body) {
    if (editTarget) editar.mutate({ id: editTarget.id, body })
    else criar.mutate(body)
  }

  function handleSeed() {
    if (!confirm('Isso irá adicionar os scripts padrão da cadência de reativação. Continuar?')) return
    seed.mutate()
  }

  const catSections = useMemo(() => {
    const map = {}
    for (const s of filtrados) {
      if (!map[s.categoria]) map[s.categoria] = []
      map[s.categoria].push(s)
    }
    return map
  }, [filtrados])

  const cfg = selected ? (CAT_COLORS[selected.categoria] || CAT_COLORS['Outro']) : null

  return (
    <div className={styles.panel}>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>📚 Biblioteca de Scripts</h1>
        <div className={styles.topActions}>
          {scripts.length === 0 && !isLoading && (
            <button className="btn btn-secondary" onClick={handleSeed} disabled={seed.isPending}>
              {seed.isPending ? 'Carregando…' : '⬇ Carregar scripts padrão'}
            </button>
          )}
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Script</button>
        </div>
      </div>

      <div className={styles.layout}>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          {/* Filters */}
          <div className={styles.filters}>
            <input
              className={styles.searchInput}
              placeholder="Buscar scripts…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <select className={styles.filterSelect} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
              <option value="">Todas categorias</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className={styles.filterSelect} value={filtCanal} onChange={e => setFiltCanal(e.target.value)}>
              <option value="">Todos canais</option>
              {CANAIS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className={styles.filterSelect} value={filtPerfil} onChange={e => setFiltPerfil(e.target.value)}>
              <option value="">Todos perfis</option>
              {PERFIS.map(p => <option key={p}>{p}</option>)}
            </select>
            <label className={styles.favToggle}>
              <input type="checkbox" checked={filtFav} onChange={e => setFiltFav(e.target.checked)} />
              Apenas favoritos
            </label>
          </div>

          {/* Script list */}
          <div className={styles.list}>
            {isLoading ? (
              <p className={styles.listEmpty}>Carregando…</p>
            ) : filtrados.length === 0 ? (
              <p className={styles.listEmpty}>Nenhum script encontrado.</p>
            ) : (
              Object.entries(catSections).map(([cat, items]) => (
                <div key={cat} className={styles.catGroup}>
                  <div className={styles.catLabel} style={{ color: CAT_COLORS[cat]?.color || '#6b7280' }}>
                    {cat} <span className={styles.catCount}>{items.length}</span>
                  </div>
                  {items.map(s => (
                    <button
                      key={s.id}
                      className={`${styles.listItem} ${selected?.id === s.id ? styles.listItemActive : ''}`}
                      onClick={() => setSelected(s)}
                    >
                      <span className={styles.listItemTitle}>{s.titulo}</span>
                      <div className={styles.listItemMeta}>
                        {s.canal && <span>{s.canal}</span>}
                        {s.dia_toque && <span>Dia {s.dia_toque}</span>}
                        {s.favorito && <span className={styles.star}>★</span>}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Content ── */}
        <main className={styles.content}>
          {!selected ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📄</span>
              <p>Selecione um script para visualizar</p>
              {scripts.length === 0 && !isLoading && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSeed}>
                  ⬇ Carregar scripts padrão
                </button>
              )}
            </div>
          ) : (
            <div className={styles.viewer}>
              {/* Header */}
              <div className={styles.viewerHeader}>
                <div className={styles.viewerTitulo}>{selected.titulo}</div>
                <div className={styles.viewerBadges}>
                  <Badge text={selected.categoria} tipo="cat" />
                  {selected.canal   && <Badge text={selected.canal} />}
                  {selected.perfil  && <Badge text={`Perfil ${selected.perfil}`} />}
                  {selected.dia_toque && <Badge text={`Dia ${selected.dia_toque}`} />}
                </div>
              </div>

              {/* Content box */}
              <div
                className={styles.conteudoBox}
                style={{ borderLeftColor: cfg?.color }}
              >
                {selected.conteudo}
              </div>

              {/* Tags */}
              {selected.tags && (
                <div className={styles.tags}>
                  {selected.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} className={styles.tag}>{t}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className={styles.viewerActions}>
                <CopyButton text={selected.conteudo} />
                <button
                  className={`btn btn-secondary ${selected.favorito ? styles.favActive : ''}`}
                  onClick={() => favMut.mutate(selected.id)}
                  disabled={favMut.isPending}
                >
                  {selected.favorito ? '★ Favoritado' : '☆ Favoritar'}
                </button>
                <button className="btn btn-secondary" onClick={() => abrirEditar(selected)}>
                  ✏ Editar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleExcluir(selected)}
                  disabled={excluir.isPending}
                >
                  🗑 Excluir
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ScriptModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          saving={criar.isPending || editar.isPending}
        />
      )}
    </div>
  )
}
