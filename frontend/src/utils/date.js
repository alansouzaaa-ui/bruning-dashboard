/**
 * Retorna o identificador do mês atual no formato "YYYY-MM".
 */
export function mesAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

/** Total de dias úteis (seg–sex) em um mês. mes = 1-indexed */
export function diasUteisNoMes(ano, mes) {
  const ultimo = new Date(ano, mes, 0).getDate()
  let uteis = 0
  for (let d = 1; d <= ultimo; d++) {
    const dow = new Date(ano, mes - 1, d).getDay()
    if (dow !== 0 && dow !== 6) uteis++
  }
  return uteis
}

/**
 * Dias úteis decorridos desde o 1º do mês até hoje (inclusive).
 * Se o mês for passado, retorna o total de dias úteis do mês.
 */
export function diasUteisDecorridos(ano, mes) {
  const hoje  = new Date()
  const aHoje = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes
  const ate   = aHoje ? hoje.getDate() : new Date(ano, mes, 0).getDate()
  let uteis = 0
  for (let d = 1; d <= ate; d++) {
    const dow = new Date(ano, mes - 1, d).getDay()
    if (dow !== 0 && dow !== 6) uteis++
  }
  return uteis
}

/**
 * Conta dias úteis (segunda a sexta) do dia de hoje até o fim do mês corrente.
 * O dia de hoje é incluído na contagem.
 */
export function diasUteisRestantes() {
  const hoje   = new Date()
  const ano    = hoje.getFullYear()
  const mes    = hoje.getMonth()
  const ultimo = new Date(ano, mes + 1, 0).getDate()
  let uteis = 0
  for (let d = hoje.getDate(); d <= ultimo; d++) {
    const diaSemana = new Date(ano, mes, d).getDay()
    if (diaSemana !== 0 && diaSemana !== 6) uteis++
  }
  return uteis
}
