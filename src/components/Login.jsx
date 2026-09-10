import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const DEMO = [
  { usuario: 'dhuerta',   clave: 'jefe123', nombre: 'Dennys Huerta',   rol: 'Jefe de Distribución',       ini: 'DH', color: '#E1252B' },
  { usuario: 'asistente', clave: 'dist123', nombre: 'Lesli Pomalaya',  rol: 'Asistente de Distribución',  ini: 'LP', color: '#2563EB' },
  { usuario: 'admin.ti',  clave: 'ti2026',  nombre: 'Área de TI',       rol: 'Administrador TI',           ini: 'TI', color: '#9333EA' },
]

/**
 * Pantalla de inicio de sesión — RNF-02.
 * Los módulos y acciones disponibles dependen del rol con que se ingrese.
 */
export default function Login() {
  const { login } = useAuth()
  const [usuario,   setUsuario]   = useState('')
  const [clave,     setClave]     = useState('')
  const [error,     setError]     = useState('')
  const [cargando,  setCargando]  = useState(false)
  const [verClave,  setVerClave]  = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!usuario.trim() || !clave) { setError('Completa los dos campos.'); return }
    setCargando(true)
    setError('')
    setTimeout(() => {
      const ok = login(usuario.trim(), clave)
      if (!ok) setError('Usuario o contraseña incorrectos. Revisa tus credenciales.')
      setCargando(false)
    }, 650)
  }

  const autoFill = (u) => { setUsuario(u.usuario); setClave(u.clave); setError('') }

  return (
    <div className="login-bg">
      <div className="login-grid" />

      <div className="login-box">
        {/* Marca */}
        <div className="login-brand">
          <svg width="40" height="40" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 3 30 29H2L16 3z" fill="#E1252B" />
            <path d="M16 12l6 12h-12l6-12z" fill="#0A1122" />
          </svg>
          <div>
            <div className="login-brand-name">ALFA DISTRIBUIDORES S.A.</div>
            <div className="login-brand-sub">SIPRD · Sistema Inteligente de Planificación de Rutas</div>
          </div>
        </div>

        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-sub">Ingresa con tus credenciales para acceder al sistema.</p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="login-field">
            <label htmlFor="l-user">Usuario</label>
            <input
              id="l-user"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setError('') }}
              placeholder="usuario.red"
            />
          </div>
          <div className="login-field">
            <label htmlFor="l-pass">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="l-pass"
                type={verClave ? 'text' : 'password'}
                autoComplete="current-password"
                value={clave}
                onChange={e => { setClave(e.target.value); setError('') }}
                placeholder="••••••••"
                style={{ width: '100%', paddingRight: 40 }}
              />
              <button type="button" onClick={() => setVerClave(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8', fontSize: 15 }}>
                {verClave ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="login-btn" disabled={cargando}>
            {cargando
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span className="login-spinner" />Verificando…</span>
              : 'Ingresar al sistema'}
          </button>
        </form>

        {/* Usuarios de demostración */}
        <div className="login-demo">
          <div className="login-demo-title">Usuarios de demostración — clic para autocompletar</div>
          {DEMO.map(u => (
            <button key={u.usuario} type="button" className="login-demo-item" onClick={() => autoFill(u)}>
              <div className="login-demo-av" style={{ background: u.color }}>{u.ini}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="login-demo-nombre">{u.nombre}</div>
                <div className="login-demo-rol">{u.rol}</div>
              </div>
              <div className="login-demo-cred">{u.usuario} / {u.clave}</div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 10.5, color: '#cbd5e1', marginTop: 20 }}>
          Alfa Distribuidores S.A. · Curso Integrador II · SIPRD v0.1
        </div>
      </div>
    </div>
  )
}
