import { useState } from 'react'
import { RUTAS_ACTIVAS } from '../data/mockRutas'
import { useAuth } from '../context/AuthContext'
import { useAudit } from '../context/AuditContext'

/**
 * Módulo Rutas — gestión en vivo.
 *
 * Permite al asistente de distribución:
 *  - Ver el progreso de cada ruta en ejecución
 *  - Reordenar paradas (subir / bajar) sobre rutas en curso
 *  - Bloquear una parada (el conductor no puede acceder hasta desbloquear)
 *  - Ver el estado de cada parada (entregado / en camino / pendiente)
 *
 * El reordenamiento y bloqueo se reflejan en la App de Distribución
 * (simulado: la integración real está pendiente de confirmar con TI).
 */

const ESTADO_CHIP = {
  entregado: { label: 'Entregado',  clase: 'c-gn' },
  en_camino: { label: 'En camino', clase: 'c-md' },
  pendiente: { label: 'Pendiente', clase: 'c-lo' },
  bloqueado: { label: 'Bloqueado', clase: 'c-hi' },
}

function chipEstado(estado, bloqueado) {
  const key = bloqueado ? 'bloqueado' : estado
  const { label, clase } = ESTADO_CHIP[key] ?? { label: estado, clase: 'c-lo' }
  return <span className={`chip ${clase}`}>{label}</span>
}

export default function Rutas() {
  // ── estado local ──────────────────────────────────────────────
  const { usuario } = useAuth()
  const { log }     = useAudit()
  const [rutas, setRutas] = useState(() =>
    RUTAS_ACTIVAS.map(r => ({ ...r, paradas: r.paradas.map(p => ({ ...p })) }))
  )
  const [rutaActiva, setRutaActiva] = useState(rutas[0].id)
  const [guardado, setGuardado]     = useState(false)

  const ruta = rutas.find(r => r.id === rutaActiva)

  // ── helpers ───────────────────────────────────────────────────
  const mutarRuta = (fn) => {
    setRutas(prev =>
      prev.map(r => r.id === rutaActiva ? { ...r, paradas: fn(r.paradas) } : r)
    )
    setGuardado(false)
  }

  const subir  = (idx) => {
    const ruta = rutas.find(r => r.id === rutaActiva)
    const p = ruta?.paradas[idx]
    mutarRuta(ps => { const a = [...ps]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a.map((p,i)=>({...p, orden:i+1})) })
    if (p) log(usuario, 'Rutas', 'Reordenó parada (subió)', `${p.cliente} · ${rutaActiva}`)
  }
  const bajar  = (idx) => {
    const ruta = rutas.find(r => r.id === rutaActiva)
    const p = ruta?.paradas[idx]
    mutarRuta(ps => { const a = [...ps]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a.map((p,i)=>({...p, orden:i+1})) })
    if (p) log(usuario, 'Rutas', 'Reordenó parada (bajó)', `${p.cliente} · ${rutaActiva}`)
  }
  const toggleBloqueo = (id) => {
    const ruta  = rutas.find(r => r.id === rutaActiva)
    const parada = ruta?.paradas.find(p => p.id === id)
    const nuevo  = !parada?.bloqueado
    mutarRuta(ps => ps.map(p => p.id === id ? { ...p, bloqueado: !p.bloqueado } : p))
    if (parada) log(usuario, 'Rutas', nuevo ? 'Bloqueó parada' : 'Desbloqueó parada', `${parada.cliente} · ${rutaActiva}`)
  }

  const guardar = () => {
    setGuardado(true)
    log(usuario, 'Rutas', 'Guardó cambios de ruta', `Ruta ${rutaActiva} sincronizada con App de Distribución`)
  }

  // ── métricas de la ruta seleccionada ─────────────────────────
  const ent = ruta.paradas.filter(p => p.estado === 'entregado').length
  const enc = ruta.paradas.filter(p => p.estado === 'en_camino').length
  const pen = ruta.paradas.filter(p => p.estado === 'pendiente').length
  const pct = Math.round((ent / ruta.paradas.length) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Selector de rutas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
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
                border: `2px solid ${activ ? r.color : '#e6e9ef'}`,
                borderRadius: 10, padding: '11px 13px', textAlign: 'left',
                color: activ ? '#fff' : '#0f172a', transition: 'all .15s', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, opacity: activ ? .85 : .5, marginBottom: 4 }}>
                {r.id} · {r.vehiculo.placa}
              </div>
              <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 2 }}>{r.vehiculo.conductor}</div>
              <div style={{ fontSize: 10.5, opacity: .8 }}>{r.vehiculo.marca}</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 3, background: activ ? 'rgba(255,255,255,.3)' : '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pctR}%`, background: activ ? '#fff' : r.color, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, marginTop: 4, opacity: .8 }}>{entR}/{totR} entregas · {pctR}%</div>
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
            <p>Salida: {ruta.horaInicio} · {ruta.paradas.length} paradas · Reordena o bloquea paradas; los cambios se sincronizan con la App de Distribución.</p>
          </div>
          <div className="btns">
            <button className="btn out" onClick={guardar} disabled={guardado}>
              {guardado ? '✓ Guardado' : '💾 Guardar cambios'}
            </button>
            {guardado && (
              <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600, alignSelf: 'center' }}>
                Sincronizado con App de Distribución
              </span>
            )}
          </div>
        </div>

        {/* KPIs de la ruta */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e6e9ef' }}>
          {[['Entregados', ent, '#16A34A', '#dcfce7'], ['En camino', enc, '#F59E0B', '#fef3c7'], ['Pendientes', pen, '#64748b', '#f1f5f9']].map(([l, n, c, bg]) => (
            <div key={l} style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid #f1f4f8' }}>
              <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600, letterSpacing: .4, marginBottom: 3 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{n}</div>
            </div>
          ))}
          <div style={{ flex: 1, padding: '10px 16px' }}>
            <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600, letterSpacing: .4, marginBottom: 3 }}>PROGRESO</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563EB,#16A34A)', borderRadius: 3 }} />
              </div>
              <strong style={{ fontSize: 13, color: '#2563EB' }}>{pct}%</strong>
            </div>
          </div>
        </div>

        {/* Tabla de paradas */}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>CLIENTE</th>
                <th>DIRECCIÓN</th>
                <th>VENTANA</th>
                <th className="num">BULTOS</th>
                <th>ESTADO</th>
                <th style={{ width: 120, textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ruta.paradas.map((p, idx) => {
                const bloq = p.bloqueado
                const inmutable = p.estado === 'entregado'
                return (
                  <tr key={p.id} style={{ opacity: inmutable ? .65 : 1, background: bloq ? '#fff7f7' : undefined }}>
                    <td style={{ fontWeight: 700, color: ruta.color, textAlign: 'center' }}>{p.orden}</td>
                    <td className="cli">
                      <b>{p.cliente}</b>
                      <i style={{ color: p.prioridad === 'Alta' ? '#b91c1c' : undefined }}>
                        {p.prioridad === 'Alta' ? '⚑ Alta prioridad' : p.prioridad}
                      </i>
                    </td>
                    <td className="adr">{p.dir}</td>
                    <td className="win">{p.ventana}</td>
                    <td className="num">{p.bultos}</td>
                    <td>
                      {chipEstado(p.estado, bloq)}
                      {p.horaReal && <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.horaReal}</span>}
                    </td>
                    <td>
                      {!inmutable && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            title="Subir parada"
                            disabled={idx === 0 || inmutable}
                            onClick={() => subir(idx)}
                            style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                          >↑</button>
                          <button
                            title="Bajar parada"
                            disabled={idx === ruta.paradas.length - 1}
                            onClick={() => bajar(idx)}
                            style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                          >↓</button>
                          <button
                            title={bloq ? 'Desbloquear parada' : 'Bloquear parada'}
                            onClick={() => toggleBloqueo(p.id)}
                            style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${bloq ? '#fca5a5' : '#e2e8f0'}`, background: bloq ? '#fee2e2' : '#fff', fontSize: 12, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                          >{bloq ? '🔓' : '🔒'}</button>
                        </div>
                      )}
                      {inmutable && <span style={{ display: 'block', textAlign: 'center', color: '#94a3b8', fontSize: 10.5 }}>Ya entregado</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Nota de recálculo */}
        <div className="foot">
          <span>El recálculo respeta las paradas ya entregadas · Motor: heurística + genético</span>
          <button className="btn blue" style={{ fontSize: 11.5, padding: '6px 12px' }}>↻ Recalcular pendientes</button>
        </div>
      </div>

      {/* Monitoreo GPS simulado */}
      <div className="card">
        <div className="ch">
          <div><h3>Monitoreo GPS en tiempo real</h3><p>Posición simulada · integración con App de Distribución pendiente de confirmar con TI</p></div>
        </div>
        <div style={{ position: 'relative', height: 240, background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', borderRadius: '0 0 10px 10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Cuadrícula simulada */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          {/* Puntos de ruta */}
          {rutas.map((r, ri) => (
            r.paradas.filter(p => p.estado === 'entregado' || p.estado === 'en_camino').map((p, pi) => (
              <div key={p.id} style={{ position: 'absolute', left: `${15 + ri * 18 + pi * 3}%`, top: `${20 + ri * 15 + pi * 8}%` }}>
                <div style={{ width: p.estado === 'en_camino' ? 14 : 9, height: p.estado === 'en_camino' ? 14 : 9, borderRadius: '50%', background: p.estado === 'en_camino' ? r.color : r.color + '99', border: p.estado === 'en_camino' ? `2px solid ${r.color}` : 'none', boxShadow: p.estado === 'en_camino' ? `0 0 12px ${r.color}` : 'none', transition: 'all .3s' }} />
              </div>
            ))
          ))}
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign: 'center', zIndex: 1 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📍</div>
            Mapa en tiempo real — integración con OpenStreetMap + OSRM<br />
            <span style={{ fontSize: 11 }}>En producción se conecta a la App de Distribución vía WebSocket</span>
          </div>
        </div>
      </div>

    </div>
  )
}
