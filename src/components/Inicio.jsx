import { RUTAS_ACTIVAS } from '../data/mockRutas'

/**
 * Dashboard de inicio.
 *
 * KPIs del día: pedidos, rutas, entregas y estado de flota.
 * Reemplaza el stub actual de "Inicio".
 */
export default function Inicio() {
  // ── métricas calculadas desde las rutas activas ──────────────
  const totalRutas  = RUTAS_ACTIVAS.length
  const totalParadas = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.length, 0)
  const entregados  = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.filter(p => p.estado === 'entregado').length, 0)
  const enCamino    = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.filter(p => p.estado === 'en_camino').length, 0)
  const pendientes  = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.filter(p => p.estado === 'pendiente').length, 0)
  const montoTotal  = RUTAS_ACTIVAS.reduce((s, r) => s + r.paradas.reduce((ss, p) => ss + p.monto, 0), 0)
  const pct = Math.round((entregados / totalParadas) * 100)

  const KPI = [
    { label: 'Pedidos del día', valor: totalParadas, color: '#2563EB', bg: '#dbeafe', icon: '📦' },
    { label: 'Entregados', valor: entregados, color: '#16A34A', bg: '#dcfce7', icon: '✓' },
    { label: 'En camino', valor: enCamino, color: '#F59E0B', bg: '#fef3c7', icon: '🚚' },
    { label: 'Pendientes', valor: pendientes, color: '#64748b', bg: '#f1f5f9', icon: '⏳' },
    { label: 'Rutas activas', valor: totalRutas, color: '#9333EA', bg: '#f3e8ff', icon: '🗺' },
    { label: 'Monto en ruta', valor: `S/ ${montoTotal.toLocaleString('es-PE')}`, color: '#0891B2', bg: '#e0f2fe', icon: '💰' },
  ]

  // ── actividad reciente ────────────────────────────────────────
  const actividad = RUTAS_ACTIVAS.flatMap(r =>
    r.paradas
      .filter(p => p.estado === 'entregado')
      .map(p => ({ ...p, conductor: r.vehiculo.conductor, ruta: r.id, color: r.color }))
  ).sort((a, b) => b.horaReal.localeCompare(a.horaReal)).slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
        {KPI.map(k => (
          <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px', color: k.color }}>{k.valor}</div>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: k.bg, display: 'grid', placeItems: 'center', fontSize: 16 }}>
                {k.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progreso global del día */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Progreso global de entregas</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Actualizado en tiempo real · operación iniciada a las 08:00</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB' }}>{pct}%</div>
        </div>
        <div style={{ height: 10, borderRadius: 6, background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563EB,#16A34A)', borderRadius: 6, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
          {[['Entregados', entregados, '#16A34A', '#dcfce7'], ['En camino', enCamino, '#F59E0B', '#fef3c7'], ['Pendientes', pendientes, '#64748b', '#f1f5f9']].map(([lbl, n, c, bg]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
              <span style={{ color: '#64748b' }}>{lbl}</span>
              <strong style={{ color: c }}>{n}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Estado de flota + Actividad reciente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* Flota */}
        <div className="card">
          <div className="ch">
            <div>
              <h3>Estado de la flota</h3>
              <p>{totalRutas} vehículos en ruta hoy</p>
            </div>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>VEHÍCULO</th><th>CONDUCTOR</th>
                  <th className="num">ENTREGADOS</th><th className="num">PENDIENTES</th>
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
                        <span style={{ marginLeft: 6, fontWeight: 600 }}>{r.vehiculo.placa}</span>
                        <span style={{ display: 'block', color: '#94a3b8', fontSize: 10 }}>{r.vehiculo.marca}</span>
                      </td>
                      <td>{r.vehiculo.conductor}</td>
                      <td className="num" style={{ color: '#16A34A', fontWeight: 600 }}>{ent}</td>
                      <td className="num" style={{ color: '#64748b' }}>{tot - ent}</td>
                      <td style={{ minWidth: 110 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p}%`, background: p >= 80 ? '#16A34A' : '#2563EB', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', minWidth: 28 }}>{p}%</span>
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
              <h3>Actividad reciente</h3>
              <p>Últimas entregas confirmadas</p>
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {actividad.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 15px', borderBottom: '1px solid #f1f4f8', alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: a.color + '18', display: 'grid', placeItems: 'center', fontSize: 15, flex: '0 0 auto', marginTop: 1 }}>
                  ✓
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.cliente}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>{a.conductor} · <span className="rt" style={{ background: a.color }}>{a.ruta}</span></div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div style={{ fontWeight: 600, color: '#16A34A', fontSize: 11 }}>S/ {a.monto.toLocaleString('es-PE')}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{a.horaReal}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
