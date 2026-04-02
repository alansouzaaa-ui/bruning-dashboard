import styles from './Header.module.css'

export default function Header({ aba, setAba, meses, mesFiltro, setMesFiltro, onNovaVenda }) {
  const showFiltroMes = aba === 'dashboard'
  const showNovaVenda = aba === 'dashboard'

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.logo}>Bruning <span>Dashboard</span></span>
        <nav className={styles.nav}>
          <button
            className={aba === 'dashboard' ? styles.active : ''}
            onClick={() => setAba('dashboard')}
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
          <select
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
            className={styles.select}
          >
            <option value="">Todos os meses</option>
            {meses.map(m => (
              <option key={m.valor} value={m.valor}>{m.label}</option>
            ))}
          </select>
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
