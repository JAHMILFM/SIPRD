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
    id_auditoria: 1001,
    id_usuario: 1,
    entidad: 'ejecuciones_optimizacion',
    id_entidad: 1,
    accion_db: 'REOPTIMIZAR',
    usuario: 'Dennys Huerta',
    rolUsuario: 'jefe',
    modulo: 'Algoritmo',
    accion: 'Cálculo de Matriz OSRM',
    detalle: 'Matriz de distancias y tiempos actualizada para 63 pedidos en Almacén Lurín',
    fecha_hora: '2026-08-27T08:45:10Z',
    fecha: '27/08/2026',
    hora: '08:45:10',
  },
  {
    id: 'log-seed-2',
    id_auditoria: 1002,
    id_usuario: 2,
    entidad: 'rutas',
    id_entidad: 1,
    accion_db: 'PUBLICAR',
    usuario: 'Lesli Pomalaya',
    rolUsuario: 'asistente',
    modulo: 'Rutas',
    accion: 'Despacho inicial de flota',
    detalle: 'Rutas R1, R2, R3, R4 y R5 habilitadas para reparto matutino',
    fecha_hora: '2026-08-27T08:15:32Z',
    fecha: '27/08/2026',
    hora: '08:15:32',
  },
  {
    id: 'log-seed-3',
    id_auditoria: 1003,
    id_usuario: 3,
    entidad: 'reglas_cliente',
    id_entidad: 12,
    accion_db: 'ACTUALIZAR',
    usuario: 'Área de TI',
    rolUsuario: 'ti',
    modulo: 'Configuración',
    accion: 'Sincronización de reglas',
    detalle: '12 reglas de ventanas horarias y días de atención verificadas',
    fecha_hora: '2026-08-27T07:50:00Z',
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
   * @param {object} extra    — campos opcionales del esquema DB (entidad, accion_db, id_entidad, valor_anterior, valor_nuevo)
   */
  const log = useCallback((usuario, modulo, accion, detalle = '', extra = {}) => {
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    // Mapear a catálogo formal de la base de datos (CHECK auditoria_accion_check: CREAR, ACTUALIZAR, ELIMINAR, APROBAR, PUBLICAR, REOPTIMIZAR)
    const accionNormalizada = extra.accion_db || (() => {
      const a = (accion || '').toUpperCase()
      if (a.includes('APROB')) return 'APROBAR'
      if (a.includes('PUBLIC') || a.includes('DESPACH')) return 'PUBLICAR'
      if (a.includes('REOPT') || a.includes('RECALCUL')) return 'REOPTIMIZAR'
      if (a.includes('ELIMIN') || a.includes('BORR')) return 'ELIMINAR'
      if (a.includes('CREA') || a.includes('NUEV') || a.includes('AGREG')) return 'CREAR'
      return 'ACTUALIZAR'
    })()

    const entidadNormalizada = extra.entidad || (() => {
      const m = (modulo || '').toLowerCase()
      if (m.includes('ruta')) return 'rutas'
      if (m.includes('config') || m.includes('vehicul')) return 'vehiculos'
      if (m.includes('algo')) return 'ejecuciones_optimizacion'
      if (m.includes('regla')) return 'reglas_cliente'
      return 'sistema'
    })()

    const entry = {
      id:          `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      id_auditoria: Date.now(),
      id_usuario:  usuario?.id_usuario ?? 1,
      entidad:     entidadNormalizada,
      id_entidad:  extra.id_entidad ?? 1,
      accion_db:   accionNormalizada,
      valor_anterior: extra.valor_anterior ?? null,
      valor_nuevo: extra.valor_nuevo ?? null,
      fecha_hora:  ahora.toISOString(),
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
    // TODO BACKEND: POST /api/audit (Persistencia relacional en siprd.auditoria)
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
