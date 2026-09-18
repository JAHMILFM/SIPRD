import { useState } from 'react'
import { VEHICULOS_CONFIG, REGLAS_CLIENTE, DIAS_SEMANA } from '../data/mockRutas'
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
const VENTANAS_PRESET = ['Todo el día', '08:00–10:00', '08:00–11:00', '08:00–12:00', '08:00–13:00', '08:00–14:00', '09:00–10:00', '09:00–13:00', '09:00–15:00', '10:00–14:00', '10:00–16:00', '13:00–18:00', '14:00–17:00']

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

// ── Sub-formulario Vehículo ───────────────────────────────────
function VehiculoRow({ v, onSave }) {
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ ...v })

  const f = (k) => (e) => {
    let val = e.target.value
    if (k === 'activo') val = e.target.checked
    else if (k === 'pesoMax' || k === 'volMax' || k === 'año') val = Number(val) || 0
    setForm(p => ({ ...p, [k]: val }))
  }
  
  const guardar = () => {
    onSave({
      ...form,
      pesoMax: Number(form.pesoMax) || 1,
      volMax: Number(form.volMax) || 1,
      conductor: String(form.conductor || '').trim() || 'Sin conductor asignado',
    })
    setEdit(false)
  }

  return (
    <tr style={{ background: !v.activo ? '#fafafa' : undefined }}>
      <td>
        <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>{v.placa}</span>
        <span style={{ display: 'block', color: '#64748b', fontSize: 10.5 }}>{v.marca} {v.modelo} · {v.año}</span>
      </td>
      <td>
        {edit ? (
          <input
            value={form.conductor}
            onChange={f('conductor')}
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
          <input
            type="number"
            value={form.pesoMax}
            onChange={f('pesoMax')}
            style={{ ...inputStyle, width: 64, textAlign: 'right' }}
            min={0.5}
            max={30}
            step={0.5}
            aria-label="Peso máximo en toneladas"
          />
        ) : (
          <><strong>{v.pesoMax}</strong> t</>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <input type="checkbox" checked={form.activo} onChange={f('activo')} /> Activo en flota
          </label>
        ) : (
          <span className={`chip ${v.activo ? 'c-gn' : 'c-lo'}`}>
            {v.activo ? '✓ Activo' : '✕ Inactivo'}
          </span>
        )}
      </td>
      <td style={{ textAlign: 'center' }}>
        {edit ? (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button type="button" className="btn btn-success" style={{ padding: '4px 10px', fontSize: 11 }} onClick={guardar}>Guardar</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(false)}>Cancelar</button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEdit(true)}>Editar</button>
        )}
      </td>
    </tr>
  )
}

// ── Sub-formulario Regla ──────────────────────────────────────
function ReglaRow({ r, onSave, onDelete }) {
  const [edit, setEdit]         = useState(false)
  const [form, setForm]         = useState({ ...r, dias: r.dias ? [...r.dias] : null })
  const [sinRestr, setSinRestr] = useState(!r.dias)

  const toggleDia = (d) => setForm(p => {
    const dias = p.dias ? [...p.dias] : []
    return { ...p, dias: dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d].sort() }
  })

  const guardar = () => {
    const clienteNombre = form.cliente?.trim() || 'Cliente Sin Nombre'
    onSave({ ...form, cliente: clienteNombre, dias: sinRestr ? null : form.dias })
    setEdit(false)
  }

  return (
    <tr>
      <td className="cli" style={{ maxWidth: 220 }}>
        {edit ? (
          <input
            value={form.cliente}
            onChange={e => setForm(p => ({ ...p, cliente: e.target.value }))}
            style={inputStyle}
            placeholder="Nombre del cliente o razón social"
            aria-label="Nombre del cliente"
          />
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
      <td><span className="chip c-lo" style={{ fontSize: 10.5 }}>{r.zona}</span></td>
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
  const { usuario } = useAuth()
  const { log }     = useAudit()
  const { toast }   = useToast()

  const [tab, setTab]             = useState('vehiculos')
  const [vehiculos, setVehs]      = useState(VEHICULOS_CONFIG)
  const [reglas, setReglas]       = useState(REGLAS_CLIENTE)
  const [reglaAEliminar, setReglaAEliminar] = useState(null) // ID para ConfirmDialog

  // Guardar vehículo
  const saveVeh = (form) => {
    setVehs(prev => prev.map(v => v.id === form.id ? form : v))
    log(usuario, 'Configuración', 'Modificó vehículo', `${form.placa} · Peso: ${form.pesoMax}t · Vol: ${form.volMax}m³ · Conductor: ${form.conductor}`)
    toast.success(`Vehículo ${form.placa} actualizado exitosamente.`)
  }

  // Guardar regla
  const saveRegla = (form) => {
    setReglas(prev => prev.map(r => r.id === form.id ? form : r))
    log(usuario, 'Configuración', 'Modificó regla de cliente', `${form.cliente} · Ventana: ${form.ventana} · Días: ${form.dias ? form.dias.join(',') : 'todos'}`)
    toast.success(`Regla para "${form.cliente}" guardada.`)
  }

  // Confirmar eliminación (Heurística #5 y #3 con Undo)
  const solicitarEliminacion = (id) => {
    setReglaAEliminar(id)
  }

  const ejecutarEliminacion = () => {
    const regla = reglas.find(r => r.id === reglaAEliminar)
    if (!regla) return

    setReglas(prev => prev.filter(r => r.id !== reglaAEliminar))
    log(usuario, 'Configuración', 'Eliminó regla de cliente', `${regla.cliente}`)

    toast.info(`Regla de ${regla.cliente} eliminada.`, {
      duration: 6000,
      action: {
        label: 'Deshacer',
        onClick: () => {
          setReglas(prev => [...prev, regla])
          log(usuario, 'Configuración', 'Restauró regla de cliente (Deshacer)', regla.cliente)
          toast.success(`Regla de "${regla.cliente}" restaurada.`)
        }
      }
    })

    setReglaAEliminar(null)
  }

  const addRegla = () => {
    const newId = `r${Date.now()}`
    const nueva = { id: newId, cliente: 'Nuevo cliente por configurar', pedidoRef: '—', ventana: 'Todo el día', dias: null, zona: 'Centro' }
    setReglas(prev => [nueva, ...prev])
    log(usuario, 'Configuración', 'Creó regla de cliente', 'Nueva regla en blanco añadida')
    toast.info('Nueva regla agregada. Puedes editar el nombre, ventana y días de atención.')
  }

  const reglaSeleccionada = reglaAEliminar ? reglas.find(r => r.id === reglaAEliminar) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

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
        </div>

        {/* Cabecera de acciones */}
        <div className="ch">
          {tab === 'vehiculos' && (
            <div>
              <h3>Maestro de flota de transporte</h3>
              <p>Capacidad máxima de peso (t) y volumen (m³) que el algoritmo usa para repartir pedidos sin saturación.</p>
            </div>
          )}
          {tab === 'reglas' && (
            <>
              <div>
                <h3>Reglas de atención por cliente</h3>
                <p>Ventanas horarias y días permitidos. Los pedidos que no cumplan se reprograman automáticamente (RF-03).</p>
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
                {vehiculos.map(v => <VehiculoRow key={v.id} v={v} onSave={saveVeh} />)}
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
                  {reglas.map(r => <ReglaRow key={r.id} r={r} onSave={saveRegla} onDelete={solicitarEliminacion} />)}
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
