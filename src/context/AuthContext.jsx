import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { USUARIOS } from '../data/mockUsuarios.js'

export { USUARIOS }

// ── Permisos por rol (RNF-02) ─────────────────────────────────
// Jefe: operación, cuentas operativas y consulta financiera.
// Asistente: planificación, reparto y maestros.
// Administración: cuentas y auditoría. Tesorería: contraste de cobros.
export const PERMISOS = {
  jefe:          ['inicio', 'algoritmo', 'rutas', 'incidencias', 'config', 'registros', 'usuarios', 'cobranzas'],
  asistente:     ['inicio', 'algoritmo', 'rutas', 'incidencias', 'config'],
  ti:            ['usuarios', 'registros'],
  administrador: ['usuarios', 'registros', 'cobranzas'],
  repartidor:    ['rutas'],
  tesoreria:     ['cobranzas'],
}

// Jefe y Asistente confirman propuestas, según los requisitos actualizados.
export const PUEDE_APROBAR = {
  jefe: true,
  asistente: true,
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
      return stored && localStorage.getItem('siprd_access_token') ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (user, clave) => {
    let res
    try {
      res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: user.trim(), clave }),
        signal: AbortSignal.timeout(15000),
      })
    } catch {
      throw new Error('No se puede conectar con el servidor. Ejecuta iniciar_sistema.bat y vuelve a intentar.')
    }
    if (res.status === 401) return false
    if (res.status === 403) {
      throw new Error('Tu cuenta está desactivada. Comunícate con el administrador.')
    }
    if (!res.ok) {
      throw new Error('El servidor de inicio de sesión no está disponible. Ejecuta iniciar_sistema.bat y vuelve a intentar.')
    }
    let data
    try { data = await res.json() } catch {
      throw new Error('El servidor devolvió una respuesta inválida. Reinicia el sistema.')
    }
    if (!data.access_token || !data.usuario) {
      throw new Error('El servidor no pudo completar el inicio de sesión. Reinicia el sistema.')
    }
    localStorage.setItem('siprd_access_token', data.access_token)
    localStorage.setItem('siprd_session', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return true
  }, [])

  const logout = useCallback(() => {
    // TODO BACKEND: POST /api/auth/logout (si aplica)
    setUsuario(null)
    try {
      localStorage.removeItem('siprd_session')
      localStorage.removeItem('siprd_access_token')
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
