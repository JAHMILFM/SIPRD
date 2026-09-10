import { useAudit } from '../context/AuditContext'

const MOD_COLOR = {
  Algoritmo:      '#2563EB',
  Rutas:          '#16A34A',
  Cobranzas:      '#F59E0B',
  'Configuración':'#9333EA',
  Sesión:         '#64748b',
}

const ROL_CHIP = {
  jefe:      ['c-hi', 'Jefe'],
  asistente: ['c-gn', 'Asistente'],
  ti:        ['c-lo', 'TI'],
}

/**
 * Módulo Registros de Auditoría — RF-13 / RNF-09.
 *
 * Muestra todas las operaciones trazables registradas durante la sesión:
 *   - Aprobaciones de rutas (RF-09)
 *   - Cambios en reglas de clientes y vehículos (RF-13)
 *   - Validaciones y rechazos de cobros
 *   - Reordenamientos y bloqueos de paradas
 *
 * Cada entrada incluye: usuario, rol, módulo, acción, detalle, fecha y hora.
 */
export default function Registros() {
  const { registros } = useAudit()

  if (registros.length === 0) {
    return (
      <div className="card">
        <div className="ch">
          <div>
            <h3>Registro de auditoría</h3>
            <p>Trazabilidad de cambios relevantes · RF-13 · RNF-09</p>
          </div>
          <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Los registros persisten durante la sesión activa</div>
        </div>
        <div className="empty" style={{ padding: '60px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <b>Sin operaciones registradas aún</b>
          Las acciones trazables (aprobaciones, cambios en reglas, validaciones de pago, reordenamientos) aparecerán aquí en tiempo real.
        </div>
      </div>
    )
  }

  const modulos = [...new Set(registros.map(r => r.modulo))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12 }}>
        <div className="card" style={{ padding: '13px 16px' }}>
          <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500, marginBottom: 5 }}>Total de operaciones</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: -1 }}>{registros.length}</div>
        </div>
        {modulos.map(m => {
          const color = MOD_COLOR[m] ?? '#64748b'
          return (
            <div key={m} className="card" style={{ padding: '13px 16px' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500, marginBottom: 5 }}>{m}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: -1 }}>
                {registros.filter(r => r.modulo === m).length}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla de registros */}
      <div className="card">
        <div className="ch">
          <div>
            <h3>Operaciones registradas</h3>
            <p>{registros.length} registro{registros.length !== 1 ? 's' : ''} · En producción se persisten en base de datos con firma de integridad</p>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>FECHA</th>
                <th>HORA</th>
                <th>USUARIO</th>
                <th>ROL</th>
                <th>MÓDULO</th>
                <th>ACCIÓN</th>
                <th>DETALLE</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(r => {
                const [rolCls, rolLabel] = ROL_CHIP[r.rolUsuario] ?? ['c-lo', r.rolUsuario]
                const color = MOD_COLOR[r.modulo] ?? '#64748b'
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{r.fecha}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{r.hora}</td>
                    <td style={{ fontWeight: 600, fontSize: 11.5 }}>{r.usuario}</td>
                    <td><span className={`chip ${rolCls}`}>{rolLabel}</span></td>
                    <td>
                      <span style={{ display: 'inline-block', background: color + '18', color, borderRadius: 5, padding: '2px 8px', fontSize: 10.5, fontWeight: 600 }}>
                        {r.modulo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 11.5 }}>{r.accion}</td>
                    <td style={{ color: '#64748b', fontSize: 11, maxWidth: 280 }}>{r.detalle}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="foot">
          <span>RF-13 · RNF-09 — Cada registro incluye usuario, rol, fecha, hora y descripción de la operación</span>
        </div>
      </div>
    </div>
  )
}
