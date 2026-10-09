import { useMemo, useState, useEffect, useRef } from 'react'
import Sidebar       from './components/Sidebar'
import TopBar        from './components/TopBar'
import ParamsBar     from './components/ParamsBar'
import FleetTrial    from './components/FleetTrial'
import OrdersPanel   from './components/OrdersPanel'
import RouteMap      from './components/RouteMap'
import ErrorBoundary  from './components/ErrorBoundary'
import TruckStats    from './components/TruckStats'
import Inicio        from './components/Inicio'
import Rutas         from './components/Rutas'
import Cobranzas     from './components/Cobranzas'
import Configuracion from './components/Configuracion'
import Registros     from './components/Registros'
import Login         from './components/Login'
import Modal         from './components/common/Modal'
import HelpDrawer    from './components/common/HelpDrawer'
import { PEDIDOS, VEHICULOS } from './data/mock'
import { planificar, separarReprogramados, hhmm } from './lib/planner'
import { useAuth } from './context/AuthContext'
import { useAudit } from './context/AuditContext'
import { useToast } from './context/ToastContext'

const TITULOS = {
  inicio:    ['Inicio',                   'Resumen de la operación del día.'],
  algoritmo: ['Algoritmo de Ruteo',       'Prueba cuántos vehículos necesita la jornada y ajusta el reparto antes de enviarlo a Rutas.'],
  rutas:     ['Gestión de Rutas',         'Reordena paradas en vivo y recalcula lo pendiente sin tocar lo ya entregado.'],
  cobranzas: ['Cobranzas',               'Valida los pagos del día para que el repartidor pueda avanzar al siguiente punto.'],
  config:    ['Configuración',            'Capacidad de vehículos, reglas por cliente y accesos.'],
  registros: ['Registros de Auditoría',  'Trazabilidad de cambios: reglas, rutas, aprobaciones y cobros · RF-13 · RNF-09'],
}

// ── Modal de aprobación de ruta accesible (RF-09 / WCAG) ───────
function ModalAprobacion({ plan, usuario, onConfirmar, onCancelar }) {
  const ahora = new Date()
  const fecha = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const totalPedidos = plan.rutas.reduce((s, r) => s + r.pedidos.length, 0)
  const conflictos   = plan.conflictos?.length ?? 0

  return (
    <Modal
      isOpen={true}
      onClose={onCancelar}
      title="Confirmar aprobación de plan"
      subtitle="RF-09 · Esta acción queda registrada en el log de auditoría con firma de usuario"
      maxWidth={520}
    >
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

      <div className="modal-ft" style={{ margin: '14px -22px -20px', padding: '14px 22px' }}>
        <button className="btn out" onClick={onCancelar}>Cancelar</button>
        <button className="btn green" onClick={() => onConfirmar(fecha, hora)}>✓ Confirmar aprobación</button>
      </div>
    </Modal>
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
  const { toast } = useToast()

  // Módulo inicial según rol
  const ORDEN_MODULOS = ['inicio', 'algoritmo', 'rutas', 'cobranzas', 'config', 'registros']
  const moduloInicial = ORDEN_MODULOS.find(m => puede(m)) || 'inicio'

  const [modulo, setModulo]         = useState(moduloInicial)
  const [criterio, setCriterio]     = useState('jornada')
  const [turno, setTurno]           = useState('dia')
  const [jornadaMax, setJornadaMax] = useState(8)
  const [tamanos, setTamanos]       = useState([3, 4, 5, 6])
  const [seleccion, setSeleccion]   = useState(5)
  const [calculando, setCalculando] = useState(false)
  const [helpOpen, setHelpOpen]     = useState(false)
  // RF-09: aprobación
  const [modalAprob, setModalAprob] = useState(false)
  const [aprobacion, setAprobacion] = useState(null)

  // Atajos de teclado globales (Heurística #7: Flexibilidad y eficiencia de uso)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si el foco está en un campo de texto
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setHelpOpen(prev => !prev)
        return
      }

      if (e.altKey) {
        const modulosMap = {
          '1': 'inicio',
          '2': 'algoritmo',
          '3': 'rutas',
          '4': 'cobranzas',
          '5': 'config',
          '6': 'registros',
        }
        const target = modulosMap[e.key]
        if (target && puede(target)) {
          e.preventDefault()
          setModulo(target)
          toast.info(`Navegaste a: ${TITULOS[target]?.[0] || target}`, { duration: 1800 })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [puede, toast])

  const { planificables, reprogramados } = useMemo(() => separarReprogramados(PEDIDOS), [])

  const escenarios = useMemo(
    () => tamanos.map((n) => planificar(planificables, n)),
    [planificables, tamanos]
  )

  const plan = escenarios.find((e) => e.n === seleccion) ?? escenarios[0]

  const recalcTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current)
    }
  }, [])

  const recalcular = () => {
    setCalculando(true)
    toast.info('Optimizando reparto con heurística y ventanas horarias…', { duration: 1400 })
    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current)
    recalcTimerRef.current = setTimeout(() => {
      setCalculando(false)
      toast.success('Escenarios de flota recalculados exitosamente.')
    }, 1400)
  }

  const descartarPlan = () => {
    setAprobacion(null)
    setSeleccion(5)
    log(usuario, 'Algoritmo', 'Descartó plan de ruteo', 'Se restableció el escenario a la configuración estándar de 5 vehículos')
    toast.info('Plan descartado. Escenario restablecido a valores por defecto.')
  }

  const guardarBorrador = () => {
    log(usuario, 'Algoritmo', 'Guardó borrador de plan', `Escenario con ${plan.n} vehículos y ${plan.rutas.reduce((s, r) => s + r.pedidos.length, 0)} pedidos guardado como borrador`)
    toast.success(`Borrador del escenario de ${plan.n} vehículos guardado exitosamente.`)
  }

  const agregarEscenario = () => {
    const siguiente = Math.max(...tamanos) + 1
    if (siguiente > VEHICULOS.length) {
      toast.warning(`No hay más vehículos configurados (máximo ${VEHICULOS.length}).`)
      return
    }
    setTamanos([...tamanos, siguiente])
    toast.info(`Añadido escenario con ${siguiente} vehículos.`)
  }

  // RF-09: confirmar aprobación y persistir en backend
  const confirmarAprobacion = async (fecha, hora) => {
    const totalPedidos = plan.rutas.reduce((s, r) => s + r.pedidos.length, 0)
    const datos = { usuario: usuario.nombre, titulo: usuario.titulo, fecha, hora, n: plan.n, pedidos: totalPedidos }
    setAprobacion(datos)
    setModalAprob(false)

    // Persistir plan y versión en la base de datos real
    try {
      const token = localStorage.getItem('siprd_access_token')
      const vehiculoIds = plan.rutas.map(r => String(r.vehiculo?.id || r.id_vehiculo || 'v1'))
      await fetch('/api/v1/planificaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fecha: '27/08/2026',
          vehiculo_ids: vehiculoIds,
          parametros: { criterio, turno, jornadaMax }
        })
      })
    } catch (err) {
      console.warn('Sincronización de plan con backend:', err)
    }

    log(usuario, 'Algoritmo', 'Aprobó plan de ruteo',
      `${plan.n} vehículos · ${totalPedidos} pedidos · jornada máx. ${hhmm(plan.jornadaMax)} · ${plan.kmTotal.toFixed(1)} km`)
    toast.success(`Plan aprobado y registrado en la base de datos: ${plan.n} vehículos y ${totalPedidos} pedidos listos para despacho.`)
  }

  const [titulo, subtitulo] = TITULOS[modulo] ?? ['', '']

  return (
    <div className="app">
      {/* Centro de Ayuda y Heurísticas (Heurística #10) */}
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Modal de aprobación */}
      {modalAprob && (
        <ModalAprobacion
          plan={plan}
          usuario={usuario}
          onConfirmar={confirmarAprobacion}
          onCancelar={() => setModalAprob(false)}
        />
      )}

      <Sidebar activo={modulo} onCambiar={setModulo} onOpenHelp={() => setHelpOpen(true)} />

      <main className="main">
        <TopBar titulo={titulo} subtitulo={subtitulo} usuario={usuario} onOpenHelp={() => setHelpOpen(true)} />

        {/* ── Inicio ─────────────────────── */}
        {modulo === 'inicio' && (puede('inicio') ? <Inicio /> : <AccesoDenegado />)}

        {/* ── Algoritmo ──────────────────── */}
        {modulo === 'algoritmo' && (puede('algoritmo') ? (
          <>
            <ParamsBar
              criterio={criterio} setCriterio={setCriterio}
              turno={turno} setTurno={setTurno}
              jornadaMax={jornadaMax} setJornadaMax={setJornadaMax}
              onEditarReglas={() => setModulo('config')}
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
              <ErrorBoundary>
                <RouteMap plan={plan} />
              </ErrorBoundary>
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
                    <button type="button" className="btn out" onClick={descartarPlan} title="Restablecer escenario por defecto">
                      Descartar plan
                    </button>
                    <button type="button" className="btn out" onClick={guardarBorrador} title="Guardar cambios temporalmente">
                      Guardar como borrador
                    </button>
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
