import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from './common/Modal'

const DEMO = [
  {
    usuario: 'dhuerta',
    clave: 'jefe123',
    nombre: 'Dennys Huerta',
    rol: 'Jefe de Distribución',
    desc: 'Acceso total + aprobación de rutas',
    ini: 'DH',
    color: '#E1252B'
  },
  {
    usuario: 'asistente',
    clave: 'dist123',
    nombre: 'Lesli Pomalaya',
    rol: 'Asistente de Distribución',
    desc: 'Tanteo, ruteo en vivo y cobranzas',
    ini: 'LP',
    color: '#2563EB'
  },
  {
    usuario: 'admin.ti',
    clave: 'ti2026',
    nombre: 'Área de TI',
    rol: 'Administrador TI',
    desc: 'Configuración y registros de auditoría',
    ini: 'TI',
    color: '#9333EA'
  },
]

/**
 * Pantalla de inicio de sesión profesional — RNF-02 / WCAG 2.1 AA.
 * Aplica principios de Heurística #9 (diagnóstico y recuperación de errores),
 * Ley de Fitts (targets de autocompletado accesibles) y Ley de Miller (chunking).
 */
export default function Login() {
  const { login } = useAuth()
  const [usuario,   setUsuario]   = useState('')
  const [clave,     setClave]     = useState('')
  const [error,     setError]     = useState('')
  const [cargando,  setCargando]  = useState(false)
  const [verClave,  setVerClave]  = useState(false)
  const [aceptado,  setAceptado]  = useState(true)
  const [modalTerminos, setModalTerminos] = useState(false)
  const [tocado, setTocado] = useState({ usuario: false, clave: false })

  const handleSubmit = (e) => {
    e.preventDefault()
    setTocado({ usuario: true, clave: true })

    if (!usuario.trim() || !clave) {
      setError('Por favor completa tu usuario y contraseña para continuar.')
      return
    }

    if (!aceptado) {
      setError('Debes aceptar las políticas operativas del sistema.')
      return
    }

    setCargando(true)
    setError('')

    setTimeout(() => {
      const ok = login(usuario.trim(), clave)
      if (!ok) {
        setError('Usuario o contraseña no válidos. Verifica tus credenciales de acceso.')
      }
      setCargando(false)
    }, 600)
  }

  const autoFill = (u) => {
    setUsuario(u.usuario)
    setClave(u.clave)
    setError('')
    setAceptado(true)
    setTocado({ usuario: true, clave: true })
  }

  const userInvalido = tocado.usuario && !usuario.trim()
  const claveInvalida = tocado.clave && !clave

  return (
    <div className="login-wrapper">
      {/* Modal de Términos Operativos (Heurística #10 & Morville Creíble) */}
      <Modal
        isOpen={modalTerminos}
        onClose={() => setModalTerminos(false)}
        title="Políticas Operativas y Privacidad SIPRD"
        subtitle="Alfa Distribuidores S.A. — Gestión de Rutas y Datos de Reparto"
        maxWidth={500}
      >
        <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p>
            El <strong>Sistema Inteligente de Planificación de Rutas de Distribución (SIPRD)</strong> es una plataforma interna exclusiva para el personal autorizado de Alfa Distribuidores S.A.
          </p>
          <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Todas las acciones (aprobación de rutas, reordenamientos, validación de cobros) quedan registradas con nombre, fecha y hora en el log de auditoría (RF-13 / RNF-09).</li>
            <li>Las contraseñas y accesos son personales e intransferibles según el rol asignado (RNF-02).</li>
            <li>La información de clientes, pedidos y montos de cobranza está protegida bajo estrictas políticas de confidencialidad corporativa.</li>
          </ul>
        </div>
        <div className="modal-ft" style={{ margin: '16px -22px -20px', padding: '12px 22px' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModalTerminos(false)}>
            He leído y comprendido
          </button>
        </div>
      </Modal>

      <div className="login-container">
        {/* Banner Izquierdo con Ilustración / Identidad Corporativa */}
        <div className="login-image">
          <div className="login-image-overlay" />
          <div className="login-image-content">
            <span style={{ display: 'inline-block', background: 'rgba(225,37,43,0.9)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>
              LOGÍSTICA INTELIGENTE 2026
            </span>
            <h2>Planificación de Rutas sin Fricción</h2>
            <p>
              Optimiza despachos diarios, gestiona paradas en tiempo real y valida cobros al instante para Alfa Distribuidores S.A.
            </p>
          </div>
        </div>

        {/* Panel de Login */}
        <div className="login-panel">
          <div className="login-brand-new">
            <span className="login-brand-alfa">ALFA</span>
            <span className="login-brand-dist">DISTRIBUIDORES S. A.</span>
          </div>

          <h1 className="login-title-new">Ingreso al Sistema SIPRD</h1>
          <p className="login-sub-new">Ingresa con tus credenciales de red para acceder a los módulos de despacho.</p>

          <form onSubmit={handleSubmit} className="login-form-new" noValidate>
            <div className="login-field-new">
              <label htmlFor="l-user">
                Usuario <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="l-user"
                type="text"
                autoComplete="username"
                value={usuario}
                onChange={e => {
                  setUsuario(e.target.value)
                  setError('')
                }}
                onBlur={() => setTocado(p => ({ ...p, usuario: true }))}
                placeholder="ej. dhuerta o asistente"
                className={userInvalido ? 'is-invalid' : ''}
                aria-required="true"
                aria-invalid={userInvalido}
              />
              {userInvalido && (
                <span className="login-helper error" role="alert">El nombre de usuario es obligatorio</span>
              )}
            </div>

            <div className="login-field-new">
              <label htmlFor="l-pass">
                Contraseña <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="l-pass"
                  type={verClave ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={clave}
                  onChange={e => {
                    setClave(e.target.value)
                    setError('')
                  }}
                  onBlur={() => setTocado(p => ({ ...p, clave: true }))}
                  placeholder="••••••••"
                  className={claveInvalida ? 'is-invalid' : ''}
                  style={{ width: '100%', paddingRight: 40 }}
                  aria-required="true"
                  aria-invalid={claveInvalida}
                />
                <button
                  type="button"
                  onClick={() => setVerClave(v => !v)}
                  className="login-eye-btn"
                  title={verClave ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {verClave ? (
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                    ) : (
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    )}
                  </svg>
                </button>
              </div>
              {claveInvalida && (
                <span className="login-helper error" role="alert">Ingresa tu contraseña</span>
              )}
            </div>

            <div className="login-checkbox">
              <input
                type="checkbox"
                id="l-terms"
                checked={aceptado}
                onChange={e => {
                  setAceptado(e.target.checked)
                  setError('')
                }}
              />
              <label htmlFor="l-terms">
                Acepto las{' '}
                <a
                  href="#terminos"
                  onClick={(e) => {
                    e.preventDefault()
                    setModalTerminos(true)
                  }}
                  style={{ color: 'var(--blue)', textDecoration: 'underline', fontWeight: 600 }}
                >
                  políticas operativas del sistema
                </a>
              </label>
            </div>

            {error && (
              <div className="login-error-new" role="alert">
                <span>⚠️ {error}</span>
              </div>
            )}

            <button type="submit" className="login-btn-new" disabled={cargando}>
              {cargando ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  <span>Validando credenciales…</span>
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Selector Ergonómico de Cuentas Demo (Ley de Fitts + Miller) */}
          <div className="login-demo-new">
            <div className="login-demo-title">
              Cuentas de demostración · Clic para rellenar
            </div>
            <div className="login-demo-grid">
              {DEMO.map(u => (
                <button
                  key={u.usuario}
                  type="button"
                  className="login-demo-card"
                  onClick={() => autoFill(u)}
                  title={`Cargar credenciales de ${u.nombre}`}
                >
                  <div className="login-demo-av" style={{ background: u.color }}>
                    {u.ini}
                  </div>
                  <div className="login-demo-info">
                    <b>{u.nombre}</b>
                    <span>{u.rol} · {u.usuario}</span>
                  </div>
                  <span className="login-demo-fill-btn">Usar cuenta</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
