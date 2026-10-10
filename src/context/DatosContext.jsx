import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/cliente'
import { useAuth } from './AuthContext'
const DatosContext = createContext(null)
export function DatosProvider({ children }) {
  const { usuario, logout } = useAuth()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const recargar = useCallback(() => setRevision(n => n + 1), [])
  useEffect(() => {
    if (!usuario) { setDatos(null); setError(''); return }
    const controller = new AbortController()
    setError('')
    apiFetch('/datos', { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setDatos(data)
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.status === 401 ? 'Tu sesión venció. Vuelve a iniciar sesión.' : err.message)
    })
    return () => controller.abort()
  }, [usuario, revision])
  if (!usuario) return children
  if (error) return <div role="alert" style={{padding:32}}><p>{error}</p><button onClick={recargar}>Reintentar</button> <button onClick={logout}>Cerrar sesión</button></div>
  if (!datos) return <p role="status" style={{padding:32}}>Cargando datos de SIPRD…</p>
  return <DatosContext.Provider value={{...datos, recargar}}>{children}</DatosContext.Provider>
}
export function useDatos() {
  const value = useContext(DatosContext)
  if (!value) throw new Error('Los datos de SIPRD aún no se han cargado')
  return value
}
