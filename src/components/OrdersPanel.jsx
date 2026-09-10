import { useMemo, useState } from 'react'
import { NO_PLANIFICABLES } from '../data/mock'
import { hhmm } from '../lib/planner'

const POR_PAGINA = 8
const DIAS_CORTOS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

function chipPrioridad(p) {
  const clase = p === 'Alta' ? 'c-hi' : p === 'Media' ? 'c-md' : 'c-lo'
  return <span className={`chip ${clase}`}>{p}</span>
}

export default function OrdersPanel({ plan, reprogramados }) {
  const [tab, setTab]     = useState('pedidos')
  const [pagina, setPagina] = useState(0)
  const [busca, setBusca]   = useState('')

  const pedidos    = useMemo(() => plan.rutas.flatMap((r) => r.pedidos), [plan])
  const sinAsignar = plan.sinAsignar ?? []
  const conflictos = plan.conflictos ?? []

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return pedidos
    return pedidos.filter(
      (p) => p.cliente.toLowerCase().includes(q) || p.dir.toLowerCase().includes(q) || p.id.includes(q)
    )
  }, [pedidos, busca])

  const paginas  = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pag      = Math.min(pagina, paginas - 1)
  const visibles = filtrados.slice(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA)

  const cambiarTab = (t) => { setTab(t); setPagina(0) }

  return (
    <div className="card">
      <div className="tabs">
        <button className={tab === 'pedidos' ? 'on' : ''} onClick={() => cambiarTab('pedidos')}>
          Pedidos <span className="cnt">{pedidos.length}</span>
        </button>
        <button className={tab === 'rutas' ? 'on' : ''} onClick={() => cambiarTab('rutas')}>
          Rutas <span className="cnt">{plan.rutas.length}</span>
        </button>
        <button className={tab === 'repro' ? 'on' : ''} onClick={() => cambiarTab('repro')}>
          Reprogramados <span className="cnt warn">{reprogramados.length}</span>
        </button>
        {/* RF-06: Tab para pedidos sin asignar con su motivo */}
        <button className={tab === 'sinasig' ? 'on' : ''} onClick={() => cambiarTab('sinasig')}>
          Sin asignar <span className={`cnt ${sinAsignar.length > 0 ? 'dang' : ''}`}>{sinAsignar.length}</span>
        </button>
        <button className={tab === 'nop' ? 'on' : ''} onClick={() => cambiarTab('nop')}>
          No planificables <span className="cnt dang">{NO_PLANIFICABLES.length}</span>
        </button>
      </div>

      {/* ── Pedidos ──────────────────────────────────────── */}
      {tab === 'pedidos' && (
        <>
          <div className="search">
            <input
              placeholder="Buscar por cliente, dirección o pedido…"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(0) }}
            />
            <div className="ctl">⛃ Filtros</div>
          </div>
          {conflictos.length > 0 && (
            <div className="warnbox" style={{ margin: '0 15px 10px', maxWidth: 'none' }}>
              <span>⚠️</span>
              <div><b>RF-06 · {conflictos.length} parada{conflictos.length > 1 ? 's' : ''} con ventana horaria en conflicto</b> (marcadas con ⚠️ en la columna Ventana)</div>
            </div>
          )}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>RUTA</th><th>CLIENTE</th><th>DIRECCIÓN</th>
                  {/* RF-04: vehículo sugerido por Distribución */}
                  <th>VEH. SUGERIDO</th>
                  <th className="num">BULTOS</th><th className="num">PESO</th><th className="num">VOL.</th>
                  <th>VENTANA</th><th className="num">SERV.</th><th>PRIOR.</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} style={{ background: p.ventanaConflicto ? '#fffbeb' : undefined }}>
                    <td><span className="rt" style={{ background: p.color }}>{p.ruta}</span></td>
                    <td className="cli">
                      <b>{p.cliente}</b>
                      <i>#{p.id}</i>
                    </td>
                    <td className="adr">{p.dir} — {p.dist}</td>
                    {/* RF-04 */}
                    <td style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'monospace' }}>{p.vehiculoSugerido ?? '—'}</td>
                    <td className="num">{p.bultos}</td>
                    <td className="num">{p.peso.toLocaleString('es-PE')} kg</td>
                    <td className="num">{p.vol.toFixed(2)}</td>
                    <td className="win">
                      {p.ventana}
                      {/* RF-06: icono de conflicto con tooltip */}
                      {p.ventanaConflicto && (
                        <span title={p.conflictoDetalle} style={{ color: '#dc2626', cursor: 'help', marginLeft: 4 }}>⚠️</span>
                      )}
                      <i>{p.dias ? p.dias.map((d) => DIAS_CORTOS[d]).join(', ') : 'Sin restricción'}</i>
                    </td>
                    <td className="num">{p.servicio} min</td>
                    <td>{chipPrioridad(p.prioridad)}</td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={10} className="empty">Ningún pedido coincide con «{busca}».</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="foot">
            <span>
              Mostrando {filtrados.length ? pag * POR_PAGINA + 1 : 0}–
              {Math.min(filtrados.length, (pag + 1) * POR_PAGINA)} de {filtrados.length} pedidos
            </span>
            <div className="pg">
              <button onClick={() => setPagina(Math.max(0, pag - 1))}>‹</button>
              {Array.from({ length: paginas }, (_, i) => (
                <button key={i} className={i === pag ? 'on' : ''} onClick={() => setPagina(i)}>{i + 1}</button>
              ))}
              <button onClick={() => setPagina(Math.min(paginas - 1, pag + 1))}>›</button>
            </div>
          </div>
        </>
      )}

      {/* ── Rutas (RF-04: pedidos organizados por vehículo) ── */}
      {tab === 'rutas' && (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>RUTA</th><th>VEHÍCULO</th><th>CONDUCTOR</th>
                <th className="num">PARADAS</th><th className="num">DISTANCIA</th><th>JORNADA</th>
              </tr>
            </thead>
            <tbody>
              {plan.rutas.map((r) => (
                <tr key={r.id}>
                  <td><span className="rt" style={{ background: r.color }}>{r.id}</span></td>
                  <td className="veh"><b>{r.vehiculo.placa}</b><i>{r.vehiculo.marca}</i></td>
                  <td>{r.vehiculo.conductor}</td>
                  <td className="num">{r.pedidos.length}</td>
                  <td className="num">{r.km.toFixed(1)} km</td>
                  <td><span className="jor">{hhmm(r.minutos)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reprogramados (RF-03) ─────────────────────────── */}
      {tab === 'repro' && (
        <div className="tw">
          <table>
            <thead>
              <tr><th>PEDIDO</th><th>CLIENTE</th><th>MOTIVO</th><th>SE MUEVE A</th><th /></tr>
            </thead>
            <tbody>
              {reprogramados.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td className="cli"><b>{p.cliente}</b><i>{p.dist}</i></td>
                  <td><span className="flag">⚑</span> {p.motivo}</td>
                  <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.mueveA}</td>
                  <td className="num">
                    <button className="btn out" style={{ padding: '4px 9px', fontSize: 11 }}>Forzar hoy</button>
                  </td>
                </tr>
              ))}
              {reprogramados.length === 0 && (
                <tr><td colSpan={5} className="empty">
                  <b>Ningún pedido se movió de día</b>
                  Todos los clientes de hoy atienden en su ventana habitual.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sin asignar (RF-06: con motivo de constraint) ─── */}
      {tab === 'sinasig' && (
        <>
          {sinAsignar.length > 0 && (
            <div className="warnbox" style={{ margin: '10px 15px 0', maxWidth: 'none' }}>
              <span>⚠️</span>
              <div>
                <b>RF-06 · Restricción de capacidad detectada.</b> Estos pedidos no pudieron asignarse a ningún vehículo.
                Agrega más vehículos en el tanteo de flota o divide el pedido.
              </div>
            </div>
          )}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>PEDIDO</th><th>CLIENTE</th><th>ZONA</th>
                  <th className="num">PESO</th><th className="num">VOL.</th>
                  <th>MOTIVO DEL CONFLICTO</th>
                </tr>
              </thead>
              <tbody>
                {sinAsignar.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td className="cli"><b>{p.cliente}</b><i>{p.dist}</i></td>
                    <td><span className="chip c-lo">{p.zona}</span></td>
                    <td className="num">{(p.peso / 1000).toFixed(2)} t</td>
                    <td className="num">{p.vol.toFixed(2)} m³</td>
                    <td>
                      <span className="chip c-hi">{p.motivo ?? 'Sin capacidad disponible'}</span>
                    </td>
                  </tr>
                ))}
                {sinAsignar.length === 0 && (
                  <tr><td colSpan={6} className="empty">
                    <b>Todos los pedidos fueron asignados</b>
                    La flota seleccionada tiene capacidad suficiente para este escenario.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="foot">
            <span>RF-06 · Se informa la restricción específica que impidió la asignación</span>
          </div>
        </>
      )}

      {/* ── No planificables (RF-15) ─────────────────────── */}
      {tab === 'nop' && (
        <div className="tw">
          <table>
            <thead>
              <tr><th>PEDIDO</th><th>CLIENTE</th><th>MOTIVO</th><th>DETALLE</th><th /></tr>
            </thead>
            <tbody>
              {NO_PLANIFICABLES.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td className="cli"><b>{p.cliente}</b></td>
                  <td><span className="chip c-hi">{p.motivo}</span></td>
                  <td className="adr">{p.detalle}</td>
                  <td className="num">
                    <button className="btn out" style={{ padding: '4px 9px', fontSize: 11 }}>Corregir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="foot">
            <span>Estos pedidos no entran al cálculo hasta que se corrija su ubicación.</span>
          </div>
        </div>
      )}
    </div>
  )
}
