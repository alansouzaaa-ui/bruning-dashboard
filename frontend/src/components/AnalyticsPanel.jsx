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
  const { media, ultimas10, semData } = useMemo(() => {
    const aptas = vendas
      .filter(v => v.data_crm && v.data && v.status !== 'Cancelado')
      .map(v => ({ ...v, dias: diffDias(v.data_crm, v.data) }))
      .filter(v => v.dias !== null)
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))

    if (!aptas.length) return {
      media: null,
      ultimas10: [],
      semData: vendas.filter(v => v.status !== 'Cancelado').length,
    }

    const mediaVal = aptas.reduce((s, v) => s + v.dias, 0) / aptas.length
    return {
      media: Math.round(mediaVal),
      ultimas10: aptas.slice(0, 10),
      semData: 0,
    }
  }, [vendas])

  function fmtDate(str) {
    if (!str) return '—'
    const [, m, d] = str.split('-')
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${d}/${meses[parseInt(m, 10) - 1]}`
  }

  return (
    <div className="card">
      <div className={styles.card}>
        <div className={styles.titleRow}>
          <p className={styles.title}>Tempo Médio de Fechamento</p>
          {media !== null && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              {ultimas10.length} vendas
            </span>
          )}
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
          <>
            {/* KPI principal */}
            <div className={styles.tempoWrap} style={{ marginBottom: 14 }}>
              <div className={styles.tempoValor}>
                <span className={styles.tempoDias}>{media}</span>
                <span className={styles.tempoUnidade}>dias</span>
              </div>
              <p className={styles.tempoDesc}>média entre entrada no CRM e fechamento da venda</p>
            </div>

            {/* Tabela — últimas 10 vendas */}
            <div className={styles.tempoTableWrap}>
              <table className={styles.tempoTable}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Entrada CRM</th>
                    <th>Fechamento</th>
                    <th>Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimas10.map(v => {
                    const cor = v.dias <= 7 ? 'var(--c-green)'
                              : v.dias <= 21 ? 'var(--c-yellow)'
                              : 'var(--c-red)'
                    return (
                      <tr key={v.id}>
                        <td className={styles.tempoCliente} title={v.cliente}>{v.cliente}</td>
                        <td className={styles.tempoData}>{fmtDate(v.data_crm)}</td>
                        <td className={styles.tempoData}>{fmtDate(v.data)}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: cor, fontSize: 11 }}>
                          {v.dias}d
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
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
