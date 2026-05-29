/**
 * Utilitários de formatação — fonte única de verdade.
 * Importe daqui em vez de redefinir em cada componente.
 */

export const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtPct = (v, decimals = 1) =>
  `${Number(v).toFixed(decimals)}%`

export const fmtMes = (mesStr) => {
  if (!mesStr) return ''
  const [y, m] = mesStr.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m, 10) - 1]}/${y.slice(2)}`
}

/**
 * Gera e dispara o download de um CSV a partir de um array de vendas.
 * O BOM ﻿ garante que o Excel abre em UTF-8 corretamente.
 */
export function exportarCSV(vendas, mes = '') {
  const headers = [
    'Data', 'Cód', 'Cliente', 'CNPJ', 'Segmento', 'Plano', 'Contrato',
    'MRR', 'Adesão', 'Churn MRR', 'Status', 'Pagamento', 'Zendesk', 'Origem', 'Observações',
  ]

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const rows = vendas.map((v) =>
    [
      v.data,
      v.cod,
      v.cliente,
      v.cnpj,
      v.segmento,
      v.plano,
      v.contrato,
      v.mrr,
      v.adesao,
      v.churn_mrr,
      v.status,
      (v.payment_status || 'pending') === 'paid' ? 'Pago' : 'Aguardando',
      v.zendesk || '',
      v.origem,
      v.obs,
    ]
      .map(esc)
      .join(',')
  )

  const csv = '﻿' + [headers.map(esc).join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `vendas${mes ? `-${mes}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
