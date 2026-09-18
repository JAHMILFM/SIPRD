import { useState, useRef, useEffect } from 'react'
import { RUTAS_ACTIVAS } from '../data/mockRutas'
import { useAuth } from '../context/AuthContext'
import { useAudit } from '../context/AuditContext'
import { useToast } from '../context/ToastContext'

/**
 * Módulo Rutas — gestión en vivo.
 *
 * Incluye soporte para Deshacer (Heurística #3), filtrado de paradas
 * y confirmación visual de sincronización en tiempo real (Heurística #1).
 */

const ESTADO_CHIP = {
  entregado: { label: 'Entregado',  clase: 'c-gn', icon: '✓' },
  en_camino: { label: 'En camino', clase: 'c-md', icon: '🚚' },
  pendiente: { label: 'Pendiente', clase: 'c-lo', icon: '⏳' },
  bloqueado: { label: 'Bloqueado', clase: 'c-hi', icon: '🔒' },
}

function chipEstado(estado, bloqueado) {
  const key = bloqueado ? 'bloqueado' : estado
  const { label, clase, icon } = ESTADO_CHIP[key] ?? { label: estado, clase: 'c-lo', icon: '▫️' }
  return (
    <span className={`chip ${clase}`}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  )
}

export default function Rutas() {
  const { usuario } = useAuth()
  const { log }     = useAudit()
  const { toast }   = useToast()

  const recalcTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current)
    }
  }, [])

  const [rutas, setRutas] = useState(() =>
    RUTAS_ACTIVAS.map(r => ({ ...r, paradas: r.paradas.map(p => ({ ...p })) }))
  )
  const [rutaActiva, setRutaActiva] = useState(() => rutas[0]?.id ?? 'R1')
  const [guardado, setGuardado]     = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos' | 'pendiente' | 'en_camino' | 'entregado'

  const ruta = rutas.find(r => r.id === rutaActiva) ?? rutas[0]

  // ── helpers con soporte de Deshacer (Heurística #3) ───────────
  const mutarRuta = (fn) => {
    setRutas(prev =>
      prev.map(r => r.id === rutaActiva ? { ...r, paradas: fn(r.paradas) } : r)
    )
    setGuardado(false)
  }

  const subir = (paradaId) => {
    const estadoPrevio = [...ruta.paradas]
    let logP = null
    let oldPos = 0
    let newPos = 0

    mutarRuta(ps => {
      const idx = ps.findIndex(p => p.id === paradaId)
      // No mover si es primera o si la parada anterior ya fue entregada
      if (idx <= 0 || ps[idx - 1].estado === 'entregado') return ps
      logP = ps[idx]
      oldPos = idx + 1
      newPos = idx
      const a = [...ps];
      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]
      return a.map((p, i) => ({ ...p, orden: i + 1 }))
    })

    if (logP) {
      log(usuario, 'Rutas', 'Reordenó parada (subió)', `${logP.cliente} · ${rutaActiva}`)
      toast.info(`Parada #${oldPos} (${logP.cliente}) movida a posición #${newPos}`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            mutarRuta(() => estadoPrevio)
            toast.success('Reordenamiento revertido.')
          }
        }
      })
    }
  }

  const bajar = (paradaId) => {
    const estadoPrevio = [...ruta.paradas]
    let logP = null
    let oldPos = 0
    let newPos = 0

    mutarRuta(ps => {
      const idx = ps.findIndex(p => p.id === paradaId)
      // No mover si es la última o si la parada posterior está bloqueada/entregada
      if (idx < 0 || idx >= ps.length - 1 || ps[idx + 1].estado === 'entregado') return ps
      logP = ps[idx]
      oldPos = idx + 1
      newPos = idx + 2
      const a = [...ps];
      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]
      return a.map((p, i) => ({ ...p, orden: i + 1 }))
    })

    if (logP) {
      log(usuario, 'Rutas', 'Reordenó parada (bajó)', `${logP.cliente} · ${rutaActiva}`)
      toast.info(`Parada #${oldPos} (${logP.cliente}) movida a posición #${newPos}`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            mutarRuta(() => estadoPrevio)
            toast.success('Reordenamiento revertido.')
          }
        }
      })
    }
  }

  const toggleBloqueo = (id) => {
    let paradaMod = null
    let bloqueadoPrev = false

    mutarRuta(ps => ps.map(p => {
      if (p.id === id) {
        paradaMod = p
        bloqueadoPrev = p.bloqueado
        return { ...p, bloqueado: !p.bloqueado }
      }
      return p
    }))

    if (paradaMod) {
      const nuevoEstado = !bloqueadoPrev
      log(usuario, 'Rutas', nuevoEstado ? 'Bloqueó parada' : 'Desbloqueó parada', `${paradaMod.cliente} · ${rutaActiva}`)
      toast.warning(
        nuevoEstado
          ? `Parada de ${paradaMod.cliente} bloqueada para el repartidor.`
          : `Parada de ${paradaMod.cliente} desbloqueada.`,
        {
          duration: 5000,
          action: {
            label: 'Deshacer',
            onClick: () => {
              mutarRuta(ps => ps.map(p => p.id === id ? { ...p, bloqueado: bloqueadoPrev } : p))
              toast.info('Cambio de bloqueo revertido.')
            }
          }
        }
      )
    }
  }

  const guardar = () => {
    setGuardado(true)
    log(usuario, 'Rutas', 'Guardó cambios de ruta', `Ruta ${rutaActiva} sincronizada con App de Distribución`)
    toast.success(`Ruta ${rutaActiva} sincronizada con éxito con la App de los repartidores.`)
  }

  const recalcularPendientes = () => {
    toast.info('Recalculando secuencia óptima para las paradas pendientes…', { duration: 1500 })
    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current)
    recalcTimerRef.current = setTimeout(() => {
      toast.success('Secuencia de paradas pendientes optimizada respetando las entregas realizadas.')
    }, 1500)
  }

  // ── Métricas y filtrado ──────────────────────────────────────
  const ent = ruta.paradas.filter(p => p.estado === 'entregado').length
  const enc = ruta.paradas.filter(p => p.estado === 'en_camino').length
  const pen = ruta.paradas.filter(p => p.estado === 'pendiente').length
  const pct = ruta.paradas.length ? Math.round((ent / ruta.paradas.length) * 100) : 0

  const paradasVisibles = ruta.paradas.filter(p => {
    if (filtroEstado === 'todos') return true
    return p.estado === filtroEstado
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Selector de rutas con affordances visuales claros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {rutas.map(r => {
          const entR  = r.paradas.filter(p => p.estado === 'entregado').length
          const totR  = r.paradas.length
          const pctR  = Math.round((entR / totR) * 100)
          const activ = r.id === rutaActiva
          return (
            <button
              key={r.id}
              onClick={() => setRutaActiva(r.id)}
              style={{
                background: activ ? r.color : '#fff',
                border: `2px solid ${activ ? r.color : '#e2e8f0'}`,
                borderRadius: 10,
                padding: '11px 13px',
                textAlign: 'left',
                color: activ ? '#fff' : '#0f172a',
                transition: 'all .15s',
                cursor: 'pointer',
                boxShadow: activ ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              }}
              aria-pressed={activ}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, opacity: activ ? .9 : .6, marginBottom: 4 }}>
                {r.id} · {r.vehiculo.placa}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{r.vehiculo.conductor}</div>
              <div style={{ fontSize: 11, opacity: .85 }}>{r.vehiculo.marca}</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 3, background: activ ? 'rgba(255,255,255,.3)' : '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pctR}%`, background: activ ? '#fff' : r.color, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10.5, marginTop: 4, opacity: .85 }}>{entR}/{totR} entregas · {pctR}%</div>
            </button>
          )
        })}
      </div>

      {/* Panel principal de la ruta */}
      <div className="card">
        {/* Cabecera */}
        <div className="ch">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="rt" style={{ background: ruta.color, fontSize: 12 }}>{ruta.id}</span>
              {ruta.vehiculo.conductor}
              <span style={{ fontWeight: 400, color: '#64748b', fontSize: 12 }}>— {ruta.vehiculo.placa} {ruta.vehiculo.marca}</span>
            </h3>
            <p>Salida: {ruta.horaInicio} · {ruta.paradas.length} paradas · Reordena o bloquea paradas; los cambios se sincronizan en vivo.</p>
          </div>
          <div className="btns">
            <button
              type="button"
              className={`btn ${guardado ? 'btn-secondary' : 'btn-primary'}`}
              onClick={guardar}
            >
              {guardado ? '✓ Cambios Sincronizados' : '💾 Guardar y Sincronizar'}
            </button>
          </div>
        </div>

        {/* KPIs de la ruta */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e6e9ef', flexWrap: 'wrap' }}>
          {[['Entregados', ent, '#16A34A'], ['En camino', enc, '#d97706'], ['Pendientes', pen, '#64748b']].map(([l, n, c]) => (
            <div key={l} style={{ flex: '1 1 120px', padding: '12px 18px', borderRight: '1px solid #f1f4f8' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: .5, marginBottom: 2 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{n}</div>
            </div>
          ))}
          <div style={{ flex: '1 1 140px', padding: '12px 18px' }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: .5, marginBottom: 2 }}>PROGRESO</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563EB,#16A34A)', borderRadius: 4 }} />
              </div>
              <strong style={{ fontSize: 14, color: '#2563EB' }}>{pct}%</strong>
            </div>
          </div>
        </div>

        {/* Filtros de paradas (Heurística #6) */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', background: '#fafbfc' }}>
          {[
            ['todos', 'Todas las paradas'],
            ['pendiente', 'Pendientes'],
            ['en_camino', 'En camino'],
            ['entregado', 'Entregadas'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFiltroEstado(k)}
              style={{
                background: filtroEstado === k ? '#ffffff' : 'transparent',
                border: filtroEstado === k ? '1px solid #cbd5e1' : '1px solid transparent',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: filtroEstado === k ? 700 : 500,
                color: filtroEstado === k ? '#0f172a' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {label} ({k === 'todos' ? ruta.paradas.length : ruta.paradas.filter(p => p.estado === k).length})
            </button>
          ))}
        </div>

        {/* Tabla de paradas */}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>#</th>
                <th>CLIENTE</th>
                <th>DIRECCIÓN</th>
                <th>VENTANA</th>
                <th className="num">BULTOS</th>
                <th>ESTADO</th>
                <th style={{ width: 140, textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {paradasVisibles.map((p) => {
                const bloq = p.bloqueado
                const inmutable = p.estado === 'entregado'
                const realIdx = ruta.paradas.findIndex(item => item.id === p.id)
                const canSubir = realIdx > 0 && ruta.paradas[realIdx - 1]?.estado !== 'entregado'
                const canBajar = realIdx >= 0 && realIdx < ruta.paradas.length - 1 && ruta.paradas[realIdx + 1]?.estado !== 'entregado'

                return (
                  <tr key={p.id} style={{ opacity: inmutable ? .65 : 1, background: bloq ? '#fff7f7' : undefined }}>
                    <td style={{ fontWeight: 800, color: ruta.color, textAlign: 'center', fontSize: 13 }}>{p.orden}</td>
                    <td className="cli">
                      <b>{p.cliente}</b>
                      <i style={{ color: p.prioridad === 'Alta' ? '#b91c1c' : undefined }}>
                        {p.prioridad === 'Alta' ? '🔥 Alta prioridad' : p.prioridad}
                      </i>
                    </td>
                    <td className="adr">{p.dir}</td>
                    <td className="win">{p.ventana}</td>
                    <td className="num">{p.bultos}</td>
                    <td>
                      {chipEstado(p.estado, bloq)}
                      {p.horaReal && <span style={{ display: 'block', fontSize: 10, color: '#64748b', marginTop: 2 }}>{p.horaReal}</span>}
                    </td>
                    <td>
                      {!inmutable && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            type="button"
                            title={canSubir ? `Mover parada de ${p.cliente} hacia arriba` : 'No se puede subir más'}
                            aria-label={`Subir parada de ${p.cliente}`}
                            disabled={!canSubir}
                            onClick={() => subir(p.id)}
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: '1px solid #cbd5e1', background: '#fff',
                              fontSize: 13, cursor: canSubir ? 'pointer' : 'not-allowed', display: 'grid', placeItems: 'center'
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            title={canBajar ? `Mover parada de ${p.cliente} hacia abajo` : 'No se puede bajar más'}
                            aria-label={`Bajar parada de ${p.cliente}`}
                            disabled={!canBajar}
                            onClick={() => bajar(p.id)}
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: '1px solid #cbd5e1', background: '#fff',
                              fontSize: 13, cursor: canBajar ? 'pointer' : 'not-allowed', display: 'grid', placeItems: 'center'
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            title={bloq ? `Desbloquear entrega de ${p.cliente}` : `Bloquear entrega de ${p.cliente}`}
                            aria-label={bloq ? 'Desbloquear parada' : 'Bloquear parada'}
                            onClick={() => toggleBloqueo(p.id)}
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: `1px solid ${bloq ? '#fca5a5' : '#cbd5e1'}`,
                              background: bloq ? '#fee2e2' : '#fff',
                              fontSize: 12, cursor: 'pointer', display: 'grid', placeItems: 'center'
                            }}
                          >
                            {bloq ? '🔓' : '🔒'}
                          </button>
                        </div>
                      )}
                      {inmutable && (
                        <span style={{ display: 'block', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 500 }}>
                          Entregado
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Nota de recálculo */}
        <div className="foot">
          <span>El recálculo respeta las paradas ya entregadas · Motor heurístico CVRPTW</span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={recalcularPendientes}
          >
            ↻ Recalcular pendientes
          </button>
        </div>
      </div>

      {/* Monitoreo GPS simulado */}
      <div className="card">
        <div className="ch">
          <div>
            <h3>Monitoreo GPS en tiempo real</h3>
            <p>Posición simulada · integración con App de Distribución vía WebSocket</p>
          </div>
        </div>
        <div style={{ position: 'relative', height: 240, background: 'linear-gradient(135deg,#0a1122,#1e293b)', borderRadius: '0 0 12px 12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          {rutas.map((r, ri) => (
            r.paradas.filter(p => p.estado === 'entregado' || p.estado === 'en_camino').map((p, pi) => (
              <div key={p.id} style={{ position: 'absolute', left: `${15 + ri * 18 + pi * 3}%`, top: `${20 + ri * 15 + pi * 8}%` }}>
                <div style={{ width: p.estado === 'en_camino' ? 14 : 9, height: p.estado === 'en_camino' ? 14 : 9, borderRadius: '50%', background: p.estado === 'en_camino' ? r.color : r.color + '99', border: p.estado === 'en_camino' ? `2px solid #fff` : 'none', boxShadow: p.estado === 'en_camino' ? `0 0 14px ${r.color}` : 'none', transition: 'all .3s' }} />
              </div>
            ))
          ))}
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center', zIndex: 1, padding: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
            <strong style={{ color: '#fff' }}>Monitoreo Activo de Flota en Ruta</strong><br />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Visualización interactiva compatible con OpenStreetMap y OSRM</span>
          </div>
        </div>
      </div>

    </div>
  )
}
