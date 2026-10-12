import { Component } from 'react'

// Si una pantalla falla, muestra un aviso con el error en lugar de dejar la
// app en blanco. Los datos guardados en el dispositivo (visitas pendientes de
// sincronizar, sesión) no se borran.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, where: '' }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error en la app', error, info.componentStack)
    // Primeros componentes de la pila, para saber qué pantalla falló.
    const where = (info.componentStack ?? '')
      .split('\n')
      .map((line) => line.trim().replace(/^at /, '').split(' ')[0])
      .filter(Boolean)
      .slice(0, 4)
      .join(' › ')
    this.setState({ where })
  }

  reload = () => window.location.reload()

  // Vuelve a la pantalla de inicio (descarta la pantalla interna guardada).
  goHome = () => {
    window.history.replaceState(null, '', '/')
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="app-main error-screen" role="alert">
        <h1 className="page-heading">Algo salió mal</h1>
        <p className="page-subtitle">
          La pantalla no se pudo mostrar. Sus datos y las visitas pendientes de sincronizar siguen
          guardados.
        </p>
        <pre className="error-detail">
          {String(this.state.error?.message ?? this.state.error)}
          {this.state.where && `\nEn: ${this.state.where}`}
        </pre>
        <div className="visit-actions">
          <button type="button" onClick={this.goHome}>
            Volver al inicio
          </button>
          <button type="button" className="outline" onClick={this.reload}>
            Recargar
          </button>
        </div>
      </main>
    )
  }
}

export default ErrorBoundary
