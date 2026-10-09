import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { USUARIOS } from '../data/mockUsuarios.js'

export { USUARIOS }

// ── Permisos por rol (RNF-02) ─────────────────────────────────
// jefe:      aprueba rutas, accede a todo
// asistente: arma rutas, valida pagos, NO aprueba
// ti:        solo configuración y registros de auditoría
export const PERMISOS = {
  jefe:          ['inicio', 'algoritmo', 'rutas', 'cobranzas', 'config', 'registros'],
  asistente:     ['inicio', 'algoritmo', 'rutas', 'cobranzas'],
  ti:            ['config', 'registros'],
  administrador: ['config', 'registros'],
  repartidor:    ['rutas'],
  tesoreria:     ['cobranzas', 'registros'],
}

// Solo el Jefe / Coordinador puede aprobar rutas (RF-09 / ck_ruta_aprobacion)
export const PUEDE_APROBAR = {
  jefe: true,
  asistente: false,
  ti: false,
  administrador: false,
  repartidor: false,
  tesoreria: false,
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const stored = localStorage.getItem('siprd_session')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (user, clave) => {
    // 1. Intento de autenticación real contra el backend FastAPI
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: user, clave })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.access_token) {
          localStorage.setItem('siprd_access_token', data.access_token)
        }
        if (data.usuario) {
          setUsuario(data.usuario)
          try {
            localStorage.setItem('siprd_session', JSON.stringify(data.usuario))
          } catch {}
          return true
        }
      }
    } catch {
      // Si la API no está disponible en este momento, fallback al catálogo local
    }

    // 2. Fallback local / offline
    const u = USUARIOS.find(u => (u.usuario === user || u.correo === user) && u.clave === clave)
    if (!u) return false

    // Sanitizar credenciales para no persistir contraseña en localStorage
    const { clave: _c, ...usuarioSeguro } = u
    setUsuario(usuarioSeguro)
    try {
      localStorage.setItem('siprd_session', JSON.stringify(usuarioSeguro))
    } catch {
      // Ignorar fallos de cuota o modo incógnito restringido
    }
    return true
  }, [])

  const logout = useCallback(() => {
    // TODO BACKEND: POST /api/auth/logout (si aplica)
    setUsuario(null)
    try {
      localStorage.removeItem('siprd_session')
    } catch {
      // Ignorar fallos de cuota o modo incógnito restringido
    }
  }, [])

  const puede = useCallback(
    (modulo) => (usuario ? (PERMISOS[usuario.rol] ?? []).includes(modulo) : false),
    [usuario]
  )

  const puedeAprobar = useCallback(
    () => (usuario ? (PUEDE_APROBAR[usuario.rol] ?? false) : false),
    [usuario]
  )

  const value = useMemo(
    () => ({ usuario, login, logout, puede, puedeAprobar }),
    [usuario, login, logout, puede, puedeAprobar]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return ctx
}
