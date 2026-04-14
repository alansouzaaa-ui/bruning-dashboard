import { Component } from 'react'

/**
 * Error Boundary genérico.
 * Envolva qualquer seção crítica para evitar tela branca em caso de erro.
 *
 * Uso:
 *   <ErrorBoundary fallback={<p>Erro ao carregar.</p>}>
 *     <ComponenteCritico />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="card"
            style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}
          >
            Erro ao carregar este componente.
          </div>
        )
      )
    }
    return this.props.children
  }
}
