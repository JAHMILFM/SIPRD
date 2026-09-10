import { useState } from 'react'
import { VEHICULOS_CONFIG, REGLAS_CLIENTE, DIAS_SEMANA } from '../data/mockRutas'
import { useAuth } from '../context/AuthContext'
import { useAudit } from '../context/AuditContext'

/**
 * Módulo Configuración.
 *
 * Dos pestañas:
 *  1. Vehículos — maestro con capacidad (peso t y volumen m³), conductor, activo/inactivo
 *  2. Reglas por cliente — ventanas horarias y días de atención que el algoritmo
 *     aplica automáticamente (RF-13). Sin esto el asistente las recuerda de memoria.
 */

const DIAS_CORTOS = DIAS_SEMANA  // { 0:'Dom', 1:'Lun', ... }
const TODOS_DIAS  = [1, 2, 3, 4, 5, 6, 0]
const VENTANAS_PRESET = ['Todo el día', '08:00–10:00', '08:00–11:00', '08:00–12:00', '08:00–13:00', '08:00–14:00', '09:00–10:00', '09:00–13:00', '09:00–15:00', '10:00–14:00', '10:00–16:00', '13:00–18:00', '14:00–17:00']

// ── Sub-formulario Vehículo ───────────────────────────────────
function VehiculoRow({ v, onSave }) {
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ ...v })

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: k === 'activo' ? e.target.checked : e.target.value }))
  const guardar = () => { onSave(form); setEdit(false) }

  return (
    <tr style={{ background: !v.activo ? '#fafafa' : undefined }}>
      <td>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{v.placa}</span>
        <span style={{ display: 'block', color: '#94a3b8', fontSize: 10 }}>{v.marca} {v.modelo} · {v.año}</span>
      </td>
      <td>{edit ? <input value={form.conductor} onChange={f('conductor')} style={inp} /> : v.conductor}</td>
      <td className="num">
        {edit ? <input type="number" value={form.pesoMax} onChange={f('pesoMax')} style={{ ...inp, width: 56 }} min={1} max={20} /> : <><strong>{v.pesoMax}</strong> t</>}
      </td>
      <td className="num">
        {edit ? <input type="number" value={form.volMax} onChange={f('volMax')} style={{ ...inp, width: 56 }} min={1} max={60} /> : <><strong>{v.volMax}</strong> m³</>}
      </td>
      <td>
        {edit
          ? <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={form.activo} onChange={f('activo')} /> Activo
            </label>
          : <span className={`chip ${v.activo ? 'c-gn' : 'c-lo'}`}>{v.activo ? 'Activo' : 'Inactivo'}</span>}
      </td>
      <td style={{ textAlign: 'center' }}>
        {edit
          ? <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              <button className="btn green" style={{ padding: '4px 10px', fontSize: 11 }} onClick={guardar}>Guardar</button>
              <button className="btn out"   style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(false)}>Cancelar</button>
            </div>
          : <button className="btn out" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(true)}>Editar</button>}
      </td>
    </tr>
  )
}

// ── Sub-formulario Regla ──────────────────────────────────────
function ReglaRow({ r, onSave, onDelete }) {
  const [edit, setEdit]   = useState(false)
  const [form, setForm]   = useState({ ...r, dias: r.dias ? [...r.dias] : null })
  const [sinRestr, setSinRestr] = useState(!r.dias)

  const toggleDia = (d) => setForm(p => {
    const dias = p.dias ? [...p.dias] : []
    return { ...p, dias: dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d].sort() }
  })
  const guardar = () => { onSave({ ...form, dias: sinRestr ? null : form.dias }); setEdit(false) }

  return (
    <tr>
      <td className="cli" style={{ maxWidth: 220 }}>
        {edit ? <input value={form.cliente} onChange={e => setForm(p=>({...p,cliente:e.target.value}))} style={{ ...inp, width: '100%' }} /> : <><b>{r.cliente}</b><i>#{r.pedidoRef}</i></>}
      </td>
      <td>
        {edit
          ? <select value={form.ventana} onChange={e => setForm(p=>({...p,ventana:e.target.value}))} style={{ ...inp, paddingRight: 4 }}>
              {VENTANAS_PRESET.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          : <span className="win">{r.ventana}</span>}
      </td>
      <td>
        {edit
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={sinRestr} onChange={e => setSinRestr(e.target.checked)} />
                Sin restricción de días
              </label>
              {!sinRestr && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {TODOS_DIAS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDia(d)} style={{ width: 30, height: 24, borderRadius: 4, border: `1px solid ${form.dias?.includes(d) ? '#2563EB' : '#e2e8f0'}`, background: form.dias?.includes(d) ? '#2563EB' : '#fff', color: form.dias?.includes(d) ? '#fff' : '#64748b', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                      {DIAS_CORTOS[d]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          : r.dias
            ? <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {TODOS_DIAS.map(d => (
                  <span key={d} style={{ width: 26, height: 20, borderRadius: 4, border: '1px solid', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 600, borderColor: r.dias.includes(d) ? '#2563EB' : '#e2e8f0', background: r.dias.includes(d) ? '#dbeafe' : '#f8fafc', color: r.dias.includes(d) ? '#1d4ed8' : '#94a3b8' }}>
                    {DIAS_CORTOS[d]}
                  </span>
                ))}
              </div>
            : <span style={{ fontSize: 11, color: '#64748b' }}>Sin restricción</span>}
      </td>
      <td><span className="chip c-lo" style={{ fontSize: 10 }}>{r.zona}</span></td>
      <td style={{ textAlign: 'center' }}>
        {edit
          ? <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
              <button className="btn green" style={{ padding: '4px 9px', fontSize: 11 }} onClick={guardar}>Guardar</button>
              <button className="btn out"   style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => setEdit(false)}>Cancelar</button>
            </div>
          : <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
              <button className="btn out" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => setEdit(true)}>Editar</button>
              <button style={{ padding: '4px 9px', fontSize: 11, border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }} onClick={() => onDelete(r.id)}>✕</button>
            </div>}
      </td>
    </tr>
  )
}

// ── estilos inline reutilizables ──────────────────────────────
const inp = { border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit', color: '#0f172a', width: '100%' }

// ── Componente principal ────────────────────────────────────────────────
export default function Configuracion() {
  const { usuario }         = useAuth()
  const { log }             = useAudit()
  const [tab, setTab]         = useState('vehiculos')
  const [vehiculos, setVehs]  = useState(VEHICULOS_CONFIG)
  const [reglas, setReglas]   = useState(REGLAS_CLIENTE)
  const [guardado, setGuardado] = useState(false)

  // vehículos
  const saveVeh = (form) => {
    setVehs(prev => prev.map(v => v.id === form.id ? form : v))
    // RF-13: registrar cambio en vehículo
    log(usuario, 'Configuración', 'Modificó vehículo', `${form.placa} · Peso: ${form.pesoMax}t · Vol: ${form.volMax}m³ · Conductor: ${form.conductor}`)
    setGuardado(true); setTimeout(() => setGuardado(false), 2500)
  }

  // reglas
  const saveRegla = (form) => {
    setReglas(prev => prev.map(r => r.id === form.id ? form : r))
    // RF-13: registrar cambio en regla de cliente
    log(usuario, 'Configuración', 'Modificó regla de cliente', `${form.cliente} · Ventana: ${form.ventana} · Días: ${form.dias ? form.dias.join(',') : 'todos'}`)
    setGuardado(true); setTimeout(() => setGuardado(false), 2500)
  }
  const deleteRegla = (id) => {
    const regla = reglas.find(r => r.id === id)
    setReglas(prev => prev.filter(r => r.id !== id))
    // RF-13: registrar eliminación de regla
    if (regla) log(usuario, 'Configuración', 'Eliminó regla de cliente', `${regla.cliente}`)
  }
  const addRegla = () => {
    const newId = `r${Date.now()}`
    setReglas(prev => [...prev, { id: newId, cliente: 'Nuevo cliente', pedidoRef: '—', ventana: 'Todo el día', dias: null, zona: 'Centro' }])
    // RF-13: registrar creación de regla
    log(usuario, 'Configuración', 'Creó regla de cliente', 'Nueva regla en blanco añadida')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Aviso de impacto */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, flex: '0 0 auto', marginTop: 1 }}>ℹ️</span>
        <div style={{ fontSize: 11.5, color: '#1e40af' }}>
          <strong>Impacto directo en el algoritmo.</strong> Los cambios aquí se aplican en el próximo cálculo.
          La capacidad de vehículos determina cuánto peso y volumen puede tomar cada camión.
          Las reglas de cliente generan reprogramaciones automáticas (RF-12 y RF-13).
        </div>
      </div>

      <div className="card">
        {/* Tabs */}
        <div className="tabs">
          <button className={tab === 'vehiculos' ? 'on' : ''} onClick={() => setTab('vehiculos')}>
            🚚 Vehículos <span className="cnt">{vehiculos.length}</span>
          </button>
          <button className={tab === 'reglas' ? 'on' : ''} onClick={() => setTab('reglas')}>
            📋 Reglas por cliente <span className="cnt">{reglas.length}</span>
          </button>
        </div>

        {/* Cabecera de acciones */}
        <div className="ch">
          {tab === 'vehiculos' && (
            <>
              <div>
                <h3>Maestro de vehículos</h3>
                <p>Capacidad máxima de peso (t) y volumen (m³) que el algoritmo usa para distribuir pedidos.</p>
              </div>
              <div className="btns">
                {guardado && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Guardado</span>}
              </div>
            </>
          )}
          {tab === 'reglas' && (
            <>
              <div>
                <h3>Reglas por cliente</h3>
                <p>Ventanas horarias y días de atención que el algoritmo aplica automáticamente al generar rutas.</p>
              </div>
              <div className="btns">
                {guardado && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Guardado</span>}
                <button className="btn blue" onClick={addRegla} style={{ fontSize: 12, padding: '7px 13px' }}>＋ Nueva regla</button>
              </div>
            </>
          )}
        </div>

        {/* ── Vehículos ── */}
        {tab === 'vehiculos' && (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>VEHÍCULO</th><th>CONDUCTOR</th>
                  <th className="num">PESO MÁX.</th><th className="num">VOLUMEN MÁX.</th>
                  <th>ESTADO</th><th style={{ textAlign: 'center', width: 130 }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {vehiculos.map(v => <VehiculoRow key={v.id} v={v} onSave={saveVeh} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Reglas por cliente ── */}
        {tab === 'reglas' && (
          <>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>CLIENTE</th>
                    <th style={{ minWidth: 130 }}>VENTANA HORARIA</th>
                    <th style={{ minWidth: 230 }}>DÍAS QUE ATIENDE</th>
                    <th>ZONA</th>
                    <th style={{ textAlign: 'center', width: 140 }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {reglas.map(r => <ReglaRow key={r.id} r={r} onSave={saveRegla} onDelete={deleteRegla} />)}
                  {reglas.length === 0 && (
                    <tr><td colSpan={5} className="empty"><b>Sin reglas configuradas</b>El algoritmo tratará todos los clientes como disponibles todo el día.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="foot">
              <span>{reglas.length} reglas activas · El algoritmo reprogramará automáticamente los pedidos que no cumplan</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
