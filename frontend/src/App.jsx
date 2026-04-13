import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMeses } from './api'
import { mesAtual } from './utils/date'
import { ToastProvider } from './components/Toast'
import Header from './components/Header'
import KPICards from './components/KPICards'
import RitmoCard from './components/RitmoCard'
import ComparativoChart from './components/ComparativoChart'
import TabelaVendas from './components/TabelaVendas'
import ModalVenda from './components/ModalVenda'
import ComissoesPanel from './components/ComissoesPanel'
import AvaliacaoTrimestral from './components/AvaliacaoTrimestral'
import CRMPanel from './components/CRMPanel'
import SemanaCard from './components/SemanaCard'
import RitmoDiarioCard from './components/RitmoDiarioCard'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

export default function App() {
  const [mesFiltro, setMesFiltro] = useState('')
  const [aba, setAba]             = useState('dashboard')

  const [modalAberto, setModalAberto] = useState(false)
  const [vendaEditar, setVendaEditar] = useState(null)

  const { data: meses = [] } = useQuery({
    queryKey: ['meses'],
    queryFn: getMeses,
  })

  // 'all'    → todos os meses (sem filtro, passa null para as queries)
  // ''       → último mês com dados no BD (alinhado com o que o MonthNav exibe)
  // 'YYYY-MM' → mês específico
  const ultimoMes = [...meses].sort((a, b) => a.valor.localeCompare(b.valor)).at(-1)?.valor
  const mesResolvido = mesFiltro === 'all' ? null : (mesFiltro || ultimoMes || mesAtual())

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
            <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar KPIs.</div>}>
              <KPICards mes={mesResolvido} />
            </ErrorBoundary>
            <div className="row-2">
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar acelerômetro.</div>}>
                <RitmoCard mes={mesResolvido} />
              </ErrorBoundary>
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar comparativo.</div>}>
                <ComparativoChart />
              </ErrorBoundary>
            </div>
            <div className="row-2">
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar ritmo diário.</div>}>
                <RitmoDiarioCard mes={mesResolvido} />
              </ErrorBoundary>
              <ErrorBoundary fallback={<div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Erro ao carregar meta semanal.</div>}>
                <SemanaCard mes={mesResolvido} />
              </ErrorBoundary>
            </div>
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

        {aba === 'crm' && (
          <main className="main">
            <ErrorBoundary>
              <CRMPanel mes={mesResolvido} />
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
