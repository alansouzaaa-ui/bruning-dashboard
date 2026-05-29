import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { getComparativo, getMetas, getMetasMensais } from '../api'
import { METAS_FIXAS, META_PADRAO } from '../business/comissoes.constants'
import styles from './AtingimentoHistoricoCard.module.css'

function corBarra(atingimento) {
  if (atingimento >= 95) return '#ccf46a'
  if (atingimento >= 85) return '#84cc16'
  if (atingimento >= 75) return '#f59e0b'
  if (atingimento >= 70) return '#f97316'
  return '#f87171'
}

function TooltipCustom({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const cor = corBarra(d.atingimento)
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      minWidth: 180,
    }}>
      <p style={{ color: 'var(--text1)', fontWeight: 600, marginBottom: 6 }}>{d.label}</p>
      <p style={{ color: cor, fontWeight: 700, fontSize: 15 }}>
        {d.atingimento.toFixed(1)}%
        <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>
          da meta
        </span>
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>
        MRR: R$ {Number(d.mrr).toLocaleString('pt-BR')}
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 11 }}>
        Meta: R$ {Number(d.meta).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

export default function AtingimentoHistoricoCard() {
  const { data: comparativo = [] } = useQuery({
    queryKey:  ['comparativo'],
    queryFn:   getComparativo,
    staleTime: 300_000,
  })

  const { data: metas } = useQuery({
    queryKey:  ['metas'],
    queryFn:   getMetas,
    staleTime: 300_000,
  })

  const { data: metasMensais = [] } = useQuery({
    queryKey:  ['metasMensais'],
    queryFn:   getMetasMensais,
    staleTime: 300_000,
  })

  const dados = useMemo(() => {
    if (!comparativo.length || !metas) return []

    const metaMap    = Object.fromEntries(metasMensais.map(m => [m.mes, Number(m.meta_mrr)]))
    const metaGlobal = Number(metas.meta_mrr) || META_PADRAO

    return comparativo.map(m => {
      const meta       = metaMap[m.mes] ?? METAS_FIXAS[m.mes] ?? metaGlobal
      const mrrNum     = Number(m.mrr)
      const atingimento = meta > 0 ? Math.min((mrrNum / meta) * 100, 150) : 0
      return { label: m.label, mes: m.mes, mrr: mrrNum, meta, atingimento }
    })
  }, [comparativo, metas, metasMensais])

  if (!dados.length) return null

  const media   = dados.reduce((s, d) => s + d.atingimento, 0) / dados.length
  const corMedia = corBarra(media)
  const yMax    = Math.max(110, Math.ceil(Math.max(...dados.map(d => d.atingimento)) / 10) * 10)

  return (
    <div className="card">
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.title}>Atingimento de Meta — Histórico</p>
          <div className={styles.mediaTag}>
            <span className={styles.mediaDot} style={{ background: corMedia }} />
            <span style={{ color: corMedia }}>Média {media.toFixed(0)}%</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={dados}
            barCategoryGap="28%"
            margin={{ top: 6, right: 2, left: -22, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9.5, fill: 'var(--muted)', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'var(--muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              domain={[0, yMax]}
            />
            <Tooltip content={<TooltipCustom />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <ReferenceLine
              y={100}
              stroke="rgba(255,255,255,0.14)"
              strokeDasharray="4 3"
              label={{ value: '100%', position: 'right', fontSize: 9, fill: 'var(--muted)' }}
            />
            <Bar dataKey="atingimento" radius={[3, 3, 0, 0]}>
              {dados.map((d, i) => (
                <Cell key={i} fill={corBarra(d.atingimento)} fillOpacity={0.82} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className={styles.legenda}>
          {[
            { cor: '#ccf46a', label: '≥ 95% — Excelente' },
            { cor: '#f59e0b', label: '75–85% — Satisfatório' },
            { cor: '#f87171', label: '< 75% — Atenção' },
          ].map(l => (
            <div key={l.label} className={styles.legendaItem}>
              <span className={styles.legendaDot} style={{ background: l.cor }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
