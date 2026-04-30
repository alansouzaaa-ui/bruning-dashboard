import axios from 'axios'

const BASE    = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || ''

if (!API_KEY && import.meta.env.PROD) {
  console.error('[api.js] VITE_API_KEY não está configurado. Defina a variável de ambiente no Vercel.')
}

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${API_KEY}` },
  timeout: 20000,
})

// ── Vendas ──────────────────────────────────────────────
export const getVendas = (params = {}) =>
  api.get('/vendas/', { params }).then(r => r.data)

export const criarVenda = (body) =>
  api.post('/vendas/', body).then(r => r.data)

export const editarVenda = (id, body) =>
  api.put(`/vendas/${id}`, body).then(r => r.data)

export const excluirVenda = (id) =>
  api.delete(`/vendas/${id}`)

export const getKPIs = (mes) =>
  api.get('/vendas/kpis', { params: mes ? { mes } : {} }).then(r => r.data)

export const getComparativo = () =>
  api.get('/vendas/comparativo').then(r => r.data)

export const getMeses = () =>
  api.get('/vendas/meses').then(r => r.data)

// ── Comissões ────────────────────────────────────────────
export const getComissoes = () =>
  api.get('/comissoes/').then(r => r.data)

export const criarComissao = (body) =>
  api.post('/comissoes/', body).then(r => r.data)

export const excluirComissao = (id) =>
  api.delete(`/comissoes/${id}`)

// ── Configurações / Metas ────────────────────────────────
export const getMetas = () =>
  api.get('/configs/metas').then(r => r.data)

export const updateMetas = (body) =>
  api.put('/configs/metas', body).then(r => r.data)

// ── Avaliação Trimestral ─────────────────────────────────
export const getAvaliacaoAtual = () =>
  api.get('/trimestral/atual').then(r => r.data)

export const getHistoricoTrimestral = () =>
  api.get('/trimestral/historico').then(r => r.data)

export const getPerformanceGeral = () =>
  api.get('/trimestral/performance-geral').then(r => r.data)

export const salvarMetaTrimestral = (body) =>
  api.put('/trimestral/meta', body).then(r => r.data)

export const getMetasMensais = () =>
  api.get('/trimestral/metas-mensais').then(r => r.data)

export const salvarMetasMensais = (metas) =>
  api.put('/trimestral/metas-mensais', { metas }).then(r => r.data)

export const deletarMetaMensal = (mes) =>
  api.delete(`/trimestral/metas-mensais/${mes}`)

// ── CRM / Nectar ─────────────────────────────────────────
export const getCRMStatus = () =>
  api.get('/crm/status').then(r => r.data)

export const getCRMFunil = (mes) =>
  api.get('/crm/funil', { params: mes ? { mes } : {} }).then(r => r.data)

export const getCRMKpis = (mes) =>
  api.get('/crm/kpis', { params: mes ? { mes } : {} }).then(r => r.data)

// ── Oportunidades ────────────────────────────────────────
export const getOportunidade = (mes) =>
  api.get(`/oportunidades/${mes}`).then(r => r.data)

export const upsertOportunidade = (mes, body) =>
  api.put(`/oportunidades/${mes}`, body).then(r => r.data)

// ── BrasilAPI ────────────────────────────────────────────
export const buscarCNPJ = (cnpj) => {
  const limpo = cnpj.replace(/\D/g, '')
  return axios.get(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`).then(r => r.data)
}
