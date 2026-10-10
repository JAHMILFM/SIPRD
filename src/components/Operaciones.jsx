import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/cliente'
import { useAuth } from '../context/AuthContext'
import { useDatos } from '../context/DatosContext'
import './operaciones.css'
import Modal from './common/Modal'
import AvisoServidor from './common/AvisoServidor'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const ROLES = ['ADMINISTRADOR', 'JEFE', 'ASISTENTE', 'REPARTIDOR', 'TESORERIA']
const ESTADOS = ['DISPONIBLE', 'ASIGNADO', 'MANTENIMIENTO', 'INACTIVO']
const MEDIOS = ['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'YAPE', 'PLIN']
const json = (method, data) => ({ method, body: JSON.stringify(data) })
const dinero = value => Number(value).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })

function useRemote(endpoint) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(v => v + 1), [])
  useEffect(() => {
    if (!endpoint) { setData(null); return }
    const controller = new AbortController()
    setError(''); setData(null)
    apiFetch(endpoint, { signal: controller.signal }).then(d => {
      if (!controller.signal.aborted) setData(d)
    }).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [endpoint, revision])
  return { data, error, reload }
}

function useOperacion() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { recargar } = useDatos()
  const run = async (action, success = 'Cambios guardados') => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { const result = await action(); setMessage(success); recargar(); return result }
    catch (e) { setError(e.message); return null }
    finally { setBusy(false) }
  }
  return { busy, run, notice: <>{error && <p className="op-error" role="alert">{error}</p>}{message && <p className="op-success" role="status">{message}</p>}</> }
}

function Field({ label, children }) { return <label className="op-field"><span>{label}</span>{children}</label> }
function Table({ headers, children }) { return <div className="op-table"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div> }
function RemoteStatus({ remote }) { return remote.error ? <p role="alert" className="op-error">{remote.error} <button onClick={remote.reload}>Reintentar</button></p> : !remote.data ? <p role="status">Cargando…</p> : null }
function Section({ title, children }) { return <section className="card op-section"><div className="ch"><h3>{title}</h3></div><div className="op-body">{children}</div></section> }

async function download(endpoint, name) {
  const response = await apiFetch(endpoint)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const USUARIO_VACIO = { nombre: '', apellidos: '', documento: '', correo: '', usuario: '', clave: '', rol: 'REPARTIDOR', activo: true }
export function UsuariosPanel() {
  const { usuario: sesion } = useAuth()
  const [permisosRol, setPermisosRol] = useState(null)
  const remote = useRemote('/usuarios'); const op = useOperacion()
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [estado, setEstado] = useState('todos')
  const visibles = remote.data?.filter(u => (estado === 'todos' || u.activo === (estado === 'activos')) && `${u.nombre} ${u.apellidos} ${u.usuario} ${u.correo} ${u.rol}`.toLowerCase().includes(busca.trim().toLowerCase()))
  const field = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const guardar = e => {
    e.preventDefault()
    op.run(async () => {
      const payload = { ...form, clave: form.clave || null }
      await apiFetch(form.id ? `/usuarios/${form.id}` : '/usuarios', json(form.id ? 'PUT' : 'POST', payload))
      setForm(null); remote.reload()
    })
  }
  return <div className="operaciones"><Section title="Usuarios y accesos">
    <AvisoServidor /><p>Registra usuarios, asigna roles y administra su acceso al sistema.</p>
    <button className="btn" onClick={() => setForm({ ...USUARIO_VACIO })}>Registrar usuario</button>
    <div className="op-grid"><Field label="Buscar usuario"><input placeholder="Nombre, correo, usuario o rol" value={busca} onChange={e => setBusca(e.target.value)} /></Field><Field label="Estado de acceso"><select value={estado} onChange={e => setEstado(e.target.value)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></Field></div>
    {op.notice}<RemoteStatus remote={remote} />
    <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar usuario' : 'Registrar usuario'} maxWidth={720}>{form && <form onSubmit={guardar} className="op-form">
      <h3>{form.id ? 'Editar usuario' : 'Nuevo usuario'}</h3>
      <div className="op-grid">
        <Field label="Nombres"><input required maxLength={100} value={form.nombre} onChange={field('nombre')} /></Field>
        <Field label="Apellidos"><input required maxLength={100} value={form.apellidos} onChange={field('apellidos')} /></Field>
        <Field label="Documento de identificación"><input maxLength={30} value={form.documento || ''} onChange={field('documento')} /></Field>
        <Field label="Correo"><input required type="email" value={form.correo} onChange={field('correo')} /></Field>
        <Field label="Usuario"><input required minLength={3} pattern="[a-zA-Z0-9._-]+" value={form.usuario} onChange={field('usuario')} /></Field>
        <Field label={form.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}><input type="password" autoComplete="new-password" required={!form.id} minLength={6} value={form.clave} onChange={field('clave')} /></Field>
        <Field label="Rol"><select value={form.rol} onChange={field('rol')}>{ROLES.filter(r => sesion.rol !== 'jefe' || r !== 'ADMINISTRADOR').map(r => <option key={r}>{r}</option>)}</select></Field>
        {form.id && <label><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} /> Acceso activo</label>}
      </div>
      <div className="op-actions"><button className="btn" disabled={op.busy}>Guardar usuario</button><button type="button" className="btn out" onClick={() => setForm(null)}>Cancelar</button></div>
    </form>}</Modal>
    {remote.data && <Table headers={['Nombre e identificación', 'Usuario y correo', 'Rol', 'Acceso', 'Último ingreso', 'Acciones']}>
      {visibles.map(u => <tr key={u.id}><td>{u.nombre} {u.apellidos}<small>{u.documento || 'Sin documento'}</small></td><td>{u.usuario}<small>{u.correo}</small></td><td>{u.rol}</td><td>{u.activo ? 'Activo' : 'Inactivo'}</td><td>{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-PE') : 'Sin ingreso'}</td><td><div className="op-actions"><button disabled={sesion.rol === 'jefe' && u.rol === 'ADMINISTRADOR'} onClick={() => setForm({ ...u, clave: '' })}>Editar</button><button onClick={() => setPermisosRol(u.rol)}>Permisos</button><button disabled={op.busy || (sesion.rol === 'jefe' && u.rol === 'ADMINISTRADOR')} onClick={() => op.run(async () => { await apiFetch(`/usuarios/${u.id}/${u.activo ? 'desactivar' : 'reactivar'}`, { method: 'POST' }); remote.reload() })}>{u.activo ? 'Desactivar' : 'Reactivar'}</button></div></td></tr>)}
    </Table>}
    <Modal isOpen={!!permisosRol} onClose={() => setPermisosRol(null)} title={`Permisos del rol ${permisosRol || ''}`}>
      <p>Los permisos se asignan mediante el campo Rol al editar el usuario.</p>
      <ul>{({ADMINISTRADOR:['Administrar todas las cuentas y roles','Consultar auditoría y cobranzas'],JEFE:['Gestionar usuarios operativos; la cuenta administradora está protegida','Gestionar vehículos, reglas, planes, rutas e incidencias','Consultar auditoría, cobranzas y exportaciones'],ASISTENTE:['Gestionar vehículos, reglas, propuestas y rutas','Consultar y resolver incidencias'],REPARTIDOR:['Consultar sus rutas y pedidos','Adjuntar entregas, registrar incidencias y cobros','Subsanar sus cobros observados'],TESORERIA:['Revisar comprobantes','Validar u observar cobros','Exportar reportes de cobranzas']}[permisosRol] || []).map(p => <li key={p}>{p}</li>)}</ul>
    </Modal>
    {remote.data && !visibles.length && <p>No hay usuarios que coincidan con el filtro.</p>}
  </Section></div>
}

const VEHICULO_VACIO = { placa: '', marca: '', modelo: '', conductor: '', pesoMax: 5, volMax: 12, estado: 'DISPONIBLE' }
export function MaestrosPanel() {
  const { vehiculos, clientes } = useDatos(); const op = useOperacion()
  const [vehicle, setVehicle] = useState(null)
  const [rule, setRule] = useState(null)
  const [cliente, setCliente] = useState('')
  const [inactivas, setInactivas] = useState(false)
  const remote = useRemote(`/datos/reglas?incluir_inactivas=${inactivas}${cliente ? `&cliente_id=${cliente}` : ''}`)
  const guardarVehiculo = e => {
    e.preventDefault()
    op.run(async () => {
      if (vehicle.id) await apiFetch(`/datos/vehiculos/${vehicle.id}`, json('PUT', vehicle))
      else await apiFetch('/vehiculos', json('POST', { ...vehicle, capacidad_peso_kg: Number(vehicle.pesoMax) * 1000, capacidad_volumen_m3: Number(vehicle.volMax) }))
      setVehicle(null)
    })
  }
  const guardarRegla = e => {
    e.preventDefault()
    op.run(async () => {
      const ds = rule.modo === 'no' ? DIAS.map((_, i) => i).filter(i => !rule.dias.includes(i)) : rule.dias
      const payload = { cliente_id: Number(rule.cliente_id), dias: ds, ventana: rule.todo ? 'Todo el día' : `${rule.inicio}–${rule.fin}` }
      await apiFetch(rule.id ? `/datos/reglas/${rule.id}` : '/datos/reglas', json(rule.id ? 'PUT' : 'POST', payload))
      setRule(null); remote.reload()
    })
  }
  const abrirRegla = r => {
    const [inicio = '08:00', fin = '17:00'] = (r?.ventana || '').split('–')
    setRule(r ? { ...r, dias: r.dias || [0, 1, 2, 3, 4, 5, 6], modo: 'si', todo: r.ventana === 'Todo el día', inicio, fin } : { cliente_id: cliente || clientes[0]?.id || '', dias: [1, 2, 3, 4, 5, 6], modo: 'si', todo: true, inicio: '08:00', fin: '17:00' })
  }
  return <div className="operaciones">{op.notice}<Section title="Vehículos">
    <button className="btn" onClick={() => setVehicle({ ...VEHICULO_VACIO })}>Registrar vehículo</button>
    {vehicle && <form className="op-form" onSubmit={guardarVehiculo}><h3>{vehicle.id ? 'Editar vehículo' : 'Nuevo vehículo'}</h3><div className="op-grid">
      <Field label="Placa"><input required disabled={!!vehicle.id} minLength={3} maxLength={20} value={vehicle.placa} onChange={e => setVehicle(v => ({ ...v, placa: e.target.value }))} /></Field>
      {!vehicle.id && ['marca', 'modelo'].map(k => <Field key={k} label={k === 'marca' ? 'Marca' : 'Modelo'}><input value={vehicle[k]} onChange={e => setVehicle(v => ({ ...v, [k]: e.target.value }))} /></Field>)}
      <Field label="Conductor habitual"><input value={vehicle.conductor} onChange={e => setVehicle(v => ({ ...v, conductor: e.target.value }))} /></Field>
      <Field label="Capacidad de peso (toneladas)"><input required type="number" min="0.001" step="0.001" value={vehicle.pesoMax} onChange={e => setVehicle(v => ({ ...v, pesoMax: Number(e.target.value) }))} /></Field>
      <Field label="Capacidad de volumen (m³)"><input required type="number" min="0.001" step="0.001" value={vehicle.volMax} onChange={e => setVehicle(v => ({ ...v, volMax: Number(e.target.value) }))} /></Field>
      <Field label="Estado operativo"><select value={vehicle.estado} onChange={e => setVehicle(v => ({ ...v, estado: e.target.value }))}>{ESTADOS.map(s => <option key={s}>{s}</option>)}</select></Field>
    </div><div className="op-actions"><button className="btn" disabled={op.busy}>Guardar vehículo</button><button className="btn out" type="button" onClick={() => setVehicle(null)}>Cancelar</button></div></form>}
    <Table headers={['Placa', 'Conductor', 'Peso máximo', 'Volumen máximo', 'Estado', 'Acciones']}>
      {vehiculos.map(v => <tr key={v.id}><td>{v.placa}</td><td>{v.conductor}</td><td>{v.pesoMax} t</td><td>{v.volMax} m³</td><td>{v.estado}</td><td><div className="op-actions"><button onClick={() => setVehicle({ ...v })}>Editar</button>{v.activo && <button disabled={op.busy} onClick={() => op.run(() => apiFetch(`/vehiculos/${v.id}/desactivar`, { method: 'POST' }))}>Desactivar</button>}</div></td></tr>)}
    </Table>
  </Section><Section title="Reglas de atención de clientes">
    <div className="op-actions"><Field label="Filtrar por cliente"><select value={cliente} onChange={e => setCliente(e.target.value)}><option value="">Todos los clientes</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field><label><input type="checkbox" checked={inactivas} onChange={e => setInactivas(e.target.checked)} /> Mostrar también inactivas</label><button className="btn" onClick={() => abrirRegla(null)}>Registrar regla</button></div>
    {rule && <form onSubmit={guardarRegla} className="op-form"><h3>{rule.id ? 'Editar regla' : 'Nueva regla'}</h3><div className="op-grid">
      <Field label="Cliente"><select required disabled={!!rule.id} value={rule.cliente_id} onChange={e => setRule(r => ({ ...r, cliente_id: e.target.value }))}>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
      <Field label="Días seleccionados"><select value={rule.modo} onChange={e => setRule(r => ({ ...r, modo: e.target.value }))}><option value="si">Días disponibles</option><option value="no">Días no disponibles</option></select></Field>
    </div><fieldset><legend>{rule.modo === 'si' ? 'Recibe pedidos estos días' : 'No recibe pedidos estos días'}</legend><div className="op-actions">{DIAS.map((d, i) => <label key={d}><input type="checkbox" checked={rule.dias.includes(i)} onChange={e => setRule(r => ({ ...r, dias: e.target.checked ? [...r.dias, i] : r.dias.filter(n => n !== i) }))} /> {d}</label>)}</div></fieldset>
      <label><input type="checkbox" checked={rule.todo} onChange={e => setRule(r => ({ ...r, todo: e.target.checked }))} /> Todo el día</label>
      {!rule.todo && <div className="op-grid"><Field label="Recepción desde"><input required type="time" value={rule.inicio} onChange={e => setRule(r => ({ ...r, inicio: e.target.value }))} /></Field><Field label="Recepción hasta"><input required type="time" value={rule.fin} onChange={e => setRule(r => ({ ...r, fin: e.target.value }))} /></Field></div>}
      <div className="op-actions"><button className="btn" disabled={op.busy}>Guardar regla</button><button className="btn out" type="button" onClick={() => setRule(null)}>Cancelar</button></div>
    </form>}
    <RemoteStatus remote={remote} />{remote.data && <Table headers={['Cliente', 'Días de atención', 'Horario', 'Vigencia', 'Acciones']}>
      {remote.data.map(r => <tr key={r.id}><td>{r.cliente}</td><td>{r.dias === null ? 'Todos' : r.dias.map(i => DIAS[i]).join(', ') || 'Ningún día'}</td><td>{r.ventana}</td><td>{r.activa ? 'Vigente' : 'Inactiva'}</td><td>{r.activa && <div className="op-actions"><button onClick={() => abrirRegla(r)}>Editar</button><button disabled={op.busy} onClick={() => op.run(async () => { await apiFetch(`/datos/reglas/${r.id}/desactivar`, { method: 'POST' }); remote.reload() }, 'Regla desactivada; el historial se conserva')}>Desactivar</button></div>}</td></tr>)}
    </Table>}
  </Section></div>
}

export function PlanificacionPanel({ inicial = null, fechaInicial = '2026-10-10' }) {
  const { vehiculos, pedidos } = useDatos(); const op = useOperacion()
  const [fecha, setFecha] = useState(fechaInicial); const [seleccion, setSeleccion] = useState([])
  const [actual, setActual] = useState(inicial)
  const planes = useRemote('/planificaciones'); const reps = useRemote('/usuarios/repartidores')
  const detalle = useRemote(actual ? `/planificaciones/${actual.id}/versiones/${actual.n}` : null)
  const [asignaciones, setAsignaciones] = useState({})
  const [editor, setEditor] = useState(false); const [reoptimizar, setReoptimizar] = useState(false)
  const versiones = useRemote(actual ? `/planificaciones/${actual.id}/versiones` : null)
  useEffect(() => { setAsignaciones(Object.fromEntries((detalle.data?.rutas || []).map(r => [r.id, r.repartidor_id || '']))) }, [detalle.data])
  const generar = e => {
    e.preventDefault()
    op.run(async () => {
      const f = fecha.split('-').reverse().join('/')
      const r = await apiFetch('/planificaciones', json('POST', { fecha: f, vehiculo_ids: seleccion.map(Number) }))
      planes.reload(); setActual({ id: r.planificacion_id, n: r.version_numero })
    }, 'Propuesta generada y guardada como borrador')
  }
  const guardarRepartidores = async () => {
    for (const r of detalle.data.rutas) {
      if (!asignaciones[r.id]) throw new Error('Selecciona un repartidor para cada ruta')
      await apiFetch(`/planificaciones/${actual.id}/versiones/${actual.n}/rutas/${r.id}/repartidor`, json('PUT', { repartidor_id: Number(asignaciones[r.id]) }))
    }
  }
  return <div className="operaciones">{op.notice}<Section title="Generar propuesta de planificación">
    <form onSubmit={generar}><Field label="Fecha de reparto"><input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
      <fieldset><legend>Vehículos seleccionados</legend><div className="op-actions">{vehiculos.filter(v => v.activo && ['DISPONIBLE', 'ASIGNADO'].includes(v.estado)).map(v => <label key={v.id}><input type="checkbox" checked={seleccion.includes(v.id)} onChange={e => setSeleccion(ids => e.target.checked ? [...ids, v.id] : ids.filter(id => id !== v.id))} /> {v.placa} · {v.pesoMax} t · {v.volMax} m³</label>)}</div></fieldset>
      <p>{pedidos.filter(p => p.estado === 'PENDIENTE' && p.fecha_corte === fecha.split('-').reverse().join('/')).length} pedidos pendientes para la fecha. Se aplicarán capacidades, días y ventanas vigentes.</p>
      <button className="btn" disabled={op.busy || !seleccion.length}>Generar propuesta</button>
    </form>
  </Section><Section title="Planificaciones guardadas">
    <RemoteStatus remote={planes} />{planes.data && <Table headers={['Fecha', 'Plan', 'Versión vigente', 'Consultar']}>
      {planes.data.map(p => <tr key={p.id}><td>{p.fecha}</td><td>{p.id.slice(0, 8)}</td><td>{p.version_vigente}</td><td><button onClick={() => setActual({ id: p.id, n: p.ultima_version || p.version_vigente })}>Ver propuesta</button></td></tr>)}
    </Table>}
  </Section>{actual && <Section title={`Propuesta · versión ${actual.n}`}>
    <RemoteStatus remote={detalle} />{detalle.data && <>
      <div className="op-actions"><Field label="Historial de versiones"><select value={actual.n} onChange={e => setActual(a => ({...a,n:Number(e.target.value)}))}>{(versiones.data || [{numero:actual.n,estado:detalle.data.estado}]).map(v => <option key={v.numero} value={v.numero}>Versión {v.numero} · {v.estado}</option>)}</select></Field>
        {detalle.data.estado === 'BORRADOR' && <button className="btn out" onClick={() => setEditor(true)}>Editar asignaciones y secuencia</button>}
        {['BORRADOR','CONFIRMADA'].includes(detalle.data.estado) && <button className="btn out" onClick={() => setReoptimizar(true)}>Crear versión de reoptimización</button>}</div>
      <Modal isOpen={editor} onClose={() => setEditor(false)} title="Editar propuesta" maxWidth={1000}>{editor && <EditorPropuesta detalle={detalle.data} vehiculos={vehiculos} repartidores={reps.data || []} op={op} endpoint={`/planificaciones/${actual.id}/versiones/${actual.n}/asignaciones`} onGuardado={() => { setEditor(false); detalle.reload() }} />}</Modal>
      <Modal isOpen={reoptimizar} onClose={() => setReoptimizar(false)} title="Nueva versión de planificación" maxWidth={720}>{reoptimizar && <NuevaVersion vehiculos={vehiculos} detalle={detalle.data} op={op} endpoint={`/planificaciones/${actual.id}/versiones/${actual.n}/reoptimizar`} onGuardado={r => { setReoptimizar(false); setActual({id:r.planificacion_id,n:r.version_numero}); planes.reload(); versiones.reload() }} />}</Modal>
      <p><strong>Estado: {detalle.data.estado}</strong> · {detalle.data.motivo}</p>
      {detalle.data.rutas.map(r => <div className="op-route" key={r.id}><h3>{r.vehiculo.placa}</h3><p>{r.peso_kg.toFixed(1)} / {r.vehiculo.capacidad_peso_kg} kg · {r.volumen_m3.toFixed(2)} / {r.vehiculo.capacidad_volumen_m3} m³ · {r.distancia_km} km · {r.duracion_min} min</p>
        <Field label={`Repartidor para ${r.vehiculo.placa}`}><select disabled={detalle.data.estado !== 'BORRADOR'} value={asignaciones[r.id] || ''} onChange={e => setAsignaciones(a => ({ ...a, [r.id]: e.target.value }))}><option value="">Seleccionar repartidor</option>{reps.data?.map(rep => <option key={rep.id} value={rep.id}>{rep.nombre}</option>)}</select></Field>
        <Table headers={['Orden', 'Pedido', 'Cliente', 'Llegada estimada', 'Restricciones']}>
          {r.paradas.map(p => <tr key={p.id}><td>{p.secuencia}</td><td>{p.codigo_externo}</td><td>{p.cliente}</td><td>{p.llegada}</td><td>{p.restricciones?.map((x, i) => <small key={i}>{x.dias !== null ? `Días: ${x.dias === '' ? 'ninguno' : x.dias}` : x.tipo}{x.inicio && ` · ${x.inicio}–${x.fin}`}{x.dia_no_disponible !== null && ` · No atiende: ${DIAS[x.dia_no_disponible]}`}</small>)}</td></tr>)}
        </Table></div>)}
      {detalle.data.no_asignados.length > 0 && <><h3>Pedidos sin asignar</h3><Table headers={['Pedido', 'Cliente', 'Motivo']}>
        {detalle.data.no_asignados.map(p => <tr key={p.pedido_id}><td>{p.codigo_externo}</td><td>{p.cliente}</td><td>{p.motivo}</td></tr>)}
      </Table></>}
      {detalle.data.estado === 'BORRADOR' && detalle.data.rutas.length > 0 && <div className="op-actions"><button className="btn out" disabled={op.busy} onClick={() => op.run(async () => { await guardarRepartidores(); detalle.reload() }, 'Repartidores asignados')}>Guardar repartidores</button><button className="btn green" disabled={op.busy} onClick={() => op.run(async () => { await guardarRepartidores(); await apiFetch(`/planificaciones/${actual.id}/versiones/${actual.n}/confirmar`, { method: 'POST' }); detalle.reload(); planes.reload() }, 'Planificación confirmada y disponible para reparto')}>Confirmar y enviar a reparto</button></div>}
    </>}
  </Section>}</div>
}

function FotoForm({ label, endpoint, op, after }) {
  const [file, setFile] = useState(null)
  return <form className="op-photo" onSubmit={e => { e.preventDefault(); op.run(async () => { const data = new FormData(); data.append('archivo', file); await apiFetch(endpoint, { method: 'POST', body: data }); setFile(null); after?.() }, 'Fotografía guardada') }}>
    <Field label={label}><input required type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
    <button disabled={op.busy || !file}>Adjuntar fotografía</button><small>JPEG, PNG o WebP · máximo 5 MB</small>
  </form>
}

function AccionesParada({ p, op }) {
  const [incidencia, setIncidencia] = useState(false)
  const [cobrar, setCobrar] = useState(false)
  const [tipo, setTipo] = useState('CLIENTE_CERRADO'); const [descripcion, setDescripcion] = useState('')
  const [importe, setImporte] = useState(p.importe); const [medio, setMedio] = useState('EFECTIVO'); const [numero, setNumero] = useState('')
  const evidencia = useRemote(`/reparto/paradas/${p.id}/evidencias`)
  const { cobros } = useDatos()
  const pagos = cobros.filter(c => String(c.pedido_id) === String(p.pedido_id))
  return <div className="op-stop-actions">
    {p.estado_db !== 'ATENDIDA' && <FotoForm label="Fotografía de entrega" endpoint={`/reparto/paradas/${p.id}/evidencias`} op={op} after={evidencia.reload} />}
    {evidencia.data?.map(e => <button key={e.id} disabled={op.busy} onClick={() => op.run(() => download(`/reparto/paradas/${p.id}/evidencias/${e.id}/archivo`, e.nombre), 'Evidencia descargada')}>Ver evidencia: {e.nombre}</button>)}
    <div className="op-actions"><button onClick={() => setIncidencia(!incidencia)}>Registrar incidencia</button>{p.estado_db === 'ATENDIDA' && <button onClick={() => setCobrar(!cobrar)}>Registrar cobro</button>}</div>
    {incidencia && <form className="op-form" onSubmit={e => { e.preventDefault(); op.run(async () => { const data = new FormData(); data.append('tipo', tipo); data.append('descripcion', descripcion); await apiFetch(`/reparto/paradas/${p.id}/incidencias`, { method: 'POST', body: data }); setIncidencia(false); setDescripcion('') }, 'Incidencia registrada') }}>
      <Field label="Tipo de incidencia"><select value={tipo} onChange={e => setTipo(e.target.value)}>{['CLIENTE_CERRADO', 'CLIENTE_NO_RECIBE', 'DIRECCION_INCORRECTA', 'PEDIDO_RECHAZADO', 'VEHICULO_RETRASADO', 'OTRO'].map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Descripción"><textarea required maxLength={1000} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></Field><button disabled={op.busy}>Guardar incidencia</button>
    </form>}
    {cobrar && <form className="op-form" onSubmit={e => { e.preventDefault(); op.run(async () => { await apiFetch('/cobros', json('POST', { pedido_id: p.pedido_id, importe: Number(importe), medio_pago: medio, numero_operacion: numero || null })); setCobrar(false) }, 'Cobro registrado. Adjunta su comprobante.') }}>
      <Field label="Importe cobrado (S/)"><input required type="number" min="0.01" step="0.01" value={importe} onChange={e => setImporte(e.target.value)} /></Field><Field label="Medio de pago"><select value={medio} onChange={e => setMedio(e.target.value)}>{MEDIOS.map(m => <option key={m}>{m}</option>)}</select></Field><Field label="Número de operación"><input required={medio !== 'EFECTIVO'} maxLength={100} value={numero} onChange={e => setNumero(e.target.value)} /></Field><button disabled={op.busy}>Guardar cobro</button>
    </form>}
    {pagos.map(c => <div className="op-payment" key={c.id}><p><strong>{dinero(c.monto)} · {c.tipo.toUpperCase()} · {c.estado_db}</strong>{c.nota && <small>Observación: {c.nota}</small>}</p>
      {c.comprobante && <button disabled={op.busy} onClick={() => op.run(() => download(`/cobros/${c.id}/comprobante/archivo`, `comprobante-${c.id}`), 'Comprobante descargado')}>Ver comprobante</button>}
      {c.estado_db === 'PENDIENTE_CONTRASTE' && <FotoForm label={c.comprobante ? 'Reemplazar comprobante antes del contraste' : 'Fotografía del comprobante de cobro'} endpoint={`/cobros/${c.id}/comprobante`} op={op} />}
      {c.estado_db === 'OBSERVADO' && <CorreccionCobro c={c} op={op} />}
    </div>)}
  </div>
}

export function RepartoPanel() {
  const { rutas, incidencias } = useDatos(); const { usuario } = useAuth(); const op = useOperacion()
  const [fecha, setFecha] = useState('2026-10-10'); const [actual, setActual] = useState('')
  const opciones = rutas.filter(r => r.fecha_ruta === fecha)
  const ruta = opciones.find(r => r.id === actual) || opciones[0]
  return <div className="operaciones">{op.notice}<Section title={usuario.rol === 'repartidor' ? 'Mi jornada de reparto' : 'Rutas confirmadas'}>
    <div className="op-grid"><Field label="Fecha de la jornada"><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field><Field label="Ruta"><select value={ruta?.id || ''} onChange={e => setActual(e.target.value)}>{opciones.map(r => <option key={r.id} value={r.id}>{r.vehiculo.placa} · {r.vehiculo.conductor}</option>)}</select></Field></div>
    {!ruta && <p>No hay rutas confirmadas asignadas para esta fecha.</p>}
    {ruta && <><p>{ruta.vehiculo.placa} · {ruta.vehiculo.conductor} · {ruta.paradas.length} paradas · {ruta.distancia_total_km} km</p>
      <div className="op-stops">{ruta.paradas.map(p => <article key={p.id} className="op-stop"><div className="op-stop-head"><span className="op-number">{p.secuencia}</span><div><h3>{p.cliente}</h3><p>{p.codigo_externo} · {p.estado_db}</p></div></div><p>{p.dir} · {p.dist}</p><p>{p.peso} kg · {p.vol} m³ · {dinero(p.importe)}</p>
        {usuario.rol === 'repartidor' && <AccionesParada p={p} op={op} />}
        {incidencias.filter(i => String(i.id_parada) === String(p.id)).map(i => <p className="op-incident" key={i.id}>{i.tipo} · {i.estado}<small>{i.descripcion}</small></p>)}
      </article>)}</div>
    </>}
  </Section></div>
}

export function IncidenciasPanel() {
  const [estado,setEstado]=useState(''); const [ruta,setRuta]=useState(''); const [busca,setBusca]=useState(''); const [actual,setActual]=useState(null)
  const {rutas}=useDatos(); const op=useOperacion(); const remote=useRemote('/incidencias')
  const filas=(remote.data || []).filter(i=>(!estado || i.estado===estado) && (!ruta || String(i.ruta_id)===ruta) && `${i.cliente || ''} ${i.codigo_pedido || ''} ${i.tipo} ${i.descripcion}`.toLowerCase().includes(busca.toLowerCase()))
  const nombreRuta=i=>{const r=rutas.find(r=>String(r.id)===String(i.ruta_id));return r?`${r.vehiculo.placa} · ${r.vehiculo.conductor}`:`Ruta ${i.ruta_id}`}
  return <div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>{[['ABIERTA','Abiertas','#b45309'],['EN_REVISION','En revisión','#2563eb'],['RESUELTA','Resueltas','#16a34a'],['CANCELADA','Canceladas','#64748b']].map(([s,label,color])=><div className="card" key={s} style={{padding:'14px 18px'}}><div style={{fontSize:11,color:'#64748b',fontWeight:600}}>{label}</div><div style={{fontSize:24,fontWeight:800,color}}>{(remote.data || []).filter(i=>i.estado===s).length}</div></div>)}</div>
    <section className="card"><div className="ch"><h3>Incidencias de reparto</h3><button className="btn out" onClick={remote.reload}>Actualizar</button></div>
      <div className="operaciones" style={{padding:18}}>{op.notice}<RemoteStatus remote={remote} />
        <div className="op-grid"><Field label="Buscar"><input placeholder="Cliente, pedido o descripción" value={busca} onChange={e=>setBusca(e.target.value)} /></Field><Field label="Ruta"><select value={ruta} onChange={e=>setRuta(e.target.value)}><option value="">Todas las rutas</option>{rutas.map(r=><option key={r.id} value={r.id}>{r.vehiculo.placa} · {r.vehiculo.conductor}</option>)}</select></Field><Field label="Estado"><select value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos</option>{['ABIERTA','EN_REVISION','RESUELTA','CANCELADA'].map(s=><option key={s}>{s}</option>)}</select></Field></div>
        <Table headers={['Pedido y cliente','Ruta','Incidencia','Estado','Registro','Acciones']}>{filas.map(i=><tr key={i.id}><td>{i.codigo_pedido || `Parada ${i.parada_id}`}<small>{i.cliente}</small></td><td>{nombreRuta(i)}</td><td>{i.tipo.replaceAll('_',' ')}<small>{i.descripcion}</small></td><td><span className="chip">{i.estado.replaceAll('_',' ')}</span></td><td>{new Date(i.creado_en).toLocaleString('es-PE')}</td><td><button className="btn out" onClick={()=>setActual({...i,resolucion:i.resolucion || ''})}>Ver / gestionar</button></td></tr>)}</Table>
        {remote.data && !filas.length && <p>No hay incidencias que coincidan con los filtros.</p>}
      </div></section>
    <Modal isOpen={!!actual} onClose={()=>setActual(null)} title="Detalle de incidencia" maxWidth={620}>{actual && <div className="operaciones"><p><strong>{actual.codigo_pedido || `Parada ${actual.parada_id}`} · {actual.cliente}</strong></p><p>{nombreRuta(actual)}</p><p>{actual.tipo.replaceAll('_',' ')}: {actual.descripcion}</p><form className="op-form" onSubmit={e=>{e.preventDefault();op.run(async()=>{await apiFetch(`/incidencias/${actual.id}`,json('PATCH',{estado:actual.estado,resolucion:actual.resolucion}));setActual(null);remote.reload()},'Incidencia actualizada')}}>
      <Field label="Estado"><select value={actual.estado} onChange={e=>setActual(i=>({...i,estado:e.target.value}))}>{['ABIERTA','EN_REVISION','RESUELTA','CANCELADA'].map(s=><option key={s}>{s}</option>)}</select></Field><Field label="Seguimiento y resolución"><textarea required={actual.estado==='RESUELTA'} maxLength={1000} value={actual.resolucion} onChange={e=>setActual(i=>({...i,resolucion:e.target.value}))} /></Field>{op.notice}<div className="op-actions"><button className="btn" disabled={op.busy}>Guardar cambios</button><button className="btn out" type="button" onClick={()=>setActual(null)}>Cerrar</button></div></form></div>}</Modal>
  </div>
}

function ContrasteForm({ c, op, reload }) {
  const [resultado, setResultado] = useState('CONFORME'); const [observacion, setObservacion] = useState(''); const [movimiento, setMovimiento] = useState('')
  return <form className="op-form" onSubmit={e => { e.preventDefault(); op.run(async () => { await apiFetch(`/cobros/${c.id}/contraste`, json('POST', { resultado, observacion, movimiento_bancario: movimiento })); reload() }, 'Contraste registrado') }}>
    <Field label="Resultado del contraste"><select value={resultado} onChange={e => setResultado(e.target.value)}><option>CONFORME</option><option>OBSERVADO</option></select></Field>
    <Field label="Referencia del movimiento bancario o arqueo de efectivo"><input required minLength={3} maxLength={200} value={movimiento} onChange={e => setMovimiento(e.target.value)} /></Field>
    <Field label="Observación de Tesorería"><textarea required={resultado === 'OBSERVADO'} maxLength={1000} value={observacion} onChange={e => setObservacion(e.target.value)} /></Field>
    <button disabled={op.busy || !c.tiene_comprobante}>Guardar contraste</button>{!c.tiene_comprobante && <small>El repartidor debe adjuntar el comprobante.</small>}
  </form>
}

export function TesoreriaPanel() {
  const [estado, setEstado] = useState(''); const [actual, setActual] = useState(null); const op = useOperacion()
  const remote = useRemote(`/cobros${estado ? `?estado=${estado}` : ''}`)
  const cobro = remote.data?.find(c => c.id === actual)
  return <div className="operaciones"><Section title="Contraste de cobranzas">{op.notice}<div className="op-actions"><Field label="Estado de cobro"><select value={estado} onChange={e => { setEstado(e.target.value); setActual(null) }}><option value="">Todos</option>{['PENDIENTE_CONTRASTE', 'CONFORME', 'OBSERVADO'].map(s => <option key={s}>{s}</option>)}</select></Field><button className="btn" disabled={op.busy} onClick={() => op.run(() => download('/cobros/exportacion.xlsx', 'arqueo_cobros_siprd.xlsx'), 'Excel descargado')}>Exportar Excel (.xlsx)</button></div><RemoteStatus remote={remote} />
    {remote.data && <Table headers={['Pedido y cliente', 'Importe pedido', 'Cobrado', 'Medio y operación', 'Estado', 'Comprobante', 'Acciones']}>
      {remote.data.map(c => <tr key={c.id}><td>{c.codigo_pedido}<small>{c.cliente}</small></td><td>{dinero(c.importe_pedido)}</td><td>{dinero(c.importe_cobrado)}</td><td>{c.medio_pago}<small>{c.numero_operacion || 'Sin operación'}</small></td><td>{c.estado}</td><td>{c.tiene_comprobante ? <button disabled={op.busy} onClick={() => op.run(() => download(`/cobros/${c.id}/comprobante/archivo`, `comprobante-${c.id}`), 'Comprobante descargado')}>Ver comprobante · v{c.comprobante_version}</button> : 'Pendiente de adjuntar'}</td><td><button onClick={() => setActual(c.id)}>Ver / contrastar</button></td></tr>)}
    </Table>}
    {cobro && <div className="op-form"><h3>{cobro.codigo_pedido} · {cobro.estado}</h3><p>{dinero(cobro.importe_cobrado)} · {cobro.medio_pago}</p>{cobro.observaciones.map((o, i) => <p key={i}>Observación: {o.texto} · {o.resuelta ? 'Resuelta' : 'Pendiente de corrección'}</p>)}{['PENDIENTE_CONTRASTE', 'PENDIENTE'].includes(cobro.estado) && <ContrasteForm c={cobro} op={op} reload={remote.reload} />}</div>}
  </Section></div>
}

export function AuditoriaPanel() {
  const remote = useRemote('/auditoria?limite=100')
  return <div className="operaciones"><Section title="Auditoría del sistema"><RemoteStatus remote={remote} />{remote.data && <Table headers={['Fecha', 'Usuario', 'Acción', 'Entidad', 'Detalle']}>{remote.data.map(a => <tr key={a.id}><td>{new Date(a.fecha).toLocaleString('es-PE')}</td><td>{a.usuario_id || 'Sistema'}</td><td>{a.accion}</td><td>{a.entidad}</td><td><pre>{JSON.stringify(a.valores_despues, null, 2)}</pre></td></tr>)}</Table>}</Section></div>
}

// Extra actions live inside the original route/detail modals.
export function AccionesEntregaPanel({ parada }) {
  const op = useOperacion()
  return <div className="operaciones">{op.notice}<AccionesParada p={parada} op={op} /></div>
}
export function ContrastePagoPanel({ id }) {
  const { usuario } = useAuth()
  const remote = useRemote('/cobros'); const op = useOperacion()
  const c = remote.data?.find(x => x.id === id)
  return <div className="operaciones">{op.notice}<RemoteStatus remote={remote} />{c && <>
    {c.observaciones.map((o, i) => <p key={i}>Observación: {o.texto} · {o.resuelta ? 'Resuelta' : 'Pendiente de corrección'}</p>)}
    {usuario.rol === 'tesoreria' && ['PENDIENTE_CONTRASTE', 'PENDIENTE'].includes(c.estado) ? <ContrasteForm c={c} op={op} reload={remote.reload} /> : <p>Estado registrado: {c.estado}</p>}
  </>}</div>
}

export function RegistroVehiculoForm({ onGuardado, onCancelar }) {
  const [v, setV] = useState({ ...VEHICULO_VACIO }); const op = useOperacion()
  return <div className="operaciones">{op.notice}<form onSubmit={e => { e.preventDefault(); op.run(async () => {
    await apiFetch('/vehiculos', json('POST', { ...v, capacidad_peso_kg: Number(v.pesoMax) * 1000, capacidad_volumen_m3: Number(v.volMax) })); onGuardado()
  }, 'Vehículo registrado') }}><div className="op-grid">
    {['placa','marca','modelo','conductor'].map(k => <Field key={k} label={{placa:'Placa',marca:'Marca',modelo:'Modelo',conductor:'Conductor habitual'}[k]}><input required={k === 'placa'} minLength={k === 'placa' ? 3 : undefined} maxLength={k === 'placa' ? 20 : 100} value={v[k]} onChange={e => setV(f => ({...f,[k]:e.target.value}))} /></Field>)}
    <Field label="Peso máximo (t)"><input required type="number" min="0.001" step="0.001" value={v.pesoMax} onChange={e => setV(f => ({...f,pesoMax:Number(e.target.value)}))} /></Field>
    <Field label="Volumen máximo (m³)"><input required type="number" min="0.001" step="0.001" value={v.volMax} onChange={e => setV(f => ({...f,volMax:Number(e.target.value)}))} /></Field>
    <Field label="Estado"><select value={v.estado} onChange={e => setV(f => ({...f,estado:e.target.value}))}>{ESTADOS.map(x => <option key={x}>{x}</option>)}</select></Field>
  </div><div className="op-actions"><button className="btn" disabled={op.busy}>Guardar vehículo</button><button className="btn out" type="button" onClick={onCancelar}>Cancelar</button></div></form></div>
}

function CorreccionCobro({ c, op }) {
  const [f, setF] = useState({importe:c.monto,medio_pago:c.tipo.toUpperCase(),numero_operacion:c.numero_operacion || '',respuesta:''})
  return <form className="op-form" onSubmit={e => { e.preventDefault(); op.run(() => apiFetch(`/cobros/${c.id}/correccion`,json('PUT',f)), 'Corrección guardada. Adjunta el nuevo comprobante.') }}><h3>Subsanar cobro observado</h3>
    <Field label="Importe (S/)"><input type="number" required min="0.01" step="0.01" value={f.importe} onChange={e => setF(v=>({...v,importe:Number(e.target.value)}))} /></Field>
    <Field label="Medio de pago"><select value={f.medio_pago} onChange={e=>setF(v=>({...v,medio_pago:e.target.value}))}>{MEDIOS.map(m=><option key={m}>{m}</option>)}</select></Field>
    <Field label="Número de operación"><input required={f.medio_pago !== 'EFECTIVO'} value={f.numero_operacion} onChange={e=>setF(v=>({...v,numero_operacion:e.target.value}))} /></Field>
    <Field label="Respuesta a la observación"><textarea required minLength={3} maxLength={1000} value={f.respuesta} onChange={e=>setF(v=>({...v,respuesta:e.target.value}))} /></Field><button className="btn" disabled={op.busy}>Guardar corrección</button>
  </form>
}


function NuevaVersion({vehiculos,detalle,op,endpoint,onGuardado}) {
  const [ids,setIds] = useState(detalle.rutas.map(r=>r.vehiculo.id)); const [motivo,setMotivo] = useState('')
  return <form className="op-form" onSubmit={e=>{e.preventDefault();op.run(async()=>{const r=await apiFetch(endpoint,json('POST',{vehiculo_ids:ids,motivo}));onGuardado(r)},'Nueva versión creada; revisa y confirma sus rutas')}}>
    <p>Se conserva la versión anterior. La nueva propuesta se confirma antes de iniciar el reparto; las jornadas ya iniciadas conservan sus evidencias.</p>
    <Field label="Motivo"><textarea required minLength={3} maxLength={200} value={motivo} onChange={e=>setMotivo(e.target.value)} /></Field>
    <fieldset><legend>Vehículos de la nueva versión</legend>{vehiculos.filter(v=>v.activo && ['DISPONIBLE','ASIGNADO'].includes(v.estado)).map(v=><label key={v.id} style={{display:'block'}}><input type="checkbox" checked={ids.includes(v.id)} onChange={e=>setIds(xs=>e.target.checked?[...xs,v.id]:xs.filter(x=>x!==v.id))} /> {v.placa} · {v.pesoMax} t</label>)}</fieldset>
    {op.notice}<button className="btn" disabled={op.busy || !ids.length}>Generar nueva versión</button>
  </form>
}

function EditorPropuesta({detalle,vehiculos,repartidores,op,endpoint,onGuardado}) {
  const [rutas,setRutas] = useState(detalle.rutas.map(r=>({vehiculo_id:r.vehiculo.id,repartidor_id:r.repartidor_id || '',pedido_ids:r.paradas.map(p=>Number(p.pedido_id))})))
  const pedidos=[...detalle.rutas.flatMap(r=>r.paradas),...detalle.no_asignados]
  const operativos=vehiculos.filter(v=>v.activo && ['DISPONIBLE','ASIGNADO'].includes(v.estado))
  const mover=(id,destino)=>setRutas(rs=>rs.map((r,i)=>({...r,pedido_ids:[...r.pedido_ids.filter(p=>p!==id),...(String(i)===destino?[id]:[])]})))
  const ordenar=(i,id,delta)=>setRutas(rs=>rs.map((r,j)=>{if(i!==j)return r;const ps=[...r.pedido_ids],n=ps.indexOf(id),otro=n+delta;if(otro>=0 && otro<ps.length)[ps[n],ps[otro]]=[ps[otro],ps[n]];return {...r,pedido_ids:ps}}))
  const cambiar=(i,k,v)=>setRutas(rs=>rs.map((r,j)=>i===j?{...r,[k]:v}:r))
  return <form className="op-form" onSubmit={e=>{e.preventDefault();op.run(async()=>{await apiFetch(endpoint,json('PUT',{rutas:rutas.filter(r=>r.pedido_ids.length).map(r=>({...r,repartidor_id:r.repartidor_id?Number(r.repartidor_id):null}))}));onGuardado()},'Propuesta guardada; capacidades y horarios verificados')}}>
    <p>Selecciona el vehículo y repartidor de cada ruta, mueve los pedidos y cambia su orden. Al guardar se verifican las capacidades, los horarios y los días de atención.</p>
    <Table headers={['Ruta','Vehículo','Repartidor','Pedidos']}>
      {rutas.map((r,i)=><tr key={i}><td>Ruta {i+1}</td><td><select value={r.vehiculo_id} onChange={e=>cambiar(i,'vehiculo_id',e.target.value)}>{operativos.map(v=><option key={v.id} value={v.id}>{v.placa}</option>)}</select></td><td><select value={r.repartidor_id} onChange={e=>cambiar(i,'repartidor_id',e.target.value)}><option value="">Sin asignar</option>{repartidores.map(rep=><option key={rep.id} value={rep.id}>{rep.nombre}</option>)}</select></td><td>{r.pedido_ids.length}</td></tr>)}
    </Table>
    <button type="button" className="btn out" disabled={rutas.length>=operativos.length} onClick={()=>{const v=operativos.find(v=>!rutas.some(r=>r.vehiculo_id===v.id));if(v)setRutas(rs=>[...rs,{vehiculo_id:v.id,repartidor_id:'',pedido_ids:[]}])}}>Añadir ruta</button>
    <Table headers={['Pedido','Cliente','Ruta de destino','Orden de visita']}>
      {pedidos.map(p=>{const id=Number(p.pedido_id),i=rutas.findIndex(r=>r.pedido_ids.includes(id)),pos=i<0?-1:rutas[i].pedido_ids.indexOf(id);return <tr key={id}><td>{p.codigo_externo}</td><td>{p.cliente}</td><td><select value={i<0?'':String(i)} onChange={e=>mover(id,e.target.value)}><option value="">Sin asignar</option>{rutas.map((r,j)=><option key={j} value={j}>Ruta {j+1} · {operativos.find(v=>v.id===r.vehiculo_id)?.placa}</option>)}</select></td><td>{i>=0 && <div className="op-actions"><span>{pos+1}</span><button type="button" aria-label={`Subir ${p.codigo_externo}`} disabled={pos===0} onClick={()=>ordenar(i,id,-1)}>↑</button><button type="button" aria-label={`Bajar ${p.codigo_externo}`} disabled={pos===rutas[i].pedido_ids.length-1} onClick={()=>ordenar(i,id,1)}>↓</button></div>}</td></tr>})}
    </Table>{op.notice}<button className="btn" disabled={op.busy || !rutas.some(r=>r.pedido_ids.length)}>Guardar propuesta</button>
  </form>
}
