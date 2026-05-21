import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOportunidade, upsertOportunidade } from '../api'
import styles from './SalesOpportunityTracker.module.css'

// ── Helpers ────────────────────────────────────────────────────────────────
function mesAtualStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function labelMes(mes) {
  if (!mes) return ''
  const [y, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m, 10) - 1]}/${y.slice(2)}`
}

function calcTaxa(criadas, ganhas) {
  if (!criadas || criadas === 0) return 0
  return Math.min((ganhas / criadas) * 100, 100)
}

// ── Sales Insights Engine ──────────────────────────────────────────────────
function gerarInsights(criadas, ganhas, perdidas) {
  const insights = []
  if (criadas === 0) return insights

  const taxa       = calcTaxa(criadas, ganhas)
  const lossRate   = (perdidas / criadas) * 100
  const emAberto   = Math.max(criadas - ganhas - perdidas, 0)
  const abertoPct  = (emAberto / criadas) * 100

  // 1. Diagnóstico da conversão
  if (taxa < 15) {
    insights.push({
      id: 'conv-critica',
      tipo: 'critico',
      titulo: 'Conversão crítica',
      desc: `${taxa.toFixed(1)}% de conversão — menos de 1 em cada 7 oportunidades vira cliente. Muito abaixo do benchmark de mercado (25–35%).`,
      rec: 'Revisão urgente da abordagem comercial, proposta de valor e processo de follow-up. Investigar em qual etapa do funil as oportunidades estão sendo perdidas.',
    })
  } else if (taxa < 25) {
    insights.push({
      id: 'conv-baixa',
      tipo: 'atencao',
      titulo: 'Conversão abaixo do ideal',
      desc: `${taxa.toFixed(1)}% de conversão. Há perda significativa de oportunidades qualificadas antes do fechamento.`,
      rec: 'Fortalecer o processo de follow-up e personalizar propostas. Mapear objeções mais frequentes e criar respostas estruturadas.',
    })
  } else if (taxa < 40) {
    insights.push({
      id: 'conv-mediana',
      tipo: 'neutro',
      titulo: 'Conversão mediana',
      desc: `${taxa.toFixed(1)}% de conversão — dentro da faixa aceitável, com espaço claro de melhoria para atingir benchmarks de alto desempenho (40%+).`,
      rec: 'Identificar os 20% das oportunidades que mais contribuem para conversão e replicar o padrão de abordagem.',
    })
  } else {
    insights.push({
      id: 'conv-saudavel',
      tipo: 'bom',
      titulo: 'Conversão saudável',
      desc: `${taxa.toFixed(1)}% de conversão — acima do benchmark de mercado. Mais de ${Math.round(taxa)}% das oportunidades abertas se tornam clientes.`,
      rec: 'Documentar o processo que está funcionando. Escalar volume de prospecção mantendo este índice de conversão.',
    })
  }

  // 2. Diagnóstico de perdas
  if (perdidas > 0) {
    if (lossRate > 60) {
      insights.push({
        id: 'perdas-altas',
        tipo: 'critico',
        titulo: `${lossRate.toFixed(0)}% das oportunidades perdidas`,
        desc: `${perdidas} oportunidades perdidas de ${criadas} criadas. Taxa de perda muito elevada — possível desalinhamento entre qualidade do lead e proposta.`,
        rec: 'Analisar o perfil das oportunidades perdidas: segmento, objeção principal, etapa de perda. Revisar critérios de qualificação no topo do funil.',
      })
    } else if (lossRate > 35) {
      insights.push({
        id: 'perdas-moderadas',
        tipo: 'atencao',
        titulo: `Volume de perdas moderado (${lossRate.toFixed(0)}%)`,
        desc: `${perdidas} oportunidades perdidas. Cada oportunidade perdida representa tempo de prospecção, nutrição e abordagem que não se converteu em receita.`,
        rec: 'Implementar processo de "lost deal review" mensal. Identificar padrão nas perdas para ajustar qualificação e proposta.',
      })
    }
  }

  // 3. Oportunidades em aberto
  if (emAberto > 0 && abertoPct > 20) {
    insights.push({
      id: 'em-aberto',
      tipo: 'neutro',
      titulo: `${emAberto} oportunidade${emAberto > 1 ? 's' : ''} ainda em aberto`,
      desc: `${abertoPct.toFixed(0)}% das oportunidades criadas ainda não foram contabilizadas como ganhas nem perdidas.`,
      rec: 'Atualizar status das oportunidades em aberto. Oportunidades sem follow-up por mais de 7 dias têm probabilidade de conversão reduzida em 80%.',
    })
  }

  // 4. Volume de prospecção
  if (criadas < 8) {
    insights.push({
      id: 'volume-baixo',
      tipo: 'atencao',
      titulo: 'Volume de prospecção abaixo do ideal',
      desc: `Apenas ${criadas} oportunidade${criadas > 1 ? 's' : ''} criada${criadas > 1 ? 's' : ''} no período. Pipeline com volume baixo limita o crescimento mesmo com boa conversão.`,
      rec: 'Ampliar atividades de prospecção ativa: LinkedIn, indicações, eventos. Com taxa atual de conversão, seriam necessárias ~${Math.ceil(10 / (taxa/100 || 0.3))} oportunidades para fechar 10 clientes.',
    })
  } else if (criadas >= 20) {
    insights.push({
      id: 'volume-robusto',
      tipo: 'bom',
      titulo: 'Volume de prospecção robusto',
      desc: `${criadas} oportunidades criadas no período. Pipeline bem abastecido garante previsibilidade de fechamentos.`,
      rec: 'Foco agora em qualidade da conversão. Com este volume e ${taxa.toFixed(0)}% de conversão, projeção de ${ganhas} fechamentos/mês.',
    })
  }

  return insights
}

// ── Funnel SVG ─────────────────────────────────────────────────────────────
function FunnelChart({ criadas, ganhas, perdidas }) {
  const W = 260
  const MAXW = 220
  const MINW = 28
  const H_BAR = 52
  const GAP = 10

  const taxa = calcTaxa(criadas, ganhas)
  const perdaPct = criadas > 0 ? Math.min((perdidas / criadas) * 100, 100) : 0

  const levels = [
    { label: 'Criadas',  value: criadas,  pct: 100,      fill: 'rgba(204,244,106,0.12)', stroke: '#ccf46a', textColor: '#ccf46a' },
    { label: 'Ganhas',   value: ganhas,   pct: taxa,     fill: 'rgba(52,211,153,0.12)',  stroke: '#34d399', textColor: '#34d399' },
    { label: 'Perdidas', value: perdidas, pct: perdaPct, fill: 'rgba(248,113,113,0.10)', stroke: '#f87171', textColor: '#f87171' },
  ]

  const totalH = levels.length * H_BAR + (levels.length - 1) * GAP + 4
  const cx = W / 2

  function barW(pct) {
    if (!criadas) return MINW
    return MINW + ((pct / 100) * (MAXW - MINW))
  }

  return (
    <svg width={W} height={totalH} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
      {levels.map((lv, i) => {
        const w  = barW(lv.pct)
        const x  = cx - w / 2
        const y  = i * (H_BAR + GAP)
        const pctLabel = criadas > 0 ? `${lv.pct.toFixed(0)}%` : '—'

        return (
          <g key={lv.label}>
            {/* connector line */}
            {i > 0 && (
              <line
                x1={cx} y1={y - GAP}
                x2={cx} y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            {/* bar */}
            <rect
              x={x} y={y} width={w} height={H_BAR} rx={6}
              fill={lv.fill}
              stroke={lv.stroke}
              strokeWidth={1}
              style={{ transition: 'all 0.4s ease' }}
            />
            {/* value */}
            <text
              x={cx} y={y + H_BAR / 2 - 4}
              textAnchor="middle"
              fill="white"
              fontSize={17}
              fontWeight={700}
              fontFamily="'JetBrains Mono', monospace"
            >
              {lv.value}
            </text>
            {/* label + pct */}
            <text
              x={cx} y={y + H_BAR / 2 + 14}
              textAnchor="middle"
              fill={lv.textColor}
              fontSize={10}
              fontFamily="Inter, sans-serif"
              fontWeight={600}
              letterSpacing="0.04em"
            >
              {lv.label.toUpperCase()} · {pctLabel}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Insight Card ───────────────────────────────────────────────────────────
const TIPO_CONFIG = {
  critico: { cor: '#f87171', bg: 'rgba(248,113,113,0.09)', label: 'CRÍTICO' },
  atencao: { cor: '#f59e0b', bg: 'rgba(245,158,11,0.09)',  label: 'ATENÇÃO' },
  neutro:  { cor: '#60a5fa', bg: 'rgba(96,165,250,0.09)',  label: 'INFO'    },
  bom:     { cor: '#34d399', bg: 'rgba(52,211,153,0.09)',  label: 'POSITIVO'},
}

function InsightCard({ tipo, titulo, desc, rec }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.neutro
  return (
    <div className={styles.insightCard} style={{ '--ins-cor': cfg.cor }}>
      <div className={styles.insightTop}>
        <span className={styles.insightTag} style={{ color: cfg.cor, background: cfg.bg }}>
          {cfg.label}
        </span>
      </div>
      <h4 className={styles.insightTitle}>{titulo}</h4>
      <p className={styles.insightDesc}>{desc}</p>
      <div className={styles.insightRec}>
        <span style={{ color: cfg.cor }}>→</span>
        <span>{rec}</span>
      </div>
    </div>
  )
}

// ── KPI Input Card ─────────────────────────────────────────────────────────
function KPIInputCard({ label, value, onChange, color, readOnly = false, suffix = '' }) {
  return (
    <div className={styles.kpiCard} style={{ '--kpi-cor': color }}>
      <span className={styles.kpiLabel}>{label}</span>
      {readOnly ? (
        <span className={styles.kpiValue} style={{ color }}>
          {typeof value === 'number' ? value.toFixed(1) : value}{suffix}
        </span>
      ) : (
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className={styles.kpiInput}
          style={{ color }}
        />
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SalesOpportunityTracker({ mes }) {
  const mesEfetivo = mes || mesAtualStr()
  const qc = useQueryClient()

  const { data: remote, isLoading } = useQuery({
    queryKey: ['oportunidades', mesEfetivo],
    queryFn:  () => getOportunidade(mesEfetivo),
  })

  const mutation = useMutation({
    mutationFn: (body) => upsertOportunidade(mesEfetivo, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['oportunidades', mesEfetivo] }),
  })

  const [criadas,  setCriadas]  = useState(0)
  const [ganhas,   setGanhas]   = useState(0)
  const [perdidas, setPerdidas] = useState(0)

  // Sync local state when server data loads
  useEffect(() => {
    if (remote) {
      setCriadas(remote.criadas   ?? 0)
      setGanhas(remote.ganhas     ?? 0)
      setPerdidas(remote.perdidas ?? 0)
    }
  }, [remote])

  // Debounced auto-save whenever values change
  const saveTimer = useRef(null)
  useEffect(() => {
    if (isLoading) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      mutation.mutate({ criadas, ganhas, perdidas })
    }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [criadas, ganhas, perdidas]) // eslint-disable-line react-hooks/exhaustive-deps

  const taxa     = calcTaxa(criadas, ganhas)
  const insights = gerarInsights(criadas, ganhas, perdidas)

  return (
    <section className={styles.module}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>◈</span>
          <div>
            <h2 className={styles.headerTitle}>Desempenho de Oportunidades Comerciais</h2>
            <p className={styles.headerSub}>
              Funil comercial · {labelMes(mesEfetivo)}
              {mutation.isPending && <span className={styles.saving}> · salvando…</span>}
            </p>
          </div>
        </div>
        <div className={styles.headerBadge}>Rastreador de Oportunidades</div>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        {/* ── Left: KPIs + Funnel ── */}
        <div className={styles.left}>
          {/* KPI cards */}
          <div className={styles.kpiGrid}>
            <KPIInputCard
              label="Oportunidades Criadas"
              value={criadas}
              onChange={setCriadas}
              color="#ccf46a"
            />
            <KPIInputCard
              label="Oportunidades Ganhas"
              value={ganhas}
              onChange={setGanhas}
              color="#34d399"
            />
            <KPIInputCard
              label="Oportunidades Perdidas"
              value={perdidas}
              onChange={setPerdidas}
              color="#f87171"
            />
            <KPIInputCard
              label="Taxa de Conversão"
              value={taxa}
              readOnly
              suffix="%"
              color={taxa >= 35 ? '#34d399' : taxa >= 20 ? '#f59e0b' : '#f87171'}
            />
          </div>

          {/* Funnel */}
          <div className={styles.funnelWrap}>
            <span className={styles.funnelLabel}>Funil Comercial</span>
            <FunnelChart criadas={criadas} ganhas={ganhas} perdidas={perdidas} />
          </div>
        </div>

        {/* ── Right: AI Sales Insights ── */}
        <div className={styles.right}>
          <div className={styles.insightsHeader}>
            <span className={styles.insightsIcon}>✦</span>
            <span className={styles.insightsTitle}>Análise com IA — Funil</span>
          </div>

          {insights.length === 0 ? (
            <p className={styles.emptyInsights}>
              Insira os dados do funil para gerar análises automáticas.
            </p>
          ) : (
            <div className={styles.insightsList}>
              {insights.map(ins => (
                <InsightCard key={ins.id} {...ins} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
