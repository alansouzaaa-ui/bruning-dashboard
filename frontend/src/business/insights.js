/**
 * dashboardInsightSpecialist — BI analytics engine.
 *
 * Recebe os dados já carregados pelo dashboard e retorna insights
 * ordenados por prioridade, prontos para renderização.
 *
 * Por que aqui e não no backend: todos os dados já estão em memória
 * no frontend via React Query, então o custo de rede é zero e os
 * insights aparecem instantaneamente junto com os KPIs.
 */

const fmt = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const fmtPct = (v, d = 1) => `${Number(v).toFixed(d)}%`

const PRIORITY_ORDER = { critico: 0, alto: 1, medio: 2, info: 3 }

/**
 * @param {object} data
 * @param {object} data.kpis           – KPIOut do mês atual
 * @param {object} [data.kpisPrev]     – KPIOut do mês anterior (nullable)
 * @param {Array}  [data.comparativo]  – Últimos 6 meses [{mes, label, mrr, adesao, vendas}]
 * @param {object} data.metas          – {meta_mrr, meta_ades}
 * @param {object} [data.trimestral]   – AvaliacaoOut do trimestre atual (nullable)
 * @param {string} [data.mes]          – Filtro de mês ativo (nullable = todos)
 * @returns {Array} Insights ordenados por prioridade
 */
export function dashboardInsightSpecialist({ kpis, kpisPrev, comparativo = [], metas, trimestral, mes }) {
  if (!kpis || !metas) return []

  const insights = []

  const mrr       = Number(kpis.total_mrr)    || 0
  const adesao    = Number(kpis.total_adesao)  || 0
  const ativos    = Number(kpis.ativos)        || 0
  const anuais    = Number(kpis.anuais)        || 0
  const mensais   = Number(kpis.mensais)       || 0
  const ticket    = Number(kpis.ticket_medio)  || 0
  const churns    = Number(kpis.churns)        || 0
  const churnMRR  = Number(kpis.churn_mrr)     || 0
  const metaMRR   = Number(metas.meta_mrr)     || 0

  const prevMRR    = kpisPrev ? Number(kpisPrev.total_mrr)   || 0 : 0
  const prevAtivos = kpisPrev ? Number(kpisPrev.ativos)      || 0 : 0
  const prevTicket = kpisPrev ? Number(kpisPrev.ticket_medio)|| 0 : 0

  // ── 1. Atingimento de meta MRR ─────────────────────────────────────────────
  if (metaMRR > 0 && mrr > 0) {
    const ating = (mrr / metaMRR) * 100
    const gap   = metaMRR - mrr

    if (ating < 70) {
      insights.push({
        id: 'meta-critico',
        categoria: 'risco',
        prioridade: 'critico',
        titulo: `Meta em zona crítica — ${fmtPct(ating)} realizado`,
        descricao: `MRR atual de ${fmt(mrr)} está ${fmtPct(100 - ating)} abaixo da meta de ${fmt(metaMRR)}. A distância de ${fmt(gap)} representa ${fmtPct(gap / metaMRR * 100)} da meta não realizada.`,
        impacto: `Avaliação trimestral entra na faixa "Atenção" (<70%), ativando plano de ação urgente (30 dias).`,
        recomendacao: `Identificar oportunidades em pipeline CRM, acelerar fechamentos e rever proposta de valor com clientes em Trial.`,
      })
    } else if (ating < 85) {
      insights.push({
        id: 'meta-atencao',
        categoria: 'risco',
        prioridade: 'alto',
        titulo: `Meta ${fmtPct(ating)} realizada — foco necessário`,
        descricao: `Faltam ${fmt(gap)} de MRR para atingir a meta de ${fmt(metaMRR)}.`,
        impacto: `Atingimento atual enquadra na faixa "Satisfatório" (75–85%), exigindo PDI trimestral e plano de ação.`,
        recomendacao: `Priorizar contratos anuais (maior ticket e bônus comissional) e reativar leads quentes no funil CRM.`,
      })
    } else if (ating >= 95 && ating < 100) {
      insights.push({
        id: 'meta-bonus-proximo',
        categoria: 'oportunidade',
        prioridade: 'alto',
        titulo: `A ${fmt(gap)} do bônus de meta`,
        descricao: `Com ${fmtPct(ating)} da meta realizado, faltam apenas ${fmt(gap)} para acionar o bônus de R$ 250 e elevar a faixa comissional.`,
        impacto: `R$ 250 de bônus imediato + comissão mais alta sobre todo o MRR do mês.`,
        recomendacao: `Qualquer fechamento acima de ${fmt(gap)} garante o bônus. Priorize conversão de Trial ou upgrade de plano esta semana.`,
      })
    } else if (ating >= 100) {
      insights.push({
        id: 'meta-superada',
        categoria: 'performance',
        prioridade: 'info',
        titulo: `Meta superada em ${fmtPct(ating - 100)} — superávit de ${fmt(mrr - metaMRR)}`,
        descricao: `Meta de ${fmt(metaMRR)} superada. Cada real adicional opera na faixa comissional máxima.`,
        impacto: `Superávit de ${fmt(mrr - metaMRR)} contribui para avaliação trimestral "Excelente" (95%+).`,
        recomendacao: `Documentar estratégias deste ciclo para replicar no próximo trimestre.`,
      })
    }
  }

  // ── 2. Churn — taxa e impacto no MRR ──────────────────────────────────────
  if (ativos > 0) {
    const churnMRRRatio = mrr > 0 ? (churnMRR / mrr) * 100 : 0
    const baseTotal     = ativos + churns
    const churnRate     = baseTotal > 0 ? (churns / baseTotal) * 100 : 0

    if (churnMRRRatio > 10) {
      insights.push({
        id: 'churn-critico',
        categoria: 'anomalia',
        prioridade: 'critico',
        titulo: `Churn absorvendo ${fmtPct(churnMRRRatio)} do MRR — alarme crítico`,
        descricao: `${churns} cancelamento${churns > 1 ? 's' : ''} gerando ${fmt(churnMRR)} perdidos. Taxa de churn na base: ${fmtPct(churnRate)}.`,
        impacto: `Para cada cliente novo adquirido, ${fmtPct(churnMRRRatio)} da receita é anulada pelo churn. Crescimento líquido comprometido.`,
        recomendacao: `Auditoria imediata dos cancelados: identificar padrão por segmento, plano e tempo de casa. Implementar processo de resgate ativo.`,
      })
    } else if (churnMRRRatio > 5) {
      insights.push({
        id: 'churn-alto',
        categoria: 'risco',
        prioridade: 'alto',
        titulo: `Churn MRR elevado: ${fmtPct(churnMRRRatio)} da base ativa`,
        descricao: `${fmt(churnMRR)} perdidos por cancelamentos. Taxa de churn na base: ${fmtPct(churnRate)}.`,
        impacto: `Mantendo este ritmo, a expansão líquida de MRR cai ${fmtPct(churnMRRRatio)} a cada ciclo.`,
        recomendacao: `Criar early-warning para clientes em risco: Trial longo, baixo engajamento, tickets de suporte recorrentes.`,
      })
    } else if (churns === 0 && ativos >= 5) {
      insights.push({
        id: 'churn-zero',
        categoria: 'performance',
        prioridade: 'info',
        titulo: `Zero churns — base de ${ativos} clientes 100% retida`,
        descricao: `Nenhum cancelamento com ${ativos} clientes ativos. Retenção máxima no período.`,
        impacto: `Todo o MRR novo é expansão líquida pura. Margem de crescimento maximizada.`,
        recomendacao: `Investigar o que está gerando esta satisfação. Documentar como case de retenção.`,
      })
    }
  }

  // ── 3. Crescimento líquido de MRR mês a mês ───────────────────────────────
  if (prevMRR > 0 && mrr > 0) {
    const netGrowth    = mrr - prevMRR
    const netGrowthPct = (netGrowth / prevMRR) * 100

    if (netGrowth < 0 && churnMRR > 0) {
      insights.push({
        id: 'net-negativo',
        categoria: 'anomalia',
        prioridade: 'alto',
        titulo: `Crescimento líquido negativo: ${fmt(netGrowth)} vs mês anterior`,
        descricao: `Apesar de novas vendas, o churn de ${fmt(churnMRR)} anulou o crescimento. Base encolheu ${fmtPct(Math.abs(netGrowthPct))}.`,
        impacto: `Tendência por 2+ meses cria risco estrutural na base de MRR e compromete metas trimestrais.`,
        recomendacao: `Prioridade máxima em retenção. Um cliente retido custa menos do que um novo adquirido (CAC + ramp).`,
      })
    } else if (netGrowth > 0) {
      const novosClientes = ativos - prevAtivos
      if (novosClientes > 0 && netGrowthPct > 5) {
        insights.push({
          id: 'net-positivo',
          categoria: 'performance',
          prioridade: 'info',
          titulo: `Expansão líquida de ${fmt(netGrowth)} (+${fmtPct(netGrowthPct)}) vs mês anterior`,
          descricao: `MRR cresceu ${fmt(netGrowth)} mesmo após descontar churn. ${novosClientes} novo${novosClientes > 1 ? 's' : ''} cliente${novosClientes > 1 ? 's' : ''} adicionado${novosClientes > 1 ? 's' : ''}.`,
          impacto: `Projeção anualizada deste ritmo: +${fmt(netGrowth * 12)} de MRR adicional por ano.`,
          recomendacao: `Manter e escalar os canais de aquisição que trouxeram estes novos clientes.`,
        })
      }
    }
  }

  // ── 4. Tendência de 3 meses consecutivos no comparativo ───────────────────
  if (comparativo.length >= 3) {
    const sorted  = [...comparativo].sort((a, b) => (a.mes || '').localeCompare(b.mes || ''))
    const last3   = sorted.slice(-3).map(m => Number(m.mrr) || 0)
    const isUp    = last3[2] > last3[1] && last3[1] > last3[0]
    const isDown  = last3[2] < last3[1] && last3[1] < last3[0]
    const delta3m = last3[0] > 0 ? ((last3[2] - last3[0]) / last3[0]) * 100 : 0

    if (isDown && !insights.find(i => i.id === 'net-negativo')) {
      insights.push({
        id: 'mrr-tendencia-queda',
        categoria: 'risco',
        prioridade: 'alto',
        titulo: `MRR em queda por 3 meses consecutivos (${fmtPct(delta3m)})`,
        descricao: `Tendência estrutural de contração identificada nos últimos 3 meses do comparativo.`,
        impacto: `Mantida por mais um trimestre, risco de entrar na faixa "Atenção" (<70%) na avaliação.`,
        recomendacao: `Revisão imediata de causas de churn e estratégia de aquisição. Analisar segmentos com maior taxa de cancelamento.`,
      })
    } else if (isUp) {
      insights.push({
        id: 'mrr-tendencia-crescimento',
        categoria: 'performance',
        prioridade: 'info',
        titulo: `MRR crescendo por 3 meses consecutivos (+${fmtPct(delta3m)})`,
        descricao: `Crescimento consistente nos últimos 3 meses do histórico, acumulando ${fmtPct(delta3m)} de expansão.`,
        impacto: `Projeção de MRR nos próximos 3 meses (ritmo atual): ${fmt(last3[2] * Math.pow(1 + delta3m / 100 / 3, 3))}.`,
        recomendacao: `Documentar os canais e ações que impulsionam este crescimento para replicar e escalar.`,
      })
    }
  }

  // ── 5. Mix anual vs mensal — oportunidade de receita ──────────────────────
  if (ativos >= 3) {
    const anualPct = (anuais / ativos) * 100

    if (anualPct < 15) {
      // ANNUAL_TABLE tem cap em 5; se já tem >= 5 anuais, bônus está saturado
      const bonusAtual  = Math.min(anuais, 5)
      const bonusAlvo   = Math.min(anuais + Math.ceil(mensais * 0.2), 5)
      const ganhoBonus  = (bonusAlvo - bonusAtual) * 0.01
      const bonusSaturo = anuais >= 5

      const impactoTexto = bonusSaturo
        ? `Bônus comissional já está no teto (5+ contratos anuais). Conversão de mensais para anual reduz risco de churn: contratos anuais têm ~80% menos cancelamentos no curto prazo.`
        : `Converter 20% dos mensais para anual adicionaria +${fmtPct(ganhoBonus * 100)} de bônus comissional sobre o MRR total (${fmt(mrr * ganhoBonus)} adicionais/mês).`

      insights.push({
        id: 'mix-anual-baixo',
        categoria: 'oportunidade',
        prioridade: 'medio',
        titulo: `Apenas ${fmtPct(anualPct)} da base em contratos anuais`,
        descricao: `${anuais} de ${ativos} clientes têm contrato anual. Os ${mensais} mensais representam potencial de upgrade e maior risco de churn.`,
        impacto: impactoTexto,
        recomendacao: `Campanha de migração anual com incentivo (desconto no plano, onboarding prioritário). Foque nos mensais de maior MRR individual.`,
      })
    } else if (anualPct >= 30) {
      insights.push({
        id: 'mix-anual-saudavel',
        categoria: 'correlacao',
        prioridade: 'info',
        titulo: `Mix anual saudável: ${fmtPct(anualPct)} da base com contratos longos`,
        descricao: `${anuais} contratos anuais garantem previsibilidade de receita e bônus comissional ativo.`,
        impacto: `${fmtPct(anualPct)} da base tem menor probabilidade de churn no curto prazo.`,
        recomendacao: `Monitorar datas de renovação dos contratos anuais existentes para evitar cancelamento por surpresa.`,
      })
    }
  }

  // ── 6. Ticket médio: evolução mês a mês ───────────────────────────────────
  if (prevTicket > 0 && ticket > 0) {
    const ticketDelta = ((ticket - prevTicket) / prevTicket) * 100

    if (ticketDelta < -10) {
      insights.push({
        id: 'ticket-queda',
        categoria: 'anomalia',
        prioridade: 'medio',
        titulo: `Ticket médio caiu ${fmtPct(Math.abs(ticketDelta))} vs mês anterior`,
        descricao: `De ${fmt(prevTicket)} para ${fmt(ticket)} por cliente. Pode indicar mix de novos clientes em planos menores ou migração de existentes.`,
        impacto: `Para manter o mesmo MRR com ticket menor, serão necessários mais clientes proporcionalmente.`,
        recomendacao: `Analisar quais clientes entraram e saíram e se há migração para planos menores. Ajustar proposta comercial se necessário.`,
      })
    } else if (ticketDelta > 10) {
      insights.push({
        id: 'ticket-crescimento',
        categoria: 'performance',
        prioridade: 'info',
        titulo: `Ticket médio cresceu ${fmtPct(ticketDelta)} vs mês anterior`,
        descricao: `De ${fmt(prevTicket)} para ${fmt(ticket)}. Mix evoluiu para maior valor médio por cliente.`,
        impacto: `Crescimento de ticket reduz a necessidade de volume para atingir a meta. Eficiência comercial melhorada.`,
        recomendacao: `Identificar e replicar a estratégia de upsell que gerou este aumento de ticket.`,
      })
    }
  }

  // ── 7. Proporção adesão / MRR — ritmo de entrada de novos clientes ────────
  if (adesao > 0 && ativos >= 5 && mrr > 0) {
    const adesaoRatio = (adesao / mrr) * 100

    if (adesaoRatio < 20) {
      insights.push({
        id: 'adesao-baixa',
        categoria: 'correlacao',
        prioridade: 'medio',
        titulo: `Adesão em ${fmtPct(adesaoRatio)} do MRR — ritmo de entrada abaixo do ideal`,
        descricao: `${fmt(adesao)} em adesão vs ${fmt(mrr)} de MRR ativo. Poucos novos clientes ativados no período.`,
        impacto: `Alta dependência da base existente. Crescimento de MRR limitado à retenção e expansão dos clientes atuais.`,
        recomendacao: `Revisar geração de leads e taxa de conversão no funil CRM. Verificar Trial conversions pendentes.`,
      })
    } else if (adesaoRatio > 60) {
      insights.push({
        id: 'adesao-alta',
        categoria: 'performance',
        prioridade: 'info',
        titulo: `Alto volume de novos clientes: adesão em ${fmtPct(adesaoRatio)} do MRR`,
        descricao: `${fmt(adesao)} em adesão indica forte ritmo de onboarding de novos clientes.`,
        impacto: `MRR recorrente tende a crescer nas próximas semanas à medida que os novos contratos consolidam.`,
        recomendacao: `Garantir qualidade no onboarding para maximizar conversão Trial → Ativo e minimizar churn precoce.`,
      })
    }
  }

  // ── 8. Avaliação trimestral — nível atual ─────────────────────────────────
  if (trimestral && trimestral.atingimento_geral != null) {
    const ating = Number(trimestral.atingimento_geral)
    const nivel = trimestral.nivel?.codigo

    if (nivel === 'repescagem' || nivel === 'atencao') {
      insights.push({
        id: 'trimestral-risco',
        categoria: 'risco',
        prioridade: nivel === 'atencao' ? 'critico' : 'alto',
        titulo: `Avaliação trimestral: "${trimestral.nivel?.label}" (${fmtPct(ating)})`,
        descricao: `${trimestral.nivel?.acao || 'Plano de ação requerido.'} Trimestre atual: ${trimestral.label || ''}.`,
        impacto: `Prazo de ação: ${trimestral.nivel?.prazo || 'imediato'}. ${trimestral.nivel?.consequencia || ''}`,
        recomendacao: `${trimestral.nivel?.meta_plano || 'Definir metas e ações corretivas com gestão com urgência.'}`,
      })
    }
  }

  // Ordenar por prioridade
  insights.sort((a, b) => (PRIORITY_ORDER[a.prioridade] ?? 9) - (PRIORITY_ORDER[b.prioridade] ?? 9))

  return insights
}
