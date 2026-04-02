import { useQuery } from '@tanstack/react-query'
import { getCRMStatus, getCRMFunil, getCRMKpis } from '../api'
import styles from './CRMPanel.module.css'

const fmtPct = (v) => `${Number(v).toFixed(1)}%`

function KPICard({ label, valor, sub, cor }) {
  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiValor} style={cor ? { color: cor } : {}}>{valor}</span>
      <span className={styles.kpiLabel}>{label}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  )
}

function FunilEtapa({ etapa, max }) {
  const largura = Math.max(10, Math.round((etapa.quantidade / max) * 100))
  return (
    <div className={styles.etapa}>
      <div className={styles.etapaLeft}>
        <span className={styles.etapaNome}>{etapa.nome}</span>
        <span className={styles.etapaQtd}>{etapa.quantidade} leads</span>
      </div>
      <div className={styles.etapaBarWrap}>
        <div className={styles.etapaBar} style={{ width: `${largura}%` }} />
      </div>
      <div className={styles.etapaTaxas}>
        <span className={styles.etapaTaxa} title="Conversão da etapa anterior">
          {fmtPct(etapa.taxa_conversao)} etapa
        </span>
        <span className={styles.etapaTaxaAcum} title="Conversão acumulada desde o início">
          {fmtPct(etapa.taxa_acumulada)} total
        </span>
      </div>
    </div>
  )
}

export default function CRMPanel({ mes }) {
  const { data: status } = useQuery({
    queryKey: ['crm-status'],
    queryFn: getCRMStatus,
  })

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['crm-kpis', mes],
    queryFn: () => getCRMKpis(mes),
  })

  const { data: funil, isLoading: loadingFunil } = useQuery({
    queryKey: ['crm-funil', mes],
    queryFn: () => getCRMFunil(mes),
  })

  const isMock = kpis?.fonte?.includes('mock')

  return (
    <div className={styles.wrap}>
      {/* Banner de status da integração */}
      {status && (
        <div className={`${styles.statusBanner} ${status.configurado ? styles.statusOk : styles.statusPendente}`}>
          <span className={styles.statusIcon}>{status.configurado ? '🟢' : '🟡'}</span>
          <div>
            <strong>{status.configurado ? 'Nectar CRM conectado' : 'Nectar CRM — aguardando configuração'}</strong>
            {!status.configurado && (
              <p className={styles.statusMsg}>
                Para conectar, adicione <code>NECTAR_API_KEY</code> e <code>NECTAR_BASE_URL</code> nas variáveis de ambiente do Railway.
                Os dados abaixo são ilustrativos.
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPIs do CRM */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          KPIs de Conversão
          {isMock && <span className={styles.mockTag}>dados simulados</span>}
        </h3>
        {loadingKpis ? (
          <p className={styles.loading}>Carregando...</p>
        ) : kpis && (
          <div className={styles.kpisGrid}>
            <KPICard
              label="Win Rate"
              valor={fmtPct(kpis.win_rate)}
              sub="Negócios ganhos / total"
              cor="#22c55e"
            />
            <KPICard
              label="Leads para Fechar 1"
              valor={kpis.leads_para_fechar}
              sub="Leads necessários por contrato"
            />
            <KPICard
              label="Ciclo Médio de Vendas"
              valor={`${kpis.ciclo_medio_dias} dias`}
              sub="Do primeiro contato ao fechamento"
            />
            <KPICard
              label="Contratos Ganhos"
              valor={kpis.total_ganhos}
              sub={`${kpis.total_perdidos} perdidos no período`}
              cor="#60a5fa"
            />
          </div>
        )}
      </div>

      {/* Funil de vendas */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          Funil de Vendas
          {isMock && <span className={styles.mockTag}>dados simulados</span>}
        </h3>

        {loadingFunil ? (
          <p className={styles.loading}>Carregando...</p>
        ) : funil?.etapas && (
          <div className={styles.funil}>
            <div className={styles.funilHeader}>
              <span>Etapa</span>
              <span>Volume</span>
              <span>Conversão</span>
            </div>
            {funil.etapas.map((etapa, i) => (
              <FunilEtapa
                key={i}
                etapa={etapa}
                max={funil.etapas[0]?.quantidade || 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* KPIs planejados (estrutura para Nectar) */}
      <div className="card">
        <h3 className={styles.sectionTitle}>KPIs Disponíveis após Integração</h3>
        <div className={styles.plannedGrid}>
          {[
            { icon: '📊', nome: 'Taxa de conversão por etapa',    status: 'disponível' },
            { icon: '🎯', nome: 'Leads necessários por fechamento', status: 'disponível' },
            { icon: '⏱',  nome: 'Ciclo médio de vendas (dias)',    status: 'disponível' },
            { icon: '🏆', nome: 'Win rate geral',                  status: 'disponível' },
            { icon: '💰', nome: 'Valor em pipeline (MRR potencial)', status: 'em breve' },
            { icon: '📞', nome: 'Taxa de follow-up',               status: 'em breve' },
            { icon: '🔍', nome: 'Conversão por fonte de lead',     status: 'em breve' },
            { icon: '⚡', nome: 'Tempo médio de primeiro contato', status: 'em breve' },
          ].map((kpi, i) => (
            <div key={i} className={styles.plannedItem}>
              <span className={styles.plannedIcon}>{kpi.icon}</span>
              <span className={styles.plannedNome}>{kpi.nome}</span>
              <span className={`${styles.plannedStatus} ${kpi.status === 'disponível' ? styles.disponivel : styles.emBreve}`}>
                {kpi.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
