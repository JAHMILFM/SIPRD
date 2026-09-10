import { useMemo, useState } from 'react'
import Sidebar       from './components/Sidebar'
import TopBar        from './components/TopBar'
import ParamsBar     from './components/ParamsBar'
import FleetTrial    from './components/FleetTrial'
import OrdersPanel   from './components/OrdersPanel'
import RouteMap      from './components/RouteMap'
import TruckStats    from './components/TruckStats'
import Inicio        from './components/Inicio'
import Rutas         from './components/Rutas'
import Cobranzas     from './components/Cobranzas'
import Configuracion from './components/Configuracion'
import Registros     from './components/Registros'
import Login         from './components/Login'
import { PEDIDOS, VEHICULOS } from './data/mock'
import { planificar, separarReprogramados, hhmm } from './lib/planner'
import { useAuth } from './context/AuthContext'
import { useAudit } from './context/AuditContext'

const TITULOS = {
  inicio:    ['Inicio',                   'Resumen de la operación del día.'],
  algoritmo: ['Algoritmo de Ruteo',       'Prueba cuántos vehículos necesita la jornada y ajusta el reparto antes de enviarlo a Rutas.'],
  rutas:     ['Gestión de Rutas',         'Reordena paradas en vivo y recalcula lo pendiente sin tocar lo ya entregado.'],
  cobranzas: ['Cobranzas',               'Valida los pagos del día para que el repartidor pueda avanzar al siguiente punto.'],
  config:    ['Configuración',            'Capacidad de vehículos, reglas por cliente y accesos.'],
  registros: ['Registros de Auditoría',  'Trazabilidad de cambios: reglas, rutas, aprobaciones y cobros · RF-13 · RNF-09'],
}

// ── Modal de aprobación de ruta (RF-09) ───────────────────────
function ModalAprobacion({ plan, usuario, onConfirmar, onCancelar }) {
  const ahora = new Date()
  const fecha = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const totalPedidos = plan.rutas.reduce((s, r) => s + r.pedidos.length, 0)
  const conflictos   = plan.conflictos?.length ?? 0

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Confirmar aprobación de plan</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>RF-09 · Esta acción queda registrada en el log de auditoría</div>
          </div>
          <button className="modal-close" onClick={onCancelar}>×</button>
        </div>

        <div className="modal-body">
          {/* Resumen del plan */}
          <div className="modal-grid">
            <div><div className="modal-lbl">Vehículos</div><div className="modal-val">{plan.n}</div></div>
            <div><div className="modal-lbl">Pedidos asignados</div><div className="modal-val">{totalPedidos}</div></div>
            <div><div className="modal-lbl">Jornada máxima</div><div className="modal-val" style={{ fontSize: 16 }}>{hhmm(plan.jornadaMax)}</div></div>
            <div><div className="modal-lbl">Distancia total</div><div className="modal-val" style={{ fontSize: 16 }}>{plan.kmTotal.toFixed(1)} km</div></div>
          </div>

          {/* Quién aprueba + cuándo */}
          <div className="modal-sep" />
          <div className="modal-meta">
            <div>
              <div className="modal-lbl">Aprobado por</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{usuario.nombre}</div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>{usuario.titulo}</div>
            </div>
            <div>
              <div className="modal-lbl">Fecha y hora</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{fecha}</div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>{hora}</div>
            </div>
          </div>

          {/* Advertencias */}
          {conflictos > 0 && (
            <div className="warnbox">
              <span>⚑</span>
              <div><b>{conflictos} parada{conflictos > 1 ? 's' : ''} con ventana horaria en conflicto.</b> Verifica con el asistente antes de aprobar.</div>
            </div>
          )}
          {plan.sinAsignar.length > 0 && (
            <div className="warnbox">
              <span>⚑</span>
              <div><b>{plan.sinAsignar.length} pedido{plan.sinAsignar.length > 1 ? 's' : ''} sin asignar.</b> No entrarán en la ruta aprobada.</div>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '9px 12px' }}>
            Esta acción no puede revertirse desde esta pantalla. El plan aprobado se enviará a Rutas.
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn out" onClick={onCancelar}>Cancelar</button>
          <button className="btn green" onClick={() => onConfirmar(fecha, hora)}>✓ Confirmar aprobación</button>
        </div>
      </div>
    </div>
  )
}

// ── Badge de plan aprobado (RF-09) ────────────────────────────
function AprobacionBadge({ datos }) {
  return (
    <div className="aprobacion-badge">
      <span style={{ fontSize: 24 }}>✅</span>
      <div>
        <div style={{ fontWeight: 700, color: '#15803d', fontSize: 13 }}>Plan aprobado · Enviado a Rutas</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
          Aprobado por <strong>{datos.usuario}</strong> ({datos.titulo}) · {datos.fecha} {datos.hora}
          {' '} · {datos.n} vehículos · {datos.pedidos} pedidos
        </div>
      </div>
    </div>
  )
}

// ── Placeholder de acceso denegado (RNF-02) ───────────────────
function AccesoDenegado() {
  return (
    <div className="card">
      <div className="acceso-denegado">
        <div style={{ fontSize: 40 }}>🔒</div>
        <b>Acceso no autorizado</b>
        Tu rol no tiene permiso para ver este módulo. Contacta al Jefe de Distribución o al área de TI.
      </div>
    </div>
  )
}

// ── App principal ─────────────────────────────────────────────
export default function App() {
  const { usuario, puede, puedeAprobar } = useAuth()
  const { log } = useAudit()

  // Si no hay sesión → pantalla de login
  if (!usuario) return <Login />

  return <AppInterna usuario={usuario} puede={puede} puedeAprobar={puedeAprobar} log={log} />
}

function AppInterna({ usuario, puede, puedeAprobar, log }) {
  // Módulo inicial según rol
  const moduloInicial = puede('inicio') ? 'inicio' : puede('config') ? 'config' : 'registros'

  const [modulo, setModulo]         = useState(moduloInicial)
  const [criterio, setCriterio]     = useState('jornada')
  const [turno, setTurno]           = useState('dia')
  const [jornadaMax, setJornadaMax] = useState(8)
  const [tamanos, setTamanos]       = useState([3, 4, 5, 6])
  const [seleccion, setSeleccion]   = useState(5)
  const [calculando, setCalculando] = useState(false)
  // RF-09: aprobación
  const [modalAprob, setModalAprob] = useState(false)
  const [aprobacion, setAprobacion] = useState(null)

  const { planificables, reprogramados } = useMemo(() => separarReprogramados(PEDIDOS), [])

  const escenarios = useMemo(
    () => tamanos.map((n) => planificar(planificables, n)),
    [planificables, tamanos]
  )

  const plan = escenarios.find((e) => e.n === seleccion) ?? escenarios[0]

  const recalcular = () => {
    setCalculando(true)
    setTimeout(() => setCalculando(false), 1400)
  }

  const agregarEscenario = () => {
    const siguiente = Math.max(...tamanos) + 1
    if (siguiente > VEHICULOS.length) return
    setTamanos([...tamanos, siguiente])
  }

  // RF-09: confirmar aprobación
  const confirmarAprobacion = (fecha, hora) => {
    const totalPedidos = plan.rutas.reduce((s, r) => s + r.pedidos.length, 0)
    const datos = { usuario: usuario.nombre, titulo: usuario.titulo, fecha, hora, n: plan.n, pedidos: totalPedidos }
    setAprobacion(datos)
    setModalAprob(false)
    log(usuario, 'Algoritmo', 'Aprobó plan de ruteo',
      `${plan.n} vehículos · ${totalPedidos} pedidos · jornada máx. ${hhmm(plan.jornadaMax)} · ${plan.kmTotal.toFixed(1)} km`)
  }

  const [titulo, subtitulo] = TITULOS[modulo] ?? ['', '']

  return (
    <div className="app">
      {/* Modal de aprobación */}
      {modalAprob && (
        <ModalAprobacion
          plan={plan}
          usuario={usuario}
          onConfirmar={confirmarAprobacion}
          onCancelar={() => setModalAprob(false)}
        />
      )}

      <Sidebar activo={modulo} onCambiar={setModulo} />

      <main className="main">
        <TopBar titulo={titulo} subtitulo={subtitulo} />

        {/* ── Inicio ─────────────────────── */}
        {modulo === 'inicio' && (puede('inicio') ? <Inicio /> : <AccesoDenegado />)}

        {/* ── Algoritmo ──────────────────── */}
        {modulo === 'algoritmo' && (puede('algoritmo') ? (
          <>
            <ParamsBar
              criterio={criterio} setCriterio={setCriterio}
              turno={turno} setTurno={setTurno}
              jornadaMax={jornadaMax} setJornadaMax={setJornadaMax}
            />

            <FleetTrial
              escenarios={escenarios}
              seleccion={seleccion}
              onSeleccionar={setSeleccion}
              onAgregar={agregarEscenario}
              onRecalcular={recalcular}
              calculando={calculando}
              jornadaMax={jornadaMax}
              totalPedidos={planificables.length}
            />

            <div className="split">
              <OrdersPanel plan={plan} reprogramados={reprogramados} />
              <RouteMap plan={plan} />
            </div>

            <TruckStats plan={plan} jornadaMax={jornadaMax} />

            {/* Zona de acciones + aprobación */}
            <div className="actions">
              <div>
                {/* Advertencias de conflicto RF-06 */}
                {(plan.conflictos?.length ?? 0) > 0 && (
                  <div className="warnbox" style={{ marginBottom: 8 }}>
                    <span>⚠️</span>
                    <div>
                      <b>{plan.conflictos.length} parada{plan.conflictos.length > 1 ? 's' : ''} llegarán fuera de su ventana horaria.</b>
                      {' '}Revisa la pestaña Pedidos (ícono ⚠️) o ajusta el número de vehículos.
                    </div>
                  </div>
                )}
                {reprogramados.length > 0 && (
                  <div className="warnbox">
                    <span>⚑</span>
                    <div>
                      <b>{reprogramados.length} pedidos se movieron a otro día.</b> Sus clientes no
                      atienden hoy. Revísalos en la pestaña Reprogramados.
                    </div>
                  </div>
                )}
                <div className="n">
                  Última optimización: 27/08/2026, 08:45 a.m. · Criterio:{' '}
                  {criterio === 'jornada' ? 'balancear jornada' : 'menor distancia'} · Turno{' '}
                  {turno === 'dia' ? 'día' : 'noche'} · Motor: heurística + genético
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                {/* RF-09: badge o botones de aprobación */}
                {aprobacion ? (
                  <AprobacionBadge datos={aprobacion} />
                ) : (
                  <div className="btns">
                    <button className="btn out">Descartar plan</button>
                    <button className="btn out">Guardar como borrador</button>
                    {puedeAprobar() ? (
                      <button className="btn green" onClick={() => setModalAprob(true)}>
                        ✓ Aprobar y enviar a Rutas
                      </button>
                    ) : (
                      <button className="btn out" disabled title="Solo el Jefe de Distribución puede aprobar rutas">
                        🔒 Aprobación restringida al Jefe
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : <AccesoDenegado />)}

        {/* ── Rutas ──────────────────────── */}
        {modulo === 'rutas' && (puede('rutas') ? <Rutas /> : <AccesoDenegado />)}

        {/* ── Cobranzas ──────────────────── */}
        {modulo === 'cobranzas' && (puede('cobranzas') ? <Cobranzas /> : <AccesoDenegado />)}

        {/* ── Configuración ──────────────── */}
        {modulo === 'config' && (puede('config') ? <Configuracion /> : <AccesoDenegado />)}

        {/* ── Registros de auditoría ─────── */}
        {modulo === 'registros' && (puede('registros') ? <Registros /> : <AccesoDenegado />)}
      </main>
    </div>
  )
}
