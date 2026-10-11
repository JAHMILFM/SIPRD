import { useState, useEffect } from 'react'
import { DIAS_SEMANA } from '../data/mockRutas'
import {useOperacion} from '../context/OperacionContext'
import {apiFetch} from '../api/cliente'
import {vehiculoUI} from '../lib/adaptadores'
import Administracion from './Administracion'
import Modal from './common/Modal'
import { useAuth } from '../context/AuthContext'
import { useAudit } from '../context/AuditContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from './common/ConfirmDialog'

/**
 * Módulo Configuración.
 *
 * Administra el maestro de vehículos y las reglas de atención por cliente.
 * Incluye diálogo de confirmación para acciones destructivas (Heurística #5)
 * y reversión de eliminación de reglas mediante Deshacer (Heurística #3).
 */

const DIAS_CORTOS = DIAS_SEMANA
const TODOS_DIAS  = [1, 2, 3, 4, 5, 6, 0]
const VENTANAS_PRESET = ['Todo el día', '08:00–10:00', '08:00–11:00', '08:00–12:00', '08:00–13:00', '08:00–14:00', '08:00–15:00', '09:00–10:00', '09:00–13:00', '09:00–15:00', '10:00–14:00', '10:00–16:00', '13:00–18:00', '14:00–17:00']

const inputStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  fontFamily: 'inherit',
  color: '#0f172a',
  width: '100%',
  outline: 'none',
}

// ── Sub-formulario Vehículo (Alineado con siprd.vehiculos) ──────
function VehiculoRow({ v, onSave, onDelete }) {
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({
    ...v,
    estado: v.estado || (v.activo ? 'DISPONIBLE' : 'INACTIVO'),
  })

  const f = (k) => (e) => {
    let val = e.target.value
    if (k === 'activo') val = e.target.checked
    else if (k === 'pesoMax' || k === 'volMax' || k === 'año') val = Number(val) || 0
    setForm(p => ({ ...p, [k]: val }))
  }

  const guardar = () => {
    const pMax = Number(form.pesoMax) || 1
    const vMax = Number(form.volMax) || 1
    const st = form.estado || (form.activo ? 'DISPONIBLE' : 'INACTIVO')
    const act = st !== 'INACTIVO'

    onSave({
      ...form,
      capacidad_kg: pMax * 1000,
      capacidad_m3: vMax,
      pesoMax: pMax,
      volMax: vMax,
      estado: st,
      activo: act,
      conductor: String(form.conductor || '').trim() || 'Sin conductor asignado',
    })
    setEdit(false)
  }

  const estadoBadge = (st) => {
    const map = {
      DISPONIBLE: ['c-gn', '✓ DISPONIBLE'],
      ASIGNADO: ['c-md', '🚚 ASIGNADO'],
      MANTENIMIENTO: ['c-hi', '🔧 MANTENIMIENTO'],
      INACTIVO: ['c-lo', '✕ INACTIVO'],
    }
    const [cls, label] = map[st] ?? ['c-lo', st]
    return <span className={`chip ${cls}`}>{label}</span>
  }

  return (
    <tr style={{ background: !v.activo ? '#fafafa' : undefined }}>
      <td>
        <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>{v.placa}</span>
        <span style={{ display: 'block', color: '#64748b', fontSize: 10.5 }}>
          {v.codigo_externo ? `${v.codigo_externo} · ` : ''}{v.marca} {v.modelo} · {v.año || 2022}
        </span>
      </td>
      <td>
        {edit ? (
          <input
            value={form.conductor}
            readOnly title="El acceso de reparto está asociado a la placa del vehículo"
            style={inputStyle}
            placeholder="Nombre del chofer"
            aria-label="Conductor"
          />
        ) : (
          <span style={{ fontWeight: 500 }}>{v.conductor}</span>
        )}
      </td>
      <td className="num">
        {edit ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <input
              type="number"
              value={form.pesoMax}
              onChange={f('pesoMax')}
              style={{ ...inputStyle, width: 68, textAlign: 'right' }}
              min={0.5}
              max={30}
              step={0.5}
              aria-label="Peso máximo en toneladas"
            />
            <span style={{ fontSize: 9.5, color: '#64748b' }}>{(Number(form.pesoMax) || 0) * 1000} kg</span>
          </div>
        ) : (
          <>
            <strong>{v.pesoMax}</strong> t
            <span style={{ display: 'block', fontSize: 10, color: '#64748b' }}>
              {(v.capacidad_kg ?? (v.pesoMax * 1000)).toLocaleString('es-PE')} kg
            </span>
          </>
        )}
      </td>
      <td className="num">
        {edit ? (
          <input
            type="number"
            value={form.volMax}
            onChange={f('volMax')}
            style={{ ...inputStyle, width: 64, textAlign: 'right' }}
            min={1}
            max={100}
            step={1}
            aria-label="Volumen máximo en m3"
          />
        ) : (
          <><strong>{v.volMax}</strong> m³</>
        )}
      </td>
      <td>
        {edit ? (
          <select
            value={form.estado || (form.activo ? 'DISPONIBLE' : 'INACTIVO')}
            onChange={(e) => {
              const nuevoEstado = e.target.value
              setForm(p => ({
                ...p,
                estado: nuevoEstado,
                activo: nuevoEstado !== 'MANTENIMIENTO' && nuevoEstado !== 'INACTIVO',
              }))
            }}
            style={{ ...inputStyle, fontSize: 11, padding: '4px 6px' }}
            aria-label="Estado operativo del vehículo en base de datos"
          >
            <option value="DISPONIBLE">DISPONIBLE</option>

            <option value="MANTENIMIENTO">MANTENIMIENTO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        ) : (
          estadoBadge(v.estado || (v.activo ? 'DISPONIBLE' : 'INACTIVO'))
        )}
      </td>
      <td style={{ textAlign: 'center' }}>
        {edit ? (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button type="button" className="btn btn-success" style={{ padding: '4px 10px', fontSize: 11 }} onClick={guardar}>Guardar</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(false)}>Cancelar</button>
          </div>
        ) : (
          <><button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(true)}>Editar</button>
          {onDelete && <button className="btn out" onClick={onDelete} disabled={!v.activo}>Desactivar</button>}</>
        )}
      </td>
    </tr>
  )
}

// ── Sub-formulario Regla (Alineado con siprd.reglas_cliente) ───
function ReglaRow({ r, onSave, onDelete, clientes }) {
  const [edit, setEdit]         = useState(false)
  const [form, setForm]         = useState({ ...r, dias: r.dias ? [...r.dias] : null })
  const [sinRestr, setSinRestr] = useState(!r.dias)

  const toggleDia = (d) => setForm(p => {
    const dias = p.dias ? [...p.dias] : []
    return { ...p, dias: dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d].sort() }
  })

  const guardar = () => {
    const clienteNombre = form.cliente?.trim() || 'Cliente Sin Nombre'
    const [hIni, hFin] = (form.ventana && form.ventana.includes('–')) ? form.ventana.split('–') : [null, null]

    onSave({
      ...form,
      cliente: clienteNombre,
      dias: sinRestr ? null : form.dias,
      tipo_regla: form.tipo_regla || 'VENTANA_HORARIA',
      hora_inicio: hIni ? `${hIni.trim()}:00` : null,
      hora_fin: hFin ? `${hFin.trim()}:00` : null,
      es_restriccion_dura: form.es_restriccion_dura ?? true,
      activa: true,
    })
    setEdit(false)
  }

  return (
    <tr>
      <td className="cli" style={{ maxWidth: 220 }}>
        {edit ? (
          <select value={form.cliente_id || ''} onChange={e=>{const c=clientes.find(c=>String(c.id)===e.target.value);setForm(p=>({...p,cliente_id:c.id,cliente:c.nombre}))}} style={inputStyle} aria-label="Cliente"><option value="">Seleccione cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
        ) : (
          <><b>{r.cliente}</b><i>#{r.pedidoRef}</i></>
        )}
      </td>
      <td>
        {edit ? (
          <select
            value={form.ventana}
            onChange={e => setForm(p => ({ ...p, ventana: e.target.value }))}
            style={{ ...inputStyle, paddingRight: 6 }}
            aria-label="Ventana horaria de atención"
          >
            {VENTANAS_PRESET.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : (
          <span className="win">{r.ventana}</span>
        )}
      </td>
      <td>
        {edit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={sinRestr} onChange={e => setSinRestr(e.target.checked)} />
              Atiende todos los días
            </label>
            {!sinRestr && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {TODOS_DIAS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDia(d)}
                    style={{
                      width: 32, height: 26, borderRadius: 4,
                      border: `1px solid ${form.dias?.includes(d) ? 'var(--blue)' : '#cbd5e1'}`,
                      background: form.dias?.includes(d) ? 'var(--blue)' : '#fff',
                      color: form.dias?.includes(d) ? '#fff' : '#475569',
                      fontSize: 10.5, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {DIAS_CORTOS[d]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : r.dias ? (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {TODOS_DIAS.map(d => (
              <span
                key={d}
                style={{
                  width: 28, height: 22, borderRadius: 4, border: '1px solid',
                  display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700,
                  borderColor: r.dias.includes(d) ? '#2563EB' : '#e2e8f0',
                  background: r.dias.includes(d) ? '#dbeafe' : '#f8fafc',
                  color: r.dias.includes(d) ? '#1d4ed8' : '#94a3b8'
                }}
              >
                {DIAS_CORTOS[d]}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 11.5, color: '#64748b' }}>Sin restricción (todos los días)</span>
        )}
      </td>
      <td>{edit ? <><select value={form.tipo_restriccion||'RECIBE'} onChange={e=>setForm(p=>({...p,tipo_restriccion:e.target.value}))} style={inputStyle}><option value="RECIBE">Días de recepción</option><option value="NO_RECIBE">Días no disponibles</option><option value="VENTANA_HORARIA">Ventana horaria</option></select><input aria-label="Fecha específica opcional" type="date" value={form.fecha_especifica||''} onChange={e=>setForm(p=>({...p,fecha_especifica:e.target.value||null}))} style={inputStyle}/></> : <><span className="chip c-lo" style={{fontSize:10.5}}>{r.zona}</span><small style={{display:'block'}}>{r.tipo_restriccion==='NO_RECIBE'?'No recibe':'Recepción'} {r.fecha_especifica}</small></>}</td>
      <td style={{ textAlign: 'center' }}>
        {edit ? (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button type="button" className="btn btn-success" style={{ padding: '4px 10px', fontSize: 11 }} onClick={guardar}>Guardar</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(false)}>Cancelar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(true)}>Editar</button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ padding: '4px 9px', fontSize: 11 }}
              title="Eliminar regla"
              onClick={() => onDelete(r.id)}
            >
              ✕
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Componente principal ───────────────────────────────────────
export default function Configuracion() {
  const { usuario,puede } = useAuth()
  const operacion=useOperacion()
  const [clientes,setClientes]=useState([])
  const [altaVeh,setAltaVeh]=useState(false)
  const [vehNuevo,setVehNuevo]=useState({codigo_externo:'',placa:'',marca:'',modelo:'',capacidad_kg:1500,capacidad_m3:8,estado_operativo:'DISPONIBLE'})
  const { log }     = useAudit()
  const { toast }   = useToast()

  const [tab, setTab]             = useState('vehiculos')
  const [vehiculos, setVehs]      = useState([])
  const [reglas, setReglas]       = useState([])
  const [reglaAEliminar, setReglaAEliminar] = useState(null) // ID para ConfirmDialog

  const cargar=async()=>{
    try{
      if(puede('vehiculos'))setVehs((await apiFetch('/vehiculos')).map(vehiculoUI))
      if(puede('clientes')&&puede('restricciones')){
        const [cs,rs]=await Promise.all([apiFetch('/clientes'),apiFetch('/restricciones')]);setClientes(cs)
        const grupos=new Map()
        for(const r of rs){const key=`${r.id_cliente}-${r.fecha_especifica||''}-${r.tipo_restriccion}`;const c=cs.find(c=>c.id===r.id_cliente);if(!c)continue
          if(!grupos.has(key))grupos.set(key,{id:key,cliente_id:c.id,cliente:c.nombre,ids:[],dias:[],ventana:r.hora_inicio?`${r.hora_inicio.slice(0,5)}–${r.hora_fin.slice(0,5)}`:'Todo el día',zona:c.distrito||'—',pedidoRef:c.id,tipo_restriccion:r.tipo_restriccion,fecha_especifica:r.fecha_especifica})
          const g=grupos.get(key);g.ids.push(r.id_restriccion);if(r.dia_semana && g.dias)g.dias.push(r.dia_semana===7?0:r.dia_semana);else g.dias=null
        }
        setReglas([...grupos.values()])
      }
    }catch(e){toast.error(e.message)}
  }
  useEffect(()=>{cargar()},[])
  const saveVeh=async(form)=>{
    try{await apiFetch(`/vehiculos/${form.id}`,{method:'PUT',body:JSON.stringify({codigo_externo:form.codigo_externo,placa:form.placa,marca:form.marca,modelo:form.modelo,capacidad_kg:Number(form.pesoMax)*1000,capacidad_m3:Number(form.volMax),estado_operativo:form.estado,activo:form.activo})});await cargar();await operacion.refresh();toast.success('Vehículo actualizado.')}catch(e){toast.error(e.message)}
  }
  const saveRegla=async(form)=>{
    if(!form.cliente_id){toast.warning('Seleccione un cliente registrado.');return}
    const horas=form.ventana.split(/[–-]/)
    try{await apiFetch(`/clientes/${form.cliente_id}/disponibilidad`,{method:'PUT',body:JSON.stringify({dias:form.dias,hora_inicio:horas.length===2?horas[0].trim():null,hora_fin:horas.length===2?horas[1].trim():null,tipo_restriccion:form.tipo_restriccion || 'RECIBE',fecha_especifica:form.fecha_especifica||null})});await cargar();toast.success('Restricciones guardadas.')}catch(e){toast.error(e.message)}
  }
  const solicitarEliminacion=id=>setReglaAEliminar(id)
  const ejecutarEliminacion=async()=>{
    const r=reglas.find(r=>r.id===reglaAEliminar)
    try{for(const id of r.ids||[])await apiFetch(`/restricciones/${id}/desactivar`,{method:'POST'});await cargar();setReglaAEliminar(null);toast.success('Restricciones desactivadas.')}catch(e){toast.error(e.message)}
  }
  const addRegla=()=>setReglas(prev=>[{id:`nueva-${Date.now()}`,cliente_id:null,cliente:'Seleccione cliente',ids:[],ventana:'08:00–15:00',dias:null,zona:'—',tipo_restriccion:'RECIBE'},...prev])
  const crearVeh=async()=>{
    try{await apiFetch('/vehiculos',{method:'POST',body:JSON.stringify(vehNuevo)});setAltaVeh(false);await cargar();await operacion.refresh();toast.success('Vehículo registrado.')}catch(e){toast.error(e.message)}
  }

  const reglaSeleccionada = reglaAEliminar ? reglas.find(r => r.id === reglaAEliminar) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {altaVeh && <Modal isOpen title="Registrar vehículo" onClose={()=>setAltaVeh(false)}><form onSubmit={e=>{e.preventDefault();crearVeh()}}>{Object.keys(vehNuevo).filter(k=>k!=='estado_operativo').map(k=><label key={k} style={{display:'block',marginBottom:10}}>{k.replaceAll('_',' ')}<input required type={k.startsWith('capacidad')?'number':'text'} min="0.01" step="any" value={vehNuevo[k]} onChange={e=>setVehNuevo(p=>({...p,[k]:k.startsWith('capacidad')?Number(e.target.value):e.target.value}))} style={inputStyle}/></label>)}<button className="btn blue">Guardar vehículo</button></form></Modal>}


      {/* Diálogo destructivo accesible (Heurística #5) */}
      <ConfirmDialog
        isOpen={Boolean(reglaAEliminar)}
        title="¿Eliminar regla de cliente?"
        message={`¿Estás seguro de que deseas eliminar las restricciones para "${reglaSeleccionada?.cliente}"?`}
        consequence="El algoritmo ya no considerará ventanas horarias ni días restringidos para este cliente, pudiendo asignarlo en fechas no hábiles."
        confirmLabel="Eliminar regla"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={ejecutarEliminacion}
        onCancel={() => setReglaAEliminar(null)}
      />

      {/* Aviso de impacto visual */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20, flex: '0 0 auto', marginTop: 1 }}>ℹ️</span>
        <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
          <strong>Impacto directo en la planificación:</strong> Los parámetros configurados aquí definen las restricciones de capacidad en peso y volumen que el motor heurístico evaluará en el siguiente tanteo de flota (RF-02 y RF-06).
        </div>
      </div>

      <div className="card">
        {/* Tabs */}
        <div className="tabs">
          <button className={tab === 'vehiculos' ? 'on' : ''} onClick={() => setTab('vehiculos')}>
            🚚 Maestro de Vehículos <span className="cnt">{vehiculos.length}</span>
          </button>
          <button className={tab === 'reglas' ? 'on' : ''} onClick={() => setTab('reglas')}>
            📋 Reglas de Clientes <span className="cnt">{reglas.length}</span>
          </button>
          {puede('usuarios') && <button className={tab==='usuarios'?'on':''} onClick={()=>setTab('usuarios')}>Usuarios y permisos</button>}
        </div>

        {tab==='usuarios' && <Administracion/>}
        {/* Cabecera de acciones */}
        <div className="ch">
          {tab === 'vehiculos' && (
            <div>
              <h3>Maestro de flota de transporte</h3><button className="btn out" onClick={()=>setAltaVeh(true)}>＋ Registrar vehículo</button>
              <p>Capacidad máxima de peso (t) y volumen (m³) que el algoritmo usa para repartir pedidos sin saturación.</p>
            </div>
          )}
          {tab === 'reglas' && (
            <>
              <div>
                <h3>Reglas de atención por cliente</h3>
                <p>Ventanas horarias y días permitidos. Los pedidos incompatibles quedan señalados para su revisión y reprogramación.</p>
              </div>
              <div className="btns">
                <button type="button" className="btn btn-primary" onClick={addRegla} style={{ fontSize: 12, padding: '7px 14px' }}>
                  ＋ Nueva regla
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Pestaña Vehículos ── */}
        {tab === 'vehiculos' && (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>VEHÍCULO</th>
                  <th>CONDUCTOR ASIGNADO</th>
                  <th className="num">PESO MÁX.</th>
                  <th className="num">VOLUMEN MÁX.</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'center', width: 140 }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {vehiculos.map(v => <VehiculoRow key={v.id} v={v} onSave={saveVeh} onDelete={async()=>{try{await apiFetch(`/vehiculos/${v.id}/desactivar`,{method:'POST'});await cargar();await operacion.refresh()}catch(e){toast.error(e.message)}}} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pestaña Reglas ── */}
        {tab === 'reglas' && (
          <>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>CLIENTE</th>
                    <th style={{ minWidth: 130 }}>VENTANA HORARIA</th>
                    <th style={{ minWidth: 240 }}>DÍAS QUE ATIENDE</th>
                    <th>ZONA</th>
                    <th style={{ textAlign: 'center', width: 140 }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {reglas.map(r => <ReglaRow key={r.id} r={r} clientes={clientes} onSave={saveRegla} onDelete={solicitarEliminacion} />)}
                  {reglas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        <b>Sin reglas configuradas</b>
                        <p style={{ marginTop: 4, color: '#64748b' }}>El algoritmo tratará a todos los clientes como disponibles todo el día sin reprogramaciones.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="foot">
              <span>{reglas.length} reglas activas registradas en el sistema</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
