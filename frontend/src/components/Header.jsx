import { useMemo } from 'react'
import styles from './Header.module.css'

/**
 * Navegador de mês com setas ← →.
 * Navega pela lista de meses com dados. O mês mais recente é o padrão.
 */
function MonthNav({ meses, mesFiltro, setMesFiltro }) {
  const sorted = useMemo(
    () => [...meses].sort((a, b) => a.valor.localeCompare(b.valor)),
    [meses]
  )

  if (sorted.length === 0) return null

  const isAll      = mesFiltro === 'all'
  const ultimo     = sorted[sorted.length - 1]?.valor
  const atual      = isAll ? ultimo : (mesFiltro || ultimo)
  const idx        = sorted.findIndex(m => m.valor === atual)
  const label      = sorted[idx]?.label ?? '—'
  const ehUltimo   = idx >= sorted.length - 1
  const ehPrimeiro = idx <= 0

  function navAnterior() {
    if (isAll || ehPrimeiro) return
    setMesFiltro(sorted[idx - 1].valor)
  }

  function navProximo() {
    if (isAll || ehUltimo) return
    const proximo = sorted[idx + 1]
    setMesFiltro(proximo.valor === ultimo ? '' : proximo.valor)
  }

  return (
    <div className={styles.monthNav}>
      <button
        className={`${styles.todosBtn} ${isAll ? styles.todosActive : ''}`}
        onClick={() => setMesFiltro(isAll ? '' : 'all')}
        title={isAll ? 'Voltar ao mês atual' : 'Ver todos os meses'}
        type="button"
      >
        Todos
      </button>
      <div className={`${styles.mesNav} ${isAll ? styles.mesNavDim : ''}`}>
        <button
          className={styles.navArrow}
          onClick={navAnterior}
          disabled={ehPrimeiro || isAll}
          title="Mês anterior"
          type="button"
        >
          ‹
        </button>
        <button
          className={`${styles.mesLabel} ${!mesFiltro && !isAll ? styles.mesHoje : ''}`}
          onClick={() => setMesFiltro('')}
          title={mesFiltro && !isAll ? 'Clique para voltar ao mês atual' : 'Mês atual'}
          disabled={isAll}
          type="button"
        >
          {label}
        </button>
        <button
          className={styles.navArrow}
          onClick={navProximo}
          disabled={ehUltimo || isAll}
          title="Próximo mês"
          type="button"
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default function Header({ aba, setAba, meses, mesFiltro, setMesFiltro, onNovaVenda }) {
  const showFiltroMes = aba === 'dashboard' || aba === 'vendas'
  const showNovaVenda = aba === 'vendas'

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.logo}>
          <svg className={styles.logoIcon} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="22" height="22" rx="6" fill="#ccf46a" fillOpacity=".15"/>
            <rect x="3.5" y="11" width="3.5" height="7.5" rx="1.5" fill="#ccf46a"/>
            <rect x="9.5" y="7" width="3.5" height="11.5" rx="1.5" fill="#ccf46a"/>
            <rect x="15.5" y="3" width="3" height="15.5" rx="1.5" fill="#ccf46a"/>
          </svg>
          Alan A. Souza — <span>Bruning Eixo</span>
        </span>
        <nav className={styles.nav}>
          <button
            className={aba === 'dashboard' ? styles.active : ''}
            onClick={() => setAba('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={aba === 'vendas' ? styles.active : ''}
            onClick={() => setAba('vendas')}
          >
            Vendas
          </button>
          <button
            className={aba === 'comissoes' ? styles.active : ''}
            onClick={() => setAba('comissoes')}
          >
            Comissões
          </button>
          <button
            className={aba === 'trimestral' ? styles.active : ''}
            onClick={() => setAba('trimestral')}
          >
            Avaliação
          </button>
          <button
            className={`${aba === 'crm' ? styles.active : ''} ${styles.crmBtn}`}
            onClick={() => setAba('crm')}
          >
            CRM
            <span className={styles.crmTag}>Nectar</span>
          </button>
        </nav>
      </div>

      <div className={styles.right}>
        {showFiltroMes && (
          <MonthNav meses={meses} mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} />
        )}
        {showNovaVenda && (
          <button className="btn btn-primary" onClick={onNovaVenda}>
            + Nova Venda
          </button>
        )}
      </div>
    </header>
  )
}
