import { useState, useMemo } from 'react'
import { useDatos } from '../context/DatosContext'

/**
 * Dashboard de inicio.
 *
 * KPIs del día: pedidos, rutas, entregas y estado de flota en tiempo real.
 * Diseñado bajo Heurística #1 (estado del sistema visible) y Ley de Miller (chunking).
 */
export default function Inicio() {
  const { rutas: RUTAS_ACTIVAS } = useDatos()
  const [filtroActividad, setFiltroActividad] = useState('todas')

  // ── métricas calculadas desde las rutas activas ──────────────
  const { totalRutas, totalParadas, entregados, enCamino, pendientes, montoTotal, pct, KPI } = useMemo(() => {
    const totRutas = RUTAS_ACTIVAS.length
    const totParadas = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.length, 0)
    const ent = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.filter(p => p.estado === 'entregado' || p.estado === 'ATENDIDA').length, 0)
    const enc = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.filter(p => p.estado === 'en_camino' || p.estado === 'EN_CAMINO').length, 0)
    const pen = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.filter(p => p.estado === 'pendiente' || p.estado === 'PENDIENTE').length, 0)
    const monto = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.reduce((ss, p) => ss + (p.monto || 0), 0), 0)
    const porcentaje = totParadas > 0 ? Math.round((ent / totParadas) * 100) : 0

    const kpiList = [
      { label: 'Pedidos del día', valor: totParadas, color: '#2563EB', bg: '#dbeafe', icon: '📦', desc: 'Total programado para reparto hoy' },
      { label: 'Entregados', valor: ent, color: '#16A34A', bg: '#dcfce7', icon: '✓', desc: 'Confirmados por cliente y conductor' },
      { label: 'En camino', valor: enc, color: '#d97706', bg: '#fef3c7', icon: '🚚', desc: 'En tránsito hacia el cliente' },
      { label: 'Pendientes', valor: pen, color: '#64748b', bg: '#f1f5f9', icon: '⏳', desc: 'Próximos según secuencia' },
      { label: 'Rutas activas', valor: totRutas, color: '#9333EA', bg: '#f3e8ff', icon: '🗺', desc: 'Vehículos despachados de Lurín' },
      { label: 'Monto en ruta', valor: `S/ ${monto.toLocaleString('es-PE')}`, color: '#0891B2', bg: '#e0f2fe', icon: '💰', desc: 'Total a recaudar en la jornada' },
    ]

    return {
      totalRutas: totRutas,
      totalParadas: totParadas,
      entregados: ent,
      enCamino: enc,
      pendientes: pen,
      montoTotal: monto,
      pct: porcentaje,
      KPI: kpiList
    }
  }, [RUTAS_ACTIVAS])

  // ── actividad reciente ────────────────────────────────────────
  const actividad = useMemo(() => {
    return RUTAS_ACTIVAS.flatMap(r =>
      r.paradas
        .filter(p => p.estado === 'entregado' || p.estado === 'ATENDIDA')
        .map(p => ({ ...p, conductor: r.vehiculo.conductor, ruta: r.id, color: r.color }))
    ).sort((a, b) => String(b.horaReal ?? '').localeCompare(String(a.horaReal ?? '')))
  }, [RUTAS_ACTIVAS])

  const actividadFiltrada = useMemo(() => {
    return filtroActividad === 'todas'
      ? actividad.slice(0, 8)
      : actividad.filter(a => a.ruta === filtroActividad).slice(0, 8)
  }, [actividad, filtroActividad])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* KPI strip (Ley de Miller: 6 tarjetas de alta legibilidad) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
        {KPI.map(k => (
          <div
            key={k.label}
            className="card"
            style={{ padding: '14px 18px', transition: 'transform 0.15s ease' }}
            title={k.desc}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: k.color }}>{k.valor}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{k.desc}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: k.bg, display: 'grid', placeItems: 'center', fontSize: 17, flex: '0 0 auto' }}>
                <span aria-hidden="true">{k.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progreso global del día (Heurística #1) */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Progreso global de entregas de la jornada</div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Monitoreo en tiempo real · Operación iniciada a las 08:00 a.m. desde Almacén Lurín</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#2563EB' }}>{pct}% completado</div>
        </div>

        <div style={{ height: 10, borderRadius: 5, background: '#e2e8f0', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #2563EB 0%, #16A34A 100%)',
              borderRadius: 5,
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            ['Entregados', entregados, '#16A34A', '#dcfce7'],
            ['En camino', enCamino, '#d97706', '#fef3c7'],
            ['Pendientes', pendientes, '#64748b', '#f1f5f9']
          ].map(([lbl, n, c]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />
              <span style={{ color: '#64748b', fontWeight: 500 }}>{lbl}:</span>
              <strong style={{ color: c, fontWeight: 700 }}>{n}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Estado de flota + Actividad reciente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* Flota */}
        <div className="card">
          <div className="ch">
            <div>
              <h3>Estado operativo de la flota</h3>
              <p>{totalRutas} unidades en ruta hoy · Alfa Distribuidores</p>
            </div>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>VEHÍCULO</th>
                  <th>CONDUCTOR</th>
                  <th className="num">ENTREGADOS</th>
                  <th className="num">PENDIENTES</th>
                  <th>PROGRESO</th>
                </tr>
              </thead>
              <tbody>
                {RUTAS_ACTIVAS.map(r => {
                  const ent = r.paradas.filter(p => p.estado === 'entregado').length
                  const tot = r.paradas.length
                  const p   = Math.round((ent / tot) * 100)
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="rt" style={{ background: r.color }}>{r.id}</span>
                        <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--ink)' }}>{r.vehiculo.placa}</span>
                        <span style={{ display: 'block', color: '#64748b', fontSize: 10 }}>{r.vehiculo.marca}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{r.vehiculo.conductor}</td>
                      <td className="num" style={{ color: '#16A34A', fontWeight: 700 }}>{ent}</td>
                      <td className="num" style={{ color: '#64748b', fontWeight: 600 }}>{tot - ent}</td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p}%`, background: p >= 80 ? '#16A34A' : '#2563EB', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', minWidth: 32 }}>{p}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card">
          <div className="ch">
            <div>
              <h3>Actividad reciente de entregas</h3>
              <p>Últimos despachos confirmados en vivo</p>
            </div>
            <select
              value={filtroActividad}
              onChange={e => setFiltroActividad(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 8px', fontSize: 11.5, background: '#fff', color: '#0f172a' }}
              aria-label="Filtrar actividad por ruta"
            >
              <option value="todas">Todas las rutas</option>
              {RUTAS_ACTIVAS.map(r => (
                <option key={r.id} value={r.id}>{r.id} ({r.vehiculo.conductor})</option>
              ))}
            </select>
          </div>
          <div style={{ padding: '4px 0' }}>
            {actividadFiltrada.map((a, i) => (
              <div key={a.id || `${a.ruta}-${i}`} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f1f4f8', alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color + '18', display: 'grid', placeItems: 'center', fontSize: 15, flex: '0 0 auto', color: a.color, fontWeight: 700 }}>
                  ✓
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>
                    {a.cliente}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                    {a.conductor} · <span className="rt" style={{ background: a.color, fontSize: 9 }}>{a.ruta}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div style={{ fontWeight: 700, color: '#16A34A', fontSize: 12 }}>S/ {a.monto.toLocaleString('es-PE')}</div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>{a.horaReal}</div>
                </div>
              </div>
            ))}
            {actividadFiltrada.length === 0 && (
              <div className="empty" style={{ padding: '30px 16px' }}>
                <b>Sin entregas en esta ruta aún</b>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
