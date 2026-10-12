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
import {useOperacion} from './context/OperacionContext'
import {apiFetch} from './api/cliente'
import {planUI} from './lib/adaptadores'
import Reparto from './components/Reparto'
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
  reparto: ['Reparto', 'Pedidos asignados a su vehículo y jornada.'],
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
  const operacion=useOperacion()
  const {fecha,vehiculos,pedidos,refresh,setPlan}=operacion
  const moduloInicial = puede('reparto') ? 'reparto' : puede('inicio') ? 'inicio' : puede('cobranzas') ? 'cobranzas' : puede('config') ? 'config' : 'registros'

  const [modulo, setModulo]         = useState(moduloInicial)
  const [criterio, setCriterio]     = useState('jornada')
  const [turno, setTurno]           = useState('dia')
  const [jornadaMax, setJornadaMax] = useState(8)
  const [tamanos, setTamanos]       = useState([3, 4, 5, 6])
  const [seleccion, setSeleccion]   = useState(6)
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

  const disponibles=useMemo(()=>vehiculos.filter(v=>v.activo&&v.estado_operativo==='DISPONIBLE').sort((a,b)=>Number(!a.codigo_externo?.startsWith('DEMO6-V'))-Number(!b.codigo_externo?.startsWith('DEMO6-V'))),[vehiculos])
  const [elegidos,setElegidos]=useState(null),[selector,setSelector]=useState(false)
  const flota=disponibles.filter(v=>!elegidos || elegidos.includes(v.id))
  const planificables=pedidos.filter(p=>p.estado==='PENDIENTE')
  const reprogramados=[]
  const [escenarios,setEscenarios]=useState([])
  const [planGuardado,setPlanGuardado]=useState(null)
  const vacio=planUI({rutas:[]},[],[],seleccion)
  const plan=planGuardado ? planUI(planGuardado,vehiculos,pedidos,seleccion) : escenarios.find(e=>e.n===seleccion) || (operacion.plan ? planUI(operacion.plan,vehiculos,pedidos) : vacio)
  const recalcTimerRef=useRef(0)
  const recalcular=async()=>{
    if(!flota.length){toast.warning('Seleccione vehículos disponibles.');return}
    const peticion=++recalcTimerRef.current
    setCalculando(true);setPlanGuardado(null);setAprobacion(null)
    try{
      const resultados=[]
      for(const n of tamanos.filter(n=>n<=flota.length)){
        const sol=await apiFetch('/planificaciones/previsualizar',{method:'POST',body:JSON.stringify({fecha,vehiculo_ids:flota.slice(0,n).map(v=>v.id),parametros:{inicio_jornada:turno==='dia'?'07:30':'15:00',jornada_horas:jornadaMax,criterio},replanificar_id:operacion.plan?.estado==='CONFIRMADA'?operacion.plan.id:undefined})})
        resultados.push(planUI(sol,vehiculos,pedidos,n))
      }
      if(peticion!==recalcTimerRef.current)return
      setEscenarios(resultados)
      if(resultados.length && !resultados.some(x=>x.n===seleccion))setSeleccion(resultados[0].n)
      toast.success('Escenarios calculados con los pedidos de la base de datos.')
    }catch(e){if(peticion===recalcTimerRef.current)toast.error(e.message)}finally{if(peticion===recalcTimerRef.current)setCalculando(false)}
  }
  useEffect(()=>{setEscenarios([]);setPlanGuardado(null);setAprobacion(null)},[fecha,criterio,turno,jornadaMax])
  useEffect(()=>{if(modulo==='algoritmo'&&flota.length&&(planificables.length || operacion.plan?.estado==='CONFIRMADA'))recalcular()},[modulo,fecha,vehiculos.length,criterio,turno,jornadaMax])
  const guardarPropuesta=async()=>{
    if(planGuardado)return planGuardado
    if(!escenarios.length && operacion.plan && operacion.plan.rutas.length===seleccion && (operacion.plan.parametros?.criterio || 'jornada')===criterio && (operacion.plan.parametros?.jornada_horas || 8)===jornadaMax && (operacion.plan.parametros?.inicio_jornada || '07:30').slice(0,5)===(turno==='dia'?'07:30':'15:00'))return operacion.plan
    const raw=await apiFetch('/planificaciones',{method:'POST',body:JSON.stringify({fecha,vehiculo_ids:flota.slice(0,seleccion).map(v=>v.id),parametros:{inicio_jornada:turno==='dia'?'07:30':'15:00',jornada_horas:jornadaMax,criterio},replanificar_id:operacion.plan?.estado==='CONFIRMADA'?operacion.plan.id:undefined})})
    setPlanGuardado(raw);setPlan(raw);return raw
  }

  const moverPedido = async (pedido,delta) => {
    setCalculando(true)
    try {
      const raw=await guardarPropuesta()
      const ruta=raw.rutas.find(r=>r.paradas.some(s=>String(s.pedido_id)===String(pedido.pedido_id)))
      if(!ruta)throw new Error('El pedido no pertenece a la propuesta guardada.')
      const i=ruta.paradas.findIndex(s=>String(s.pedido_id)===String(pedido.pedido_id)),j=i+delta
      if(j<0||j>=ruta.paradas.length)return
      const grupos=raw.rutas.map(r=>({id_ruta:r.id,parada_ids:r.paradas.map(s=>s.id)}))
      const ids=grupos.find(g=>g.id_ruta===ruta.id).parada_ids
      ;[ids[i],ids[j]]=[ids[j],ids[i]]
      const actualizado=await apiFetch(`/planificaciones/${raw.id}/distribucion`,{method:'PUT',body:JSON.stringify({rutas:grupos})})
      setPlanGuardado(actualizado);setPlan(actualizado);toast.success('Orden guardado; horarios y capacidades verificados.')
    }catch(e){toast.error(e.message)}finally{setCalculando(false)}
  }

  const descartarPlan = () => {
    setAprobacion(null)
    setSeleccion(6)
    log(usuario, 'Algoritmo', 'Descartó plan de ruteo', 'Se restableció el escenario a la configuración estándar de 5 vehículos')
    toast.info('Plan descartado. Escenario restablecido a valores por defecto.')
  }

  const guardarBorrador = async () => {
    try{await guardarPropuesta();toast.success('Propuesta guardada en la base de datos.');await refresh()}catch(e){toast.error(e.message)}
  }

  const agregarEscenario = () => {
    const siguiente = Math.max(...tamanos) + 1
    if (siguiente > flota.length) {
      toast.warning(`No hay más vehículos configurados (máximo ${flota.length}).`)
      return
    }
    setTamanos([...tamanos, siguiente])
    toast.info(`Añadido escenario con ${siguiente} vehículos.`)
  }

  // RF-09: confirmar aprobación y persistir en backend
  const confirmarAprobacion = async (fechaTexto, hora) => {
    setCalculando(true)
    try{
      const guardado=await guardarPropuesta()
      const confirmado=await apiFetch(`/planificaciones/${guardado.id}/confirmar`,{method:'POST'})
      setPlanGuardado(confirmado);setPlan(confirmado)
      setAprobacion({usuario:usuario.nombre,titulo:usuario.titulo,fecha:fechaTexto,hora,n:confirmado.rutas.length,pedidos:confirmado.rutas.reduce((s,r)=>s+r.paradas.length,0)})
      setModalAprob(false);await refresh();toast.success('Planificación confirmada y disponible para reparto.')
    }catch(e){toast.error(e.message)}finally{setCalculando(false)}
  }

  const [titulo, subtitulo] = TITULOS[modulo] ?? ['', '']

  return (
    <div className={puede('reparto') ? 'app app-reparto' : 'app'}>
      {/* Centro de Ayuda y Heurísticas (Heurística #10) */}
      {selector && <Modal isOpen title="Seleccionar vehículos" onClose={()=>setSelector(false)}><div className="tw">{disponibles.map(v=><label key={v.id} style={{display:'block',padding:8}}><input type="checkbox" checked={flota.some(x=>x.id===v.id)} onChange={e=>setElegidos(e.target.checked?[...flota.map(x=>x.id),v.id]:flota.filter(x=>x.id!==v.id).map(x=>x.id))}/> {v.placa} · {v.capacidad_kg} kg · {v.capacidad_m3} m³</label>)}</div><button className="btn blue" onClick={()=>{setSelector(false);recalcular()}}>Aplicar y recalcular</button></Modal>}
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
        {operacion.error && <div className="warnbox">{operacion.error}</div>}
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

            <button className="btn out" onClick={()=>setSelector(true)}>Seleccionar vehículos · {flota.length} disponibles</button>
            <FleetTrial
              escenarios={escenarios}
              seleccion={seleccion}
              onSeleccionar={n=>{setSeleccion(n);setPlanGuardado(null);setAprobacion(null)}}
              onAgregar={agregarEscenario}
              onRecalcular={recalcular}
              calculando={calculando}
              jornadaMax={jornadaMax}
              totalPedidos={plan.rutas.reduce((n,r)=>n+r.pedidos.length,0)+plan.sinAsignar.length}
            />

            <div className="split">
              <OrdersPanel onMover={moverPedido} ocupado={calculando} plan={plan} reprogramados={reprogramados} noPlanificables={plan.sinAsignar.filter(p=>p.codigo==='RESTRICCION_O_COORDENADAS')} />
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
                  Fecha operativa: {fecha} · Criterio:{' '}
                  {criterio === 'jornada' ? 'reducir duración de jornada' : 'menor distancia'} · Turno{' '}
                  {turno === 'dia' ? 'día' : 'noche'} · Motor: optimización por zonas · {plan.fuente || 'pendiente de cálculo'}
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
                    <button type="button" className="btn out" disabled={calculando || !plan.rutas.length} onClick={guardarBorrador} title="Guardar cambios temporalmente">
                      Guardar como borrador
                    </button>
                    {puedeAprobar() ? (
                      <button className="btn green" disabled={calculando || !plan.rutas.length} onClick={() => setModalAprob(true)}>
                        ✓ Aprobar y enviar a Rutas
                      </button>
                    ) : (
                      <button className="btn out" disabled title="Su rol no tiene permiso para confirmar rutas">
                        🔒 Confirmación restringida
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

        {modulo === 'reparto' && (puede('reparto') ? <Reparto /> : <AccesoDenegado />)}

        {/* ── Registros de auditoría ─────── */}
        {modulo === 'registros' && (puede('registros') ? <Registros /> : <AccesoDenegado />)}
      </main>
    </div>
  )
}
