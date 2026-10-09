import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24,
          margin: '16px 0',
          borderRadius: 12,
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          color: '#9f1239',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
            ⚠️ Ocurrió una advertencia visual al cargar este componente
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#be123c' }}>
            {this.state.error?.message || 'Error inesperado de renderizado.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={this.handleReset}
          >
            ↻ Reintentar componente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
