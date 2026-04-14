import {
  MRR_TABLE, CHURN_TABLE, ANNUAL_TABLE, ADES_TABLE,
  META_BONUS_THRESHOLD, META_BONUS_VALOR,
} from './comissoes.constants'

/**
 * Retorna o percentual aplicável da tabela para o valor dado.
 * A tabela é um array de [limite, pct] em ordem crescente de limite.
 *
 * @param {Array<[number, number]>} table
 * @param {number} valor
 * @returns {number}
 */
export function getPct(table, valor) {
  for (const [limite, pct] of table) {
    if (valor <= limite) return pct
  }
  return table[table.length - 1][1]
}

/**
 * Calcula a comissão completa conforme regras Bruning.
 *
 * @param {{ mrr: number, ades: number, churn3m: number, anuais: number, meta: number }}
 * @returns {{
 *   comis_mrr: number, comis_ades: number, total_pago: number,
 *   mrrPct: number, adesPct: number, churnPct: number,
 *   annualBon: number, metaBonus: number, atingimento: number
 * }}
 */
export function calcularComissao({ mrr, ades, churn3m, anuais, meta }) {
  const round2 = (n) => Math.round(n * 100) / 100

  const mrrPct    = getPct(MRR_TABLE, mrr)
  const mrrBase   = mrr * mrrPct

  const churnPct  = getPct(CHURN_TABLE, churn3m)
  const churnDesc = churn3m * churnPct

  const annualIdx = Math.min(anuais, ANNUAL_TABLE.length - 1)
  const annualBon = mrrBase * ANNUAL_TABLE[annualIdx]

  const atingimento = meta > 0 ? mrr / meta : 0
  const metaBonus   = atingimento >= META_BONUS_THRESHOLD ? META_BONUS_VALOR : 0

  const comis_mrr  = mrrBase - churnDesc + annualBon + metaBonus

  const adesPct    = getPct(ADES_TABLE, ades)
  const comis_ades = ades * adesPct

  return {
    comis_mrr:  round2(comis_mrr),
    comis_ades: round2(comis_ades),
    total_pago: round2(comis_mrr + comis_ades),
    mrrPct,
    adesPct,
    churnPct,
    annualBon:  round2(annualBon),
    metaBonus,
    atingimento,
  }
}
