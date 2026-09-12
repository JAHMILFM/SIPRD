import { useMemo, useState } from 'react'
import { NO_PLANIFICABLES } from '../data/mock'
import { hhmm } from '../lib/planner'
import { useToast } from '../context/ToastContext'

const POR_PAGINA = 8
const DIAS_CORTOS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

function chipPrioridad(p) {
  const icon = p === 'Alta' ? '🔥' : p === 'Media' ? '⚡' : '▫️'
  const clase = p === 'Alta' ? 'c-hi' : p === 'Media' ? 'c-md' : 'c-lo'
  return <span className={`chip ${clase}`}><span aria-hidden="true">{icon}</span> {p}</span>
}

export default function OrdersPanel({ plan, reprogramados }) {
  const { toast } = useToast()
  const [tab, setTab]         = useState('pedidos')
  const [pagina, setPagina]   = useState(0)
  const [busca, setBusca]     = useState('')
  const [sortCol, setSortCol] = useState(null) // { col: string, dir: 'asc' | 'desc' }

  const pedidos    = useMemo(() => plan.rutas.flatMap((r) => r.pedidos), [plan])
  const sinAsignar = plan.sinAsignar ?? []
  const conflictos = plan.conflictos ?? []

  const handleSort = (col) => {
    setSortCol((prev) => {
      if (!prev || prev.col !== col) return { col, dir: 'asc' }
      if (prev.dir === 'asc') return { col, dir: 'desc' }
      return null
    })
  }

  const filtrados = useMemo(() => {
    let list = pedidos

    const q = busca.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.cliente.toLowerCase().includes(q) ||
          p.dir.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      )
    }

    if (sortCol) {
      list = [...list].sort((a, b) => {
        let valA = a[sortCol.col]
        let valB = b[sortCol.col]
        if (typeof valA === 'string') {
          return sortCol.dir === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA)
        }
        return sortCol.dir === 'asc' ? valA - valB : valB - valA
      })
    }

    return list
  }, [pedidos, busca, sortCol])

  const paginas  = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pag      = Math.min(pagina, paginas - 1)
  const visibles = filtrados.slice(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA)

  const cambiarTab = (t) => {
    setTab(t)
    setPagina(0)
  }

  const sortIcon = (col) => {
    if (!sortCol || sortCol.col !== col) return ' ↕'
    return sortCol.dir === 'asc' ? ' ▲' : ' ▼'
  }

  const forzarHoy = (pedido) => {
    toast.info(`Pedido #${pedido.id} forzado para reprogramación en ruta de hoy.`)
  }

  return (
    <div className="card">
      <div className="tabs">
        <button
          className={tab === 'pedidos' ? 'on' : ''}
          onClick={() => cambiarTab('pedidos')}
          aria-selected={tab === 'pedidos'}
        >
          Pedidos <span className="cnt">{pedidos.length}</span>
        </button>
        <button
          className={tab === 'rutas' ? 'on' : ''}
          onClick={() => cambiarTab('rutas')}
          aria-selected={tab === 'rutas'}
        >
          Rutas <span className="cnt">{plan.rutas.length}</span>
        </button>
        <button
          className={tab === 'repro' ? 'on' : ''}
          onClick={() => cambiarTab('repro')}
          aria-selected={tab === 'repro'}
        >
          Reprogramados <span className="cnt warn">{reprogramados.length}</span>
        </button>
        <button
          className={tab === 'sinasig' ? 'on' : ''}
          onClick={() => cambiarTab('sinasig')}
          aria-selected={tab === 'sinasig'}
        >
          Sin asignar <span className={`cnt ${sinAsignar.length > 0 ? 'dang' : ''}`}>{sinAsignar.length}</span>
        </button>
        <button
          className={tab === 'nop' ? 'on' : ''}
          onClick={() => cambiarTab('nop')}
          aria-selected={tab === 'nop'}
        >
          No planificables <span className="cnt dang">{NO_PLANIFICABLES.length}</span>
        </button>
      </div>

      {/* ── Pestaña Pedidos ─────────────────────────────────── */}
      {tab === 'pedidos' && (
        <>
          <div className="search">
            <input
              placeholder="Buscar por cliente, dirección o pedido… (ej. Minimarket o 1042)"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPagina(0)
              }}
              aria-label="Buscar pedidos"
            />
            {busca && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setBusca('')}
                title="Limpiar búsqueda"
                aria-label="Limpiar campo de búsqueda"
              >
                ✕
              </button>
            )}
            <div className="ctl" style={{ cursor: 'default' }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>{filtrados.length} encontrados</span>
            </div>
          </div>

          {conflictos.length > 0 && (
            <div className="warnbox" style={{ margin: '0 16px 12px', maxWidth: 'none' }}>
              <span>⚠️</span>
              <div>
                <b>RF-06 · {conflictos.length} parada{conflictos.length > 1 ? 's' : ''} con ventana horaria en conflicto.</b>
                {' '}Revisa las filas marcadas con alerta en la columna Ventana.
              </div>
            </div>
          )}

          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>RUTA</th>
                  <th className="sortable" onClick={() => handleSort('cliente')} title="Ordenar por cliente">
                    CLIENTE{sortIcon('cliente')}
                  </th>
                  <th>DIRECCIÓN</th>
                  <th>VEH. SUGERIDO</th>
                  <th className="num sortable" onClick={() => handleSort('bultos')} title="Ordenar por bultos">
                    BULTOS{sortIcon('bultos')}
                  </th>
                  <th className="num sortable" onClick={() => handleSort('peso')} title="Ordenar por peso">
                    PESO{sortIcon('peso')}
                  </th>
                  <th className="num sortable" onClick={() => handleSort('vol')} title="Ordenar por volumen">
                    VOL.{sortIcon('vol')}
                  </th>
                  <th>VENTANA</th>
                  <th className="num">SERV.</th>
                  <th className="sortable" onClick={() => handleSort('prioridad')} title="Ordenar por prioridad">
                    PRIORIDAD{sortIcon('prioridad')}
                  </th>
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
                    <td style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'monospace' }}>
                      {p.vehiculoSugerido ?? '—'}
                    </td>
                    <td className="num">{p.bultos}</td>
                    <td className="num">{p.peso.toLocaleString('es-PE')} kg</td>
                    <td className="num">{p.vol.toFixed(2)} m³</td>
                    <td className="win">
                      {p.ventana}
                      {p.ventanaConflicto && (
                        <span
                          title={p.conflictoDetalle || 'Llegada estimada fuera de la ventana permitida por el cliente'}
                          style={{ color: '#dc2626', cursor: 'help', marginLeft: 5, fontWeight: 700 }}
                        >
                          ⚠️
                        </span>
                      )}
                      <i>{p.dias ? p.dias.map((d) => DIAS_CORTOS[d]).join(', ') : 'Sin restricción'}</i>
                    </td>
                    <td className="num">{p.servicio} min</td>
                    <td>{chipPrioridad(p.prioridad)}</td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty">
                      <b>Ningún pedido coincide con «{busca}»</b>
                      <p style={{ marginTop: 6, color: '#64748b' }}>Prueba con otro término de búsqueda o limpia el filtro.</p>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setBusca('')}
                        style={{ marginTop: 12, display: 'inline-flex' }}
                      >
                        Limpiar búsqueda
                      </button>
                    </td>
                  </tr>
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
              <button
                type="button"
                onClick={() => setPagina(Math.max(0, pag - 1))}
                disabled={pag === 0}
                aria-label="Página anterior"
              >
                ‹
              </button>
              {Array.from({ length: paginas }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === pag ? 'on' : ''}
                  onClick={() => setPagina(i)}
                  aria-label={`Página ${i + 1}`}
                  aria-current={i === pag ? 'true' : undefined}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPagina(Math.min(paginas - 1, pag + 1))}
                disabled={pag === paginas - 1}
                aria-label="Página siguiente"
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Pestaña Rutas ───────────────────────────────────── */}
      {tab === 'rutas' && (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>RUTA</th>
                <th>VEHÍCULO</th>
                <th>CONDUCTOR</th>
                <th className="num">PARADAS</th>
                <th className="num">DISTANCIA</th>
                <th>JORNADA</th>
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

      {/* ── Pestaña Reprogramados ───────────────────────────── */}
      {tab === 'repro' && (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>PEDIDO</th>
                <th>CLIENTE</th>
                <th>MOTIVO DE REPROGRAMACIÓN</th>
                <th>SE MUEVE A</th>
                <th style={{ textAlign: 'center' }}>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {reprogramados.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td className="cli"><b>{p.cliente}</b><i>{p.dist}</i></td>
                  <td><span className="flag">⚑</span> {p.motivo}</td>
                  <td style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--blue)' }}>{p.mueveA}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => forzarHoy(p)}
                    >
                      Forzar hoy
                    </button>
                  </td>
                </tr>
              ))}
              {reprogramados.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    <b>Ningún pedido se movió de día</b>
                    Todos los clientes programados atienden en su ventana habitual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pestaña Sin Asignar ─────────────────────────────── */}
      {tab === 'sinasig' && (
        <>
          {sinAsignar.length > 0 && (
            <div className="warnbox" style={{ margin: '12px 16px 0', maxWidth: 'none' }}>
              <span>⚠️</span>
              <div>
                <b>RF-06 · Restricción de capacidad detectada.</b> Estos pedidos no pudieron asignarse a ningún camión disponible.
                Aumenta el número de vehículos en el tanteo de flota o divide la carga.
              </div>
            </div>
          )}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>PEDIDO</th>
                  <th>CLIENTE</th>
                  <th>ZONA</th>
                  <th className="num">PESO</th>
                  <th className="num">VOLUMEN</th>
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
                      <span className="chip c-hi">{p.motivo ?? 'Capacidad de flota agotada'}</span>
                    </td>
                  </tr>
                ))}
                {sinAsignar.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      <b>✓ Todos los pedidos fueron asignados</b>
                      La flota seleccionada tiene capacidad suficiente para atender la demanda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Pestaña No Planificables ────────────────────────── */}
      {tab === 'nop' && (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>PEDIDO</th>
                <th>CLIENTE</th>
                <th>MOTIVO</th>
                <th>DETALLE</th>
                <th style={{ textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {NO_PLANIFICABLES.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td className="cli"><b>{p.cliente}</b></td>
                  <td><span className="chip c-hi">{p.motivo}</span></td>
                  <td className="adr">{p.detalle}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => toast.info(`Abriendo editor de dirección para pedido #${p.id}`)}
                    >
                      Corregir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
