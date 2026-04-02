import axios from 'axios'

const BASE    = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || 'bruning-dashboard-2026'

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${API_KEY}` },
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

// ── BrasilAPI ────────────────────────────────────────────
export const buscarCNPJ = (cnpj) => {
  const limpo = cnpj.replace(/\D/g, '')
  return axios.get(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`).then(r => r.data)
}
