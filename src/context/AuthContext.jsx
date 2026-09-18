import { createContext, useContext, useState, useCallback, useMemo } from 'react'

// ── Usuarios del sistema ──────────────────────────────────────
export const USUARIOS = [
  {
    id: 'u1', usuario: 'dhuerta', clave: 'jefe123',
    nombre: 'Dennys Huerta', iniciales: 'DH',
    titulo: 'Jefe de Distribución', rol: 'jefe',
  },
  {
    id: 'u2', usuario: 'asistente', clave: 'dist123',
    nombre: 'Lesli Pomalaya', iniciales: 'LP',
    titulo: 'Asistente de Distribución', rol: 'asistente',
  },
  {
    id: 'u3', usuario: 'admin.ti', clave: 'ti2026',
    nombre: 'Área de TI', iniciales: 'TI',
    titulo: 'Administrador TI', rol: 'ti',
  },
]

// ── Permisos por rol (RNF-02) ─────────────────────────────────
// jefe:      aprueba rutas, accede a todo
// asistente: arma rutas, valida pagos, NO aprueba
// ti:        solo configuración y registros de auditoría
export const PERMISOS = {
  jefe:      ['inicio', 'algoritmo', 'rutas', 'cobranzas', 'config', 'registros'],
  asistente: ['inicio', 'algoritmo', 'rutas', 'cobranzas'],
  ti:        ['config', 'registros'],
}

// Solo el Jefe / Coordinador puede aprobar rutas (RF-09)
export const PUEDE_APROBAR = { jefe: true, asistente: false, ti: false }

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

  const login = useCallback((user, clave) => {
    // TODO BACKEND: POST /api/auth/login
    // Validar credenciales contra el backend (JWT, Active Directory, etc.)
    const u = USUARIOS.find(u => u.usuario === user && u.clave === clave)
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
