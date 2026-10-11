import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { apiFetch } from '../api/cliente.js'
import {tienePermiso,perfilSeguro} from '../lib/permisos'


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

  const adaptar = u => {
    const rol = {ASISTENTE_DISTRIBUCION:'asistente',JEFE_DISTRIBUCION:'jefe',ASISTENTE:'asistente',JEFE:'jefe',ADMINISTRADOR:'ti',TESORERIA:'tesoreria',REPARTIDOR:'repartidor'}[u.rol] || u.rol.toLowerCase()
    return {...perfilSeguro(u),rol,rol_db:u.rol,titulo:{asistente:'Asistente de Distribución',jefe:'Jefe de Distribución',ti:'Administrador',tesoreria:'Tesorería',repartidor:'Repartidor'}[rol],iniciales:u.nombre.split(' ').slice(0,2).map(x=>x[0]).join('')}
  }
  const login = useCallback(async (user, clave) => {
    try {
      const data=await apiFetch('/auth/login',{method:'POST',body:JSON.stringify({usuario:user,clave})})
      localStorage.setItem('siprd_access_token',data.access_token)
      const u=adaptar(data.usuario);setUsuario(prev=>JSON.stringify(prev)===JSON.stringify(u)?prev:u);localStorage.setItem('siprd_session',JSON.stringify(u));return true
    } catch {return false}
  }, [])
  useEffect(()=>{
    const validar=async()=>{if(!localStorage.getItem('siprd_access_token')){setUsuario(null);return}try{const u=adaptar(await apiFetch('/auth/yo'));setUsuario(prev=>JSON.stringify(prev)===JSON.stringify(u)?prev:u);localStorage.setItem('siprd_session',JSON.stringify(u))}catch{setUsuario(null)}}
    validar();const t=setInterval(validar,45000)
    const invalidar=()=>setUsuario(null)
    window.addEventListener('siprd:sesion-expirada',invalidar)
    return()=>{clearInterval(t);window.removeEventListener('siprd:sesion-expirada',invalidar)}
  }, [])

  const logout = useCallback(() => {
    apiFetch('/auth/salir',{method:'POST'}).catch(()=>{})
    localStorage.removeItem('siprd_access_token')
    setUsuario(null)
    try {
      localStorage.removeItem('siprd_session')
    } catch {
      // Ignorar fallos de cuota o modo incógnito restringido
    }
  }, [])

  const puede = useCallback(
    (modulo) => tienePermiso(usuario,modulo),
    [usuario]
  )

  const puedeAprobar = useCallback(
    () => tienePermiso(usuario,'confirmar'),
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
