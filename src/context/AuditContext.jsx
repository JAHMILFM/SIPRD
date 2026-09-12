import { createContext, useContext, useState, useCallback, useMemo } from 'react'

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

const MAX_AUDIT_LOGS = 500

const SEED_REGISTROS = [
  {
    id: 'log-seed-1',
    usuario: 'Dennys Huerta',
    rolUsuario: 'jefe',
    modulo: 'Algoritmo',
    accion: 'Cálculo de Matriz OSRM',
    detalle: 'Matriz de distancias y tiempos actualizada para 63 pedidos en Almacén Lurín',
    fecha: '27/08/2026',
    hora: '08:45:10',
  },
  {
    id: 'log-seed-2',
    usuario: 'Lesli Pomalaya',
    rolUsuario: 'asistente',
    modulo: 'Rutas',
    accion: 'Despacho inicial de flota',
    detalle: 'Rutas R1, R2, R3, R4 y R5 habilitadas para reparto matutino',
    fecha: '27/08/2026',
    hora: '08:15:32',
  },
  {
    id: 'log-seed-3',
    usuario: 'Área de TI',
    rolUsuario: 'ti',
    modulo: 'Configuración',
    accion: 'Sincronización de reglas',
    detalle: '12 reglas de ventanas horarias y días de atención verificadas',
    fecha: '27/08/2026',
    hora: '07:50:00',
  },
]

export function AuditProvider({ children }) {
  const [registros, setRegistros] = useState(() => [...SEED_REGISTROS])

  /**
   * @param {object} usuario  — objeto de usuario de AuthContext
   * @param {string} modulo   — 'Algoritmo' | 'Rutas' | 'Cobranzas' | 'Configuración' | 'Sesión'
   * @param {string} accion   — descripción corta de la operación
   * @param {string} detalle  — contexto adicional (cliente, monto, ruta, etc.)
   */
  const log = useCallback((usuario, modulo, accion, detalle = '') => {
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const entry = {
      id:          `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      usuario:     usuario?.nombre    ?? 'Sistema',
      rolUsuario:  usuario?.rol       ?? '—',
      modulo,
      accion,
      detalle,
      fecha,
      hora,
    }
    // Prevenir memory leaks limitando el crecimiento del array a MAX_AUDIT_LOGS
    setRegistros(prev => [entry, ...prev.slice(0, MAX_AUDIT_LOGS - 1)])
    // TODO BACKEND: POST /api/audit
    // Enviar el entry al backend para persistencia inmutable
  }, [])

  const value = useMemo(() => ({ registros, log }), [registros, log])

  return (
    <AuditContext.Provider value={value}>
      {children}
    </AuditContext.Provider>
  )
}

export const useAudit = () => {
  const ctx = useContext(AuditContext)
  if (!ctx) {
    throw new Error('useAudit debe usarse dentro de un AuditProvider')
  }
  return ctx
}
