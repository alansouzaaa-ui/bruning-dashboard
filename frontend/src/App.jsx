import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMeses } from './api'
import { ToastProvider } from './components/Toast'
import Header from './components/Header'
import KPICards from './components/KPICards'
import RitmoCard from './components/RitmoCard'
import ComparativoChart from './components/ComparativoChart'
import TabelaVendas from './components/TabelaVendas'
import ModalVenda from './components/ModalVenda'
import ComissoesPanel from './components/ComissoesPanel'
import AvaliacaoTrimestral from './components/AvaliacaoTrimestral'
import ConcorrentesPanel from './components/ConcorrentesPanel'
import SemanaCard from './components/SemanaCard'
import RitmoDiarioCard from './components/RitmoDiarioCard'
import ComissaoRealtimeCard from './components/ComissaoRealtimeCard'
import VendasMesCard from './components/VendasMesCard'
import AnalyticsPanel from './components/AnalyticsPanel'
import InsightsPanel from './components/InsightsPanel'
import PaymentKPIRow from './components/PaymentKPIRow'
import MetaAlertBanner from './components/MetaAlertBanner'
import AtingimentoHistoricoCard from './components/AtingimentoHistoricoCard'
import LTVCard from './components/LTVCard'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

export default function App() {
  const [mesFiltro, setMesFiltro] = useState('all')
  const [aba, setAba]             = useState('dashboard')

  const [modalAberto, setModalAberto] = useState(false)
  const [vendaEditar, setVendaEditar] = useState(null)

  const { data: meses = [] } = useQuery({
    queryKey: ['meses'],
    queryFn: getMeses,
  })

  // 'all'     → todos os meses — passa null para as queries (sem filtro)
  // 'YYYY-MM' → mês específico — passa direto para as queries
  const mesResolvido = mesFiltro === 'all' ? null : mesFiltro || null

  function abrirNovaVenda() {
    setVendaEditar(null)
    setModalAberto(true)
  }

  function abrirEditar(venda) {
    setVendaEditar(venda)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setVendaEditar(null)
  }

  return (
    <ToastProvider>
      <div className="app">
        <Header
          aba={aba}
          setAba={setAba}
          meses={meses}
          mesFiltro={mesFiltro}
          setMesFiltro={setMesFiltro}
          onNovaVenda={abrirNovaVenda}
        />

        {/* ── Dashboard: todos os indicadores ── */}
        {aba === 'dashboard' && (
          <main className="main">
            {/* ── Métricas Principais ── */}
            <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar KPIs.</div>}>
              <KPICards mes={mesResolvido} />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <MetaAlertBanner mes={mesResolvido} />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <PaymentKPIRow mes={mesResolvido} />
            </ErrorBoundary>

            {/* ── Ritmo & Metas ── */}
            <div className="section-label">Ritmo &amp; Metas</div>
            <div className="row-2">
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar acelerômetro.</div>}>
                <RitmoCard mes={mesResolvido} />
              </ErrorBoundary>
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar comparativo.</div>}>
                <ComparativoChart />
              </ErrorBoundary>
            </div>
            <div className="row-3">
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar ritmo diário.</div>}>
                <RitmoDiarioCard mes={mesResolvido} />
              </ErrorBoundary>
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar meta semanal.</div>}>
                <SemanaCard mes={mesResolvido} />
              </ErrorBoundary>
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar comissão.</div>}>
                <ComissaoRealtimeCard mes={mesResolvido} />
              </ErrorBoundary>
            </div>

            {/* ── Análise de Carteira ── */}
            <div className="section-label">Análise de Carteira</div>
            <ErrorBoundary fallback={null}>
              <AtingimentoHistoricoCard />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <LTVCard />
            </ErrorBoundary>
            <div className="row-3">
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar analytics.</div>}>
                <AnalyticsPanel mes={mesResolvido} />
              </ErrorBoundary>
            </div>

            {/* ── Análise & Insights ── */}
            <div className="section-label">Análise &amp; Insights</div>
            <ErrorBoundary fallback={null}>
              <InsightsPanel mes={mesResolvido} />
            </ErrorBoundary>

            {/* ── Vendas do Período ── */}
            <div className="section-label">Vendas do Período</div>
            <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar vendas do mês.</div>}>
              <VendasMesCard mes={mesResolvido} />
            </ErrorBoundary>
          </main>
        )}

        {/* ── Vendas: cadastro e histórico de vendas ── */}
        {aba === 'vendas' && (
          <main className="main">
            <ErrorBoundary>
              <TabelaVendas mes={mesResolvido} onEditar={abrirEditar} />
            </ErrorBoundary>
          </main>
        )}

        {aba === 'comissoes' && (
          <main className="main">
            <ErrorBoundary>
              <ComissoesPanel />
            </ErrorBoundary>
          </main>
        )}

        {aba === 'trimestral' && (
          <main className="main">
            <ErrorBoundary>
              <AvaliacaoTrimestral />
            </ErrorBoundary>
          </main>
        )}

        {aba === 'concorrentes' && (
          <main className="main">
            <ErrorBoundary>
              <ConcorrentesPanel />
            </ErrorBoundary>
          </main>
        )}

        {modalAberto && (
          <ModalVenda
            venda={vendaEditar}
            onClose={fecharModal}
          />
        )}
      </div>
    </ToastProvider>
  )
}
