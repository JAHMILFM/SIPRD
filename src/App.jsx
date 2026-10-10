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
import { useDatos } from './context/DatosContext'
import { apiFetch } from './api/cliente'
import { PlanificacionPanel, UsuariosPanel, IncidenciasPanel } from './components/Operaciones'
import { planificar, separarReprogramados, hhmm } from './lib/planner'
import { useAuth } from './context/AuthContext'
import { useAudit } from './context/AuditContext'
import { useToast } from './context/ToastContext'

const TITULOS = {
  usuarios: ['Usuarios', 'Consulta y administra los datos, roles y estados de acceso.'],
  inicio:    ['Inicio',                   'Resumen de la operación del día.'],
  algoritmo: ['Algoritmo de Ruteo',       'Prueba cuántos vehículos necesita la jornada y ajusta el reparto antes de enviarlo a Rutas.'],
  rutas: ['Gestión de Rutas', 'Consulta la jornada, las entregas y las incidencias de cada ruta.'],
  incidencias: ['Incidencias', 'Seguimiento y resolución de incidencias de reparto.'],
  cobranzas: ['Cobranzas',               'Valida los pagos del día para que el repartidor pueda avanzar al siguiente punto.'],
  config:    ['Configuración',            'Capacidad de vehículos, reglas por cliente y accesos.'],
  registros: ['Registros de Auditoría',  'Trazabilidad de cambios: reglas, rutas, aprobaciones y cobros · RF-13 · RNF-09'],
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
  const { pedidos, vehiculos, reglas, recargar } = useDatos()
  const VEHICULOS = useMemo(() => vehiculos.filter(v => v.activo && ['DISPONIBLE', 'ASIGNADO'].includes(v.estado)), [vehiculos])
  const [fechaPlan, setFechaPlan] = useState('2026-10-10')
  const [propuesta, setPropuesta] = useState(null)
  const [gestionPlanes, setGestionPlanes] = useState(false)

  // Módulo inicial según rol
  const ORDEN_MODULOS = ['inicio', 'algoritmo', 'rutas', 'cobranzas', 'usuarios', 'config', 'registros', 'incidencias']
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
          '7': 'incidencias',
          '8': 'usuarios',
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

  const { planificables, reprogramados } = useMemo(() => separarReprogramados(pedidos.filter(p => p.estado === 'PENDIENTE' && p.habilitado !== false && p.fecha_corte === fechaPlan.split('-').reverse().join('/')), new Date(fechaPlan + 'T12:00:00').getDay()), [pedidos, fechaPlan])

  const escenarios = useMemo(
    () => (VEHICULOS.length < 3 ? [Math.max(1, VEHICULOS.length)] : tamanos.filter(n => n <= VEHICULOS.length)).map((n) => planificar(planificables, n, VEHICULOS)),
    [planificables, tamanos, VEHICULOS]
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
    setSeleccion(5)
    log(usuario, 'Algoritmo', 'Descartó plan de ruteo', 'Se restableció el escenario a la configuración estándar de 5 vehículos')
    toast.info('Plan descartado. Escenario restablecido a valores por defecto.')
  }

  const guardarBorrador = async () => {
    try {
      if (!plan.rutas.length) throw new Error('No hay vehículos operativos para generar la propuesta.')
      const result = await apiFetch('/planificaciones', { method: 'POST', body: JSON.stringify({
        fecha: fechaPlan.split('-').reverse().join('/'),
        vehiculo_ids: plan.rutas.map(r => Number(r.vehiculo.id)),
        parametros: { criterio, turno, jornadaMax }
      }) })
      setPropuesta({ id: result.planificacion_id, n: result.version_numero })
      setGestionPlanes(true); recargar()
      toast.success('Propuesta guardada. Revisa el resultado del motor y asigna sus repartidores antes de confirmar.')
    } catch (err) { toast.error(err.message) }
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

  const [titulo, subtitulo] = TITULOS[modulo] ?? ['', '']

  return (
    <div className="app">
      {/* Centro de Ayuda y Heurísticas (Heurística #10) */}
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <Modal isOpen={gestionPlanes} onClose={() => setGestionPlanes(false)} title="Propuestas y aprobación de rutas" maxWidth={1120}>
        {gestionPlanes && <PlanificacionPanel inicial={propuesta} fechaInicial={fechaPlan} />}
      </Modal>

      <Sidebar activo={modulo} onCambiar={setModulo} onOpenHelp={() => setHelpOpen(true)} />

      <main className="main">
        <TopBar titulo={titulo} subtitulo={subtitulo} usuario={usuario} onOpenHelp={() => setHelpOpen(true)} />

        {/* ── Inicio ─────────────────────── */}
        {modulo === 'inicio' && (puede('inicio') ? <Inicio /> : <AccesoDenegado />)}

        {/* ── Algoritmo ──────────────────── */}
        {modulo === 'algoritmo' && (puede('algoritmo') ? (
          <>
            <ParamsBar
              fecha={fechaPlan} setFecha={setFechaPlan} totalReglas={reglas.length}
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
              <OrdersPanel plan={plan} reprogramados={reprogramados} noPlanificables={pedidos.filter(p => p.estado === 'PENDIENTE' && p.habilitado === false).map(p => ({...p,motivo:'Pedido no habilitado',detalle:'Requiere revisión antes de planificar'}))} />
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
                  Vista previa de flota · {fechaPlan.split('-').reverse().join('/')} · Criterio:{' '}
                  {criterio === 'jornada' ? 'balancear jornada' : 'menor distancia'} · Turno{' '}
                  {turno === 'dia' ? 'día' : 'noche'} · Revisa la propuesta guardada antes de aprobar
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                {/* RF-09: badge o botones de aprobación */}
                  <div className="btns">
                    <button className="btn out" onClick={() => { setPropuesta(null); setGestionPlanes(true) }}>Propuestas guardadas</button>
                    <button type="button" className="btn out" onClick={descartarPlan} title="Restablecer escenario por defecto">
                      Descartar plan
                    </button>
                    <button type="button" className="btn out" onClick={guardarBorrador} title="Generar y guardar una propuesta en la base de datos">
                      Guardar como borrador
                    </button>
                    {puedeAprobar() ? (
                      <button className="btn green" onClick={() => { setPropuesta(null); setGestionPlanes(true) }}>
                        ✓ Aprobar y enviar a Rutas
                      </button>
                    ) : (
                      <button className="btn out" disabled title="Solo el Jefe de Distribución puede aprobar rutas">
                        🔒 Aprobación restringida al Jefe
                      </button>
                    )}
                  </div>
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
        {modulo === 'usuarios' && (puede('usuarios') ? <UsuariosPanel /> : <AccesoDenegado />)}
        {modulo === 'incidencias' && (puede('incidencias') ? <IncidenciasPanel /> : <AccesoDenegado />)}

        {/* ── Registros de auditoría ─────── */}
        {modulo === 'registros' && (puede('registros') ? <Registros /> : <AccesoDenegado />)}
      </main>
    </div>
  )
}
