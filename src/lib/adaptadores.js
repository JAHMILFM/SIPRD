const COLORS = ['#2563EB','#16A34A','#9333EA','#F59E0B','#0891B2','#E1252B']
export function vehiculoUI(v) {
  return {...v, pesoMax:v.capacidad_kg / 1000, volMax:v.capacidad_m3,
    conductor:v.conductor || v.placa, estado:v.activo ? v.estado_operativo : 'INACTIVO'}
}
const minuto = v => v ? Number(v.slice(0,2))*60 + Number(v.slice(3,5)) : 0
export function pedidoUI(p) {
  return {...p, cliente:p.cliente?.nombre || p.cliente, dir:p.cliente?.direccion || p.direccion,
    dist:p.cliente?.distrito || p.zona, lat:p.lat ?? p.latitud_entrega ?? p.cliente?.lat,
    lon:p.lon ?? p.longitud_entrega ?? p.cliente?.lon, peso:p.peso_kg || 0,
    vol:p.volumen_m3 || 0, monto:p.importe_total ?? p.importe ?? 0,
    bultos:'—', servicio:15, dias:null, ventana:'Según restricciones vigentes', prioridad:'Media'}
}
export function planUI(sol, vehiculos=[], pedidos=[], n=0) {
  const raw = sol.resultado || sol
  const rutas = (sol.rutas || []).map((r,i) => {
    const v = vehiculos.find(v=>String(v.id)===String(r.vehiculo_id ?? r.vehiculo?.id)) || r.vehiculo || {}
    const paradas = (r.paradas || []).map((s,j)=> {
      const p=pedidos.find(p=>String(p.id)===String(s.pedido_id)) || {}
      const pedido=pedidoUI(p)
      return {...pedido,...s, id:s.id ?? s.pedido_id, id_parada:s.id, codigo:s.codigo || p.codigo_externo,
        orden:j+1, ruta:r.id ?? r.ruta_id, zona:r.zona || r.zona_operativa,
        estado:s.estado==='ATENDIDA' ? 'entregado' : s.estado==='EN_CAMINO' ? 'en_camino' : s.estado==='NO_ATENDIDA' ? 'no_atendida' : 'pendiente',
        bloqueado:!!s.bloqueada, monto:s.importe ?? pedido.monto,
        cliente:s.cliente || s.nombre_cliente || pedido.cliente, dir:s.direccion || pedido.dir,
        eta:s.eta ? new Date(s.eta).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false}) : s.inicio_atencion,
        minLlegada:s.inicio_atencion ? minuto(s.inicio_atencion) : 0}
    })
    return {...r,id:r.id ?? r.ruta_id, color:COLORS[i%COLORS.length],vehiculo:vehiculoUI(v),
      horaInicio:sol.parametros?.inicio_jornada?.slice(0,5) || r.salida_almacen || '07:30', pedidos:paradas, paradas, zona:r.zona || r.zona_operativa,
      peso:(r.peso_kg ?? r.peso_total_kg ?? 0)/1000, vol:r.volumen_m3 ?? r.volumen_total_m3 ?? 0,
      km:r.distancia_km ?? r.distancia_total_km ?? 0, minutos:r.duracion_min ?? r.duracion_total_min ?? 0}
  })
  const no=raw.no_asignados || []
  return {...sol,n:n || rutas.length,rutas,kmTotal:rutas.reduce((s,r)=>s+r.km,0),
    jornadaMax:Math.max(0,...rutas.map(r=>r.minutos)), jornadaMin:(rutas.length ? Math.min(...rutas.map(r=>r.minutos)) : 0),
    activos:rutas.length, balance:rutas.length ? Math.round(100*Math.min(...rutas.map(r=>r.minutos))/Math.max(1,...rutas.map(r=>r.minutos))) : 0, conflictos:[],
    sinAsignar:no.map(x=>({...pedidoUI(pedidos.find(p=>String(p.id)===String(x.pedido_id)) || {}),...x,id:x.pedido_id})),
    fuente:raw.fuente_distancias}
}
export function cobroUI(c) {
  return {...c,estado:{CONFORME:'validado',OBSERVADO:'rechazado',PENDIENTE:'pendiente'}[c.estado] || c.estado,
    tipo:c.medio_pago.toLowerCase(),comprobante:c.tiene_comprobante,nota:c.observacion,
    conductor:c.conductor || 'Reparto',ruta:c.ruta || '—',color:'#2563EB',
    hora:c.fecha ? new Date(c.fecha).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}) : '—'}
}
