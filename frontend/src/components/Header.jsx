import styles from './Header.module.css'

export default function Header({ aba, setAba, meses, mesFiltro, setMesFiltro, onNovaVenda }) {
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
        </nav>
      </div>

      <div className={styles.right}>
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
        <button className="btn btn-primary" onClick={onNovaVenda}>
          + Nova Venda
        </button>
      </div>
    </header>
  )
}
