import { createContext, useContext, useState } from 'react'

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
    try { return JSON.parse(localStorage.getItem('siprd_session')) } catch { return null }
  })

  const login = (user, clave) => {
    // TODO BACKEND: POST /api/auth/login
    // Validar credenciales contra el backend (JWT, Active Directory, etc.)
    const u = USUARIOS.find(u => u.usuario === user && u.clave === clave)
    if (!u) return false
    setUsuario(u)
    localStorage.setItem('siprd_session', JSON.stringify(u))
    return true
  }

  const logout = () => {
    // TODO BACKEND: POST /api/auth/logout (si aplica)
    setUsuario(null)
    localStorage.removeItem('siprd_session')
  }

  const puede       = (modulo) => usuario ? (PERMISOS[usuario.rol] ?? []).includes(modulo) : false
  const puedeAprobar = ()      => usuario ? (PUEDE_APROBAR[usuario.rol] ?? false) : false

  return (
    <AuthContext.Provider value={{ usuario, login, logout, puede, puedeAprobar }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
