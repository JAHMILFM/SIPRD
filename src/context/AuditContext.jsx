import { createContext, useContext, useState } from 'react'

/**
 * Contexto de auditoría — RF-13 / RNF-09
 *
 * Registra todas las operaciones relevantes con:
 *   usuario, rol, módulo, acción, detalle, fecha y hora.
 *
 * El componente Registros consume este contexto para mostrar el log.
 * En producción cada entrada se persistiría en el backend vía POST /api/audit.
 */

const AuditContext = createContext(null)

export function AuditProvider({ children }) {
  const [registros, setRegistros] = useState([])

  /**
   * @param {object} usuario  — objeto de usuario de AuthContext
   * @param {string} modulo   — 'Algoritmo' | 'Rutas' | 'Cobranzas' | 'Configuración' | 'Sesión'
   * @param {string} accion   — descripción corta de la operación
   * @param {string} detalle  — contexto adicional (cliente, monto, ruta, etc.)
   */
  const log = (usuario, modulo, accion, detalle = '') => {
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const entry = {
      id:          `log-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      usuario:     usuario?.nombre    ?? 'Sistema',
      rolUsuario:  usuario?.rol       ?? '—',
      modulo,
      accion,
      detalle,
      fecha,
      hora,
    }
    setRegistros(prev => [entry, ...prev])
    // TODO BACKEND: POST /api/audit
    // Enviar el entry al backend para persistencia inmutable
  }

  return (
    <AuditContext.Provider value={{ registros, log }}>
      {children}
    </AuditContext.Provider>
  )
}

export const useAudit = () => useContext(AuditContext)
