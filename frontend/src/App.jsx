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
import './App.css'

export default function App() {
  const [mesFiltro, setMesFiltro] = useState('')
  const [aba, setAba] = useState('dashboard') // 'dashboard' | 'comissoes'
  const [modalAberto, setModalAberto] = useState(false)
  const [vendaEditar, setVendaEditar] = useState(null)

  const { data: meses = [] } = useQuery({
    queryKey: ['meses'],
    queryFn: getMeses,
  })

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

        {aba === 'dashboard' && (
          <main className="main">
            <KPICards mes={mesFiltro} />
            <div className="row-2">
              <RitmoCard mes={mesFiltro} />
              <ComparativoChart />
            </div>
            <TabelaVendas mes={mesFiltro} onEditar={abrirEditar} />
          </main>
        )}

        {aba === 'comissoes' && (
          <main className="main">
            <ComissoesPanel />
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
