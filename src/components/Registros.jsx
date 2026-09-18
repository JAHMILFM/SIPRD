import { useState, useMemo } from 'react'
import { useAudit } from '../context/AuditContext'
import { useToast } from '../context/ToastContext'

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
 * Muestra las operaciones trazables realizadas durante la sesión.
 * Permite filtrar por módulo, buscar y exportar a CSV para auditoría (Heurística #7).
 */
export default function Registros() {
  const { registros } = useAudit()
  const { toast }     = useToast()
  const [filtroMod, setFiltroMod] = useState('todos')
  const [busca, setBusca]         = useState('')

  const modulos = useMemo(() => [...new Set(registros.map(r => r.modulo))], [registros])

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (filtroMod !== 'todos' && r.modulo !== filtroMod) return false
      if (busca) {
        const q = busca.toLowerCase()
        return (
          r.usuario.toLowerCase().includes(q) ||
          r.accion.toLowerCase().includes(q) ||
          (r.detalle && r.detalle.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [registros, filtroMod, busca])

  const exportarAuditCSV = () => {
    try {
      const headers = ['ID', 'Fecha', 'Hora', 'Usuario', 'Rol', 'Modulo', 'Accion', 'Detalle']
      const rows = registrosFiltrados.map(r => [
        `"#${r.id}"`,
        `"${r.fecha}"`,
        `"${r.hora}"`,
        `"${r.usuario}"`,
        r.rolUsuario,
        `"${r.modulo}"`,
        `"${r.accion}"`,
        `"${r.detalle?.replace(/"/g, '""') || ''}"`
      ])

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `log_auditoria_siprd_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Log de auditoría exportado a CSV (${registrosFiltrados.length} registros).`)
    } catch {
      toast.error('No se pudo exportar el registro de auditoría.')
    }
  }

  if (registros.length === 0) {
    return (
      <div className="card">
        <div className="ch">
          <div>
            <h3>Registro de auditoría</h3>
            <p>Trazabilidad de cambios relevantes · RF-13 · RNF-09</p>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Los registros persisten durante la sesión activa</div>
        </div>
        <div className="empty" style={{ padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <b>Sin operaciones registradas aún</b>
          <p style={{ maxWidth: 460, margin: '6px auto 0', color: '#64748b' }}>
            Las acciones trazables (aprobaciones de rutas, cambios en reglas, validaciones de pago, reordenamientos) se grabarán aquí automáticamente en tiempo real.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Total de operaciones</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: -1 }}>{registros.length}</div>
        </div>
        {modulos.map(m => {
          const color = MOD_COLOR[m] ?? '#64748b'
          return (
            <div key={m} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{m}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: -1 }}>
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
            <h3>Operaciones registradas en sesión</h3>
            <p>{registrosFiltrados.length} evento{registrosFiltrados.length !== 1 ? 's' : ''} encontrados · Auditado bajo estándar RF-13 / RNF-09</p>
          </div>
          <div className="btns">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportarAuditCSV}
              title="Descargar log de auditoría en formato CSV"
            >
              <span>📥</span>
              <span>Exportar Auditoría CSV</span>
            </button>
          </div>
        </div>

        {/* Filtros + búsqueda */}
        <div style={{ padding: '10px 16px', display: 'flex', gap: 10, borderBottom: '1px solid #e6e9ef', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs" style={{ padding: 0, border: 0, marginRight: 4 }}>
            <button
              className={filtroMod === 'todos' ? 'on' : ''}
              onClick={() => setFiltroMod('todos')}
              style={{ background: 'none', border: 0, borderBottom: `2px solid ${filtroMod === 'todos' ? 'var(--blue)' : 'transparent'}`, padding: '6px 12px', fontSize: 12, fontWeight: filtroMod === 'todos' ? 700 : 500, color: filtroMod === 'todos' ? 'var(--blue)' : '#64748b', cursor: 'pointer' }}
            >
              Todos ({registros.length})
            </button>
            {modulos.map(m => (
              <button
                key={m}
                className={filtroMod === m ? 'on' : ''}
                onClick={() => setFiltroMod(m)}
                style={{ background: 'none', border: 0, borderBottom: `2px solid ${filtroMod === m ? 'var(--blue)' : 'transparent'}`, padding: '6px 12px', fontSize: 12, fontWeight: filtroMod === m ? 700 : 500, color: filtroMod === m ? 'var(--blue)' : '#64748b', cursor: 'pointer' }}
              >
                {m} ({registros.filter(r => r.modulo === m).length})
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por usuario, acción o detalle…"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 32px 7px 12px', fontSize: 12, fontFamily: 'inherit' }}
              aria-label="Buscar eventos de auditoría"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: '#64748b', fontSize: 13 }}
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
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
              {registrosFiltrados.map(r => {
                const [rolCls, rolLabel] = ROL_CHIP[r.rolUsuario] ?? ['c-lo', r.rolUsuario]
                const color = MOD_COLOR[r.modulo] ?? '#64748b'
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{r.fecha}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{r.hora}</td>
                    <td style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink)' }}>{r.usuario}</td>
                    <td><span className={`chip ${rolCls}`}>{rolLabel}</span></td>
                    <td>
                      <span style={{ display: 'inline-block', background: color + '15', color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {r.modulo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{r.accion}</td>
                    <td style={{ color: '#475569', fontSize: 11.5, maxWidth: 300 }}>{r.detalle}</td>
                  </tr>
                )
              })}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    <b>No hay eventos en este filtro</b>
                    <p style={{ marginTop: 4, color: '#64748b' }}>Prueba con otro término de búsqueda o selecciona otro módulo.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="foot">
          <span>RF-13 · RNF-09 — Trazabilidad inmutable de usuario, rol, fecha, hora y descripción operativa</span>
        </div>
      </div>
    </div>
  )
}
