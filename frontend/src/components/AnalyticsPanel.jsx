import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getVendas } from '../api'
import styles from './AnalyticsPanel.module.css'

/* ── Paleta consistente com o dark theme ── */
const CORES = [
  '#ccf46a', '#60a5fa', '#f59e0b', '#a78bfa',
  '#fb7185', '#34d399', '#f97316', '#6b7280',
]

/* ── helpers ── */
function agrupar(vendas, campo) {
  const mapa = {}
  for (const v of vendas) {
    const chave = v[campo]?.trim() || 'Não informado'
    mapa[chave] = (mapa[chave] || 0) + 1
  }
  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
}

function diffDias(dataInicio, dataFim) {
  const a = new Date(dataInicio)
  const b = new Date(dataFim)
  if (isNaN(a) || isNaN(b)) return null
  const d = Math.round((b - a) / 86_400_000)
  return d >= 0 ? d : null
}

/* ── Tooltip customizado ── */
function TooltipPie({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{name}</p>
      <p className={styles.tooltipRow}>{value} {value === 1 ? 'venda' : 'vendas'} · {pct}%</p>
    </div>
  )
}

/* ── Legenda customizada ── */
function Legenda({ dados, total }) {
  return (
    <div className={styles.legenda}>
      {dados.map((d, i) => {
        const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0
        return (
          <div key={d.name} className={styles.legendaItem}>
            <span className={styles.legendaDot} style={{ background: CORES[i % CORES.length] }} />
            <span>{d.name}</span>
            <span className={styles.legendaPct}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Card: Tempo Médio de Fechamento ── */
function TempoMedioCard({ vendas }) {
  const { media, total, semData } = useMemo(() => {
    const aptas = vendas.filter(
      v => v.data_crm && v.data && v.status !== 'Cancelado'
    )
    const dias = aptas
      .map(v => diffDias(v.data_crm, v.data))
      .filter(d => d !== null)

    if (!dias.length) return { media: null, total: 0, semData: vendas.filter(v => v.status !== 'Cancelado').length }

    const media = dias.reduce((s, d) => s + d, 0) / dias.length
    return { media: Math.round(media), total: dias.length, semData: 0 }
  }, [vendas])

  return (
    <div className="card">
      <div className={styles.card}>
        <div className={styles.titleRow}>
          <p className={styles.title}>Tempo Médio de Fechamento</p>
        </div>

        {media === null ? (
          <div className={styles.semDados}>
            <span className={styles.semDadosIcon}>⏱</span>
            <span>Sem dados suficientes</span>
            {semData > 0 && (
              <span style={{ fontSize: 11 }}>
                {semData} {semData === 1 ? 'venda sem' : 'vendas sem'} "Data de Entrada no CRM"
              </span>
            )}
          </div>
        ) : (
          <div className={styles.tempoWrap}>
            <div className={styles.tempoValor}>
              <span className={styles.tempoDias}>{media}</span>
              <span className={styles.tempoUnidade}>dias</span>
            </div>
            <p className={styles.tempoDesc}>média entre entrada no CRM e fechamento da venda</p>
            <div className={styles.tempoMeta}>
              <div className={styles.tempoMetaRow}>
                <span className={styles.tempoMetaLabel}>Vendas calculadas</span>
                <span className={styles.tempoMetaVal}>{total}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Card: Pizza Chart ── */
function PizzaCard({ titulo, dados }) {
  const total = dados.reduce((s, d) => s + d.value, 0)

  return (
    <div className="card">
      <div className={styles.card} style={{ height: '100%' }}>
        <div className={styles.titleRow}>
          <p className={styles.title}>{titulo}</p>
          {total > 0 && (
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{total} vendas</span>
          )}
        </div>

        {total === 0 ? (
          <div className={styles.semDados}>
            <span className={styles.semDadosIcon}>📊</span>
            <span>Sem dados no período</span>
          </div>
        ) : (
          <div className={styles.pieWrap}>
            <div className={styles.chartArea}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dados}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="70%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {dados.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipPie total={total} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <Legenda dados={dados} total={total} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Componente principal exportado ── */
export default function AnalyticsPanel({ mes }) {
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas', mes],
    queryFn: () => getVendas({ mes: mes || undefined }),
    staleTime: 60_000,
  })

  const dadosSegmento = useMemo(() => agrupar(vendas, 'segmento'), [vendas])
  const dadosOrigem   = useMemo(() => agrupar(vendas, 'origem'),   [vendas])

  if (isLoading) {
    return (
      <>
        {[0, 1, 2].map(i => (
          <div key={i} className="card">
            <div className={styles.card}>
              <div className={styles.skeleton}>
                <div className={styles.skBlock} style={{ height: 10, width: '50%' }} />
                <div className={styles.skBlock} style={{ height: 140, borderRadius: 10 }} />
                <div className={styles.skBlock} style={{ height: 10, width: '70%' }} />
                <div className={styles.skBlock} style={{ height: 10, width: '55%' }} />
              </div>
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      <TempoMedioCard vendas={vendas} />
      <PizzaCard titulo="Distribuição por Segmento" dados={dadosSegmento} />
      <PizzaCard titulo="Distribuição por Origem"   dados={dadosOrigem}   />
    </>
  )
}
