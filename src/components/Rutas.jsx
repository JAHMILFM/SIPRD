import { useState } from 'react'
import { useDatos } from '../context/DatosContext'
import { useAuth } from '../context/AuthContext'
import RouteMap from './RouteMap'
import ErrorBoundary from './ErrorBoundary'
import Modal from './common/Modal'
import { AccionesEntregaPanel } from './Operaciones'

/**
 * Módulo Rutas — gestión en vivo.
 *
 * Incluye soporte para Deshacer (Heurística #3), filtrado de paradas
 * y confirmación visual de sincronización en tiempo real (Heurística #1).
 */

const ESTADO_CHIP = {
  entregado: { label: 'Entregado',  clase: 'c-gn', icon: '✓' },
  ATENDIDA:  { label: 'Atendida',   clase: 'c-gn', icon: '✓' },
  en_camino: { label: 'En camino',  clase: 'c-md', icon: '🚚' },
  EN_CAMINO: { label: 'En camino',  clase: 'c-md', icon: '🚚' },
  pendiente: { label: 'Pendiente',  clase: 'c-lo', icon: '⏳' },
  PENDIENTE: { label: 'Pendiente',  clase: 'c-lo', icon: '⏳' },
  NO_ATENDIDA: { label: 'No atendida', clase: 'c-hi', icon: '✕' },
  CANCELADA: { label: 'Cancelada',  clase: 'c-hi', icon: '✕' },
  bloqueado: { label: 'Bloqueado',  clase: 'c-hi', icon: '🔒' },
}

const esEntregada = (p) => p && (p.estado === 'entregado' || p.estado === 'ATENDIDA')
const esEnCamino  = (p) => p && (p.estado === 'en_camino' || p.estado === 'EN_CAMINO')
const esPendiente = (p) => p && (p.estado === 'pendiente' || p.estado === 'PENDIENTE')

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
  const { rutas: RUTAS_ACTIVAS, incidencias, recargar } = useDatos()
  const { usuario } = useAuth()

  const [fecha, setFecha] = useState(RUTAS_ACTIVAS[0]?.fecha_ruta || '2026-10-10')
  const rutas = RUTAS_ACTIVAS.filter(r => r.fecha_ruta === fecha)
  const [rutaActiva, setRutaActiva] = useState(RUTAS_ACTIVAS[0]?.id || '')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [paradaId, setParadaId] = useState(null)
  const ruta = rutas.find(r => r.id === rutaActiva) ?? rutas[0]
  const parada = ruta?.paradas.find(p => p.id === paradaId)
  const selectorFecha = <div className="card ch"><label style={{fontSize:12,fontWeight:600}}>Fecha de jornada <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{marginLeft:8}} /></label></div>

  // ── Métricas y filtrado (Soporte dual interfaz y esquema siprd) ──
  if (!ruta) return <>{selectorFecha}<div className="card ch"><p>No hay rutas asignadas disponibles para esta fecha.</p></div></>

  const ent = ruta.paradas.filter(esEntregada).length
  const enc = ruta.paradas.filter(esEnCamino).length
  const pen = ruta.paradas.filter(esPendiente).length
  const pct = ruta.paradas.length ? Math.round((ent / ruta.paradas.length) * 100) : 0

  const paradasVisibles = ruta.paradas.filter(p => {
    if (filtroEstado === 'todos') return true
    if (filtroEstado === 'entregado' || filtroEstado === 'ATENDIDA') return esEntregada(p)
    if (filtroEstado === 'en_camino' || filtroEstado === 'EN_CAMINO') return esEnCamino(p)
    if (filtroEstado === 'pendiente' || filtroEstado === 'PENDIENTE') return esPendiente(p)
    return p.estado === filtroEstado
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {selectorFecha}
      <Modal isOpen={!!parada} onClose={() => setParadaId(null)} title={`Entrega · ${parada?.cliente || ''}`} maxWidth={680}>{parada && <AccionesEntregaPanel key={parada.id} parada={parada} />}</Modal>

      {incidencias.filter(i => i.id_ruta === ruta.id_ruta).length > 0 && <div className="card"><h3>Incidencias de la ruta</h3>{incidencias.filter(i => i.id_ruta === ruta.id_ruta).map(i => <p key={i.id}><b>{i.tipo} · {i.estado}</b> — {i.descripcion}</p>)}</div>}

      {/* Selector de rutas con affordances visuales claros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {rutas.map(r => {
          const entR  = r.paradas.filter(esEntregada).length
          const totR  = r.paradas.length
          const pctR  = totR ? Math.round((entR / totR) * 100) : 0
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
            <p>Salida: {ruta.horaInicio} · {ruta.paradas.length} paradas · Consulta el avance de las entregas y sus incidencias.</p>
          </div>
          <div className="btns"><button type="button" className="btn out" onClick={recargar}>↻ Actualizar</button></div>
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
              {label} ({k === 'todos' ? ruta.paradas.length : ruta.paradas.filter(k === 'entregado' ? esEntregada : k === 'en_camino' ? esEnCamino : esPendiente).length})
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
                      {usuario.rol === 'repartidor' ? <button className="btn out" style={{padding:'4px 10px',fontSize:11}} onClick={() => setParadaId(p.id)}>Entrega / cobro</button> : <span style={{fontSize:11,color:'#64748b'}}>Consulta</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="foot"><span>Las entregas, fotografías e incidencias se guardan en el sistema.</span></div>
      </div>

      {/* Monitoreo en Mapa Real Leaflet / OpenStreetMap */}
      <div style={{ marginTop: 18 }}>
        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Monitoreo Satelital y Vial de Flota</h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>Posicionamiento georreferenciado real en Lima Metropolitana con OpenStreetMap y capas de satélite</p>
          </div>
        </div>
        <ErrorBoundary>
          <RouteMap plan={{ rutas: rutas.map(r => ({ ...r, pedidos: r.paradas })) }} />
        </ErrorBoundary>
      </div>

    </div>
  )
}
