import { describe, test, expect } from 'vitest'
import { getPct, calcularComissao } from './comissoes.calc'
import { MRR_TABLE, ADES_TABLE } from './comissoes.constants'

// ── getPct ────────────────────────────────────────────────────────────────────

describe('getPct', () => {
  test('retorna primeiro percentual para valores abaixo do primeiro limite', () => {
    expect(getPct(MRR_TABLE, 1000)).toBe(0.15)
  })

  test('retorna percentual correto para valor no limite exato', () => {
    expect(getPct(MRR_TABLE, 1499.99)).toBe(0.15)
  })

  test('avança para próximo tier quando valor supera o limite', () => {
    expect(getPct(MRR_TABLE, 1500)).toBe(0.20)
  })

  test('retorna último percentual para valores acima de todos os limites', () => {
    expect(getPct(MRR_TABLE, 999_999)).toBe(0.55)
  })

  test('funciona corretamente com tabela de adesão', () => {
    expect(getPct(ADES_TABLE, 5000)).toBe(0.10)
    // 7499.99 está no limite exato → 11.5%; 7500 já passa para a faixa seguinte → 12%
    expect(getPct(ADES_TABLE, 7499.99)).toBe(0.115)
    expect(getPct(ADES_TABLE, 7500)).toBe(0.12)
  })
})

// ── calcularComissao ──────────────────────────────────────────────────────────

describe('calcularComissao — meta e bônus', () => {
  test('meta 100% atingida adiciona R$250 de bônus', () => {
    const { metaBonus, comis_mrr } = calcularComissao({
      mrr: 5000, ades: 0, churn3m: 0, anuais: 0, meta: 5000,
    })
    expect(metaBonus).toBe(250)
    expect(comis_mrr).toBe(5000 * 0.425 + 250)
  })

  test('meta não atingida (99%) não gera bônus', () => {
    const { metaBonus } = calcularComissao({
      mrr: 4990, ades: 0, churn3m: 0, anuais: 0, meta: 5000,
    })
    expect(metaBonus).toBe(0)
  })

  test('meta acima de 100% também gera bônus', () => {
    const { metaBonus } = calcularComissao({
      mrr: 6000, ades: 0, churn3m: 0, anuais: 0, meta: 5000,
    })
    expect(metaBonus).toBe(250)
  })
})

describe('calcularComissao — churn', () => {
  test('sem churn não há desconto', () => {
    // mrr=2999 está na faixa ≤2999.99 → 30%
    const { comis_mrr } = calcularComissao({
      mrr: 2999, ades: 0, churn3m: 0, anuais: 0, meta: 99999,
    })
    expect(comis_mrr).toBe(Math.round(2999 * 0.30 * 100) / 100)
  })

  test('churn acima de R$1000 aplica 7.5% de desconto', () => {
    const { comis_mrr } = calcularComissao({
      mrr: 5000, ades: 0, churn3m: 1200, anuais: 0, meta: 5000,
    })
    const base = 5000 * 0.425
    const desc = 1200 * 0.075
    expect(comis_mrr).toBe(base - desc + 250)
  })

  test('churn R$250 aplica 2.5% de desconto', () => {
    const { churnPct } = calcularComissao({
      mrr: 3000, ades: 0, churn3m: 250, anuais: 0, meta: 99999,
    })
    expect(churnPct).toBe(0.025)
  })
})

describe('calcularComissao — contratos anuais', () => {
  test('0 contratos anuais: sem bônus', () => {
    const { annualBon } = calcularComissao({
      mrr: 3000, ades: 0, churn3m: 0, anuais: 0, meta: 99999,
    })
    expect(annualBon).toBe(0)
  })

  test('3 contratos anuais aplica 3% sobre a base MRR', () => {
    // mrr=2999 → faixa 30%; base = 2999 * 0.30; annualBon = base * 0.03
    const { annualBon } = calcularComissao({
      mrr: 2999, ades: 0, churn3m: 0, anuais: 3, meta: 99999,
    })
    const base = 2999 * 0.30
    expect(annualBon).toBeCloseTo(base * 0.03)
  })

  test('mais de 5 anuais é limitado ao índice 5 (5%)', () => {
    const { annualBon: bon5 } = calcularComissao({
      mrr: 3000, ades: 0, churn3m: 0, anuais: 5, meta: 99999,
    })
    const { annualBon: bon10 } = calcularComissao({
      mrr: 3000, ades: 0, churn3m: 0, anuais: 10, meta: 99999,
    })
    expect(bon5).toBe(bon10)
  })
})

describe('calcularComissao — adesão', () => {
  test('comissão de adesão calculada pela tabela correta', () => {
    const { comis_ades, adesPct } = calcularComissao({
      mrr: 0, ades: 5000, churn3m: 0, anuais: 0, meta: 99999,
    })
    expect(adesPct).toBe(0.10)
    expect(comis_ades).toBe(5000 * 0.10)
  })
})

describe('calcularComissao — total', () => {
  test('total_pago é sempre a soma de comis_mrr e comis_ades', () => {
    const result = calcularComissao({
      mrr: 5000, ades: 5000, churn3m: 0, anuais: 2, meta: 5000,
    })
    expect(result.total_pago).toBeCloseTo(result.comis_mrr + result.comis_ades)
  })

  test('arredonda resultados para 2 casas decimais', () => {
    const { comis_mrr } = calcularComissao({
      mrr: 1234.56, ades: 0, churn3m: 0, anuais: 0, meta: 99999,
    })
    expect(comis_mrr).toBe(Math.round(1234.56 * 0.15 * 100) / 100)
  })
})
