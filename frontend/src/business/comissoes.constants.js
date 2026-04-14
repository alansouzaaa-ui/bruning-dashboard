/**
 * Tabelas e constantes de regras de comissão Bruning.
 * Fonte única de verdade para cálculos de comissão no frontend.
 * Alterações nas regras de negócio devem ser feitas APENAS aqui.
 */

/** Tabela de % comissão MRR por faixa de valor vendido */
export const MRR_TABLE = [
  [1499.99, 0.15 ], [1999.99, 0.20 ], [2499.99, 0.25 ],
  [2999.99, 0.30 ], [3499.99, 0.325], [3999.99, 0.35 ],
  [4499.99, 0.375], [4999.99, 0.40 ], [5499.99, 0.425],
  [5999.99, 0.45 ], [6499.99, 0.475], [6999.99, 0.50 ],
  [7499.99, 0.525], [Infinity, 0.55 ],
]

/** Tabela de % desconto de churn sobre base MRR */
export const CHURN_TABLE = [
  [0,        0.000], [250,     0.025], [350,     0.035],
  [500,      0.045], [750,     0.055], [1000,    0.065],
  [Infinity, 0.075],
]

/**
 * Bônus sobre base MRR por quantidade de contratos anuais.
 * Índice = nº de contratos anuais (máx 5).
 */
export const ANNUAL_TABLE = [0, 0.01, 0.02, 0.03, 0.04, 0.05]

/** Tabela de % comissão Adesão por faixa de valor vendido */
export const ADES_TABLE = [
  [2249.99,  0.090], [2999.99,  0.095], [3749.99,  0.090],
  [4499.99,  0.095], [5249.99,  0.100], [5999.99,  0.105],
  [6749.99,  0.110], [7499.99,  0.115], [8249.99,  0.120],
  [8999.99,  0.125], [9749.99,  0.130], [10499.99, 0.135],
  [11249.99, 0.140], [Infinity, 0.145],
]

/** Meta padrão quando nenhuma meta mensal está configurada */
export const META_PADRAO = 5000

/** Metas fixas do período de rampagem (antes da configuração dinâmica) */
export const METAS_FIXAS = {
  '2024-11': 2000,
  '2024-12': 1500,
  '2025-01': 3000,
  '2025-02': 3500,
  '2025-03': 4000,
}

/** Percentual mínimo de atingimento para receber bônus de meta */
export const META_BONUS_THRESHOLD = 1.0

/** Valor fixo do bônus ao atingir 100% da meta MRR */
export const META_BONUS_VALOR = 250
