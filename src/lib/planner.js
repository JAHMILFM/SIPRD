// Motor de demostración del tanteo de flota.
//
// Reparte los pedidos entre N vehículos respetando capacidad (peso y volumen) y
// devuelve, por ruta, la jornada estimada = tiempo de servicio + tiempo de viaje.
// El criterio de reparto es balancear la jornada, no minimizar distancia: es la
// métrica con la que el asistente de distribución decide cuántos carros salen.
//
// En producción esta función se reemplaza por la llamada al backend
// (POST /api/planes/optimizar) que corre el motor real sobre la matriz OSRM.
// La forma del resultado se mantiene igual para no tocar la UI.

import { VEHICULOS, COLORES_RUTA } from '../data/mock'

// El 27/08/2026 es jueves.
export const DIA_SEMANA = 4
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// Distancia aproximada del almacén al punto, por zona. Sustituye a la matriz OSRM.
const KM_ZONA = { Norte: 4.8, Este: 4.1, Sur: 2.9, Centro: 3.4 }
const VELOCIDAD = 18 // km/h promedio en reparto urbano de Lima

function hash(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
  return h / 997
}

/** Pedidos que no se pueden entregar hoy porque el cliente no atiende. */
export function separarReprogramados(pedidos, dia = DIA_SEMANA) {
  const planificables = []
  const reprogramados = []
  for (const p of pedidos) {
    if (p.dias && !p.dias.includes(dia)) {
      const siguiente = proximoDiaHabil(p.dias, dia)
      reprogramados.push({ ...p, motivo: `No atiende ${NOMBRE_DIA[dia]}`, mueveA: NOMBRE_DIA[siguiente] })
    } else {
      planificables.push(p)
    }
  }
  return { planificables, reprogramados }
}

function proximoDiaHabil(dias, desde) {
  for (let i = 1; i <= 7; i++) {
    const d = (desde + i) % 7
    if (dias.includes(d)) return d
  }
  return desde
}

function costoPedido(p) {
  const km = KM_ZONA[p.zona] * (0.6 + hash(p.id) * 1.1)
  return { km, viaje: (km / VELOCIDAD) * 60, servicio: p.servicio }
}

/**
 * Reparte los pedidos entre `n` vehículos.
 * Heurística: pedidos ordenados por carga descendente, cada uno al vehículo con
 * menor jornada acumulada que aún tenga capacidad de peso y volumen.
 */
export function planificar(pedidos, n) {
  // TODO BACKEND: POST /api/planes/optimizar
  // Esta función entera se reemplazará por una llamada a la API en producción.
  // La UI seguirá consumiendo el mismo formato de respuesta.

  const flota = VEHICULOS.slice(0, n)
  const rutas = flota.map((v, i) => ({
    id: `R${i + 1}`,
    color: COLORES_RUTA[i % COLORES_RUTA.length],
    vehiculo: v,
    pedidos: [],
    peso: 0,
    vol: 0,
    km: 0,
    minutos: 0,
  }))

  const orden = [...pedidos].sort((a, b) => {
    const pr = { Alta: 0, Media: 1, Baja: 2 }
    if (pr[a.prioridad] !== pr[b.prioridad]) return pr[a.prioridad] - pr[b.prioridad]
    return b.peso - a.peso
  })

  const sinAsignar = []

  for (const p of orden) {
    const c = costoPedido(p)
    const aptas = rutas
      .filter((r) => r.peso + p.peso / 1000 <= r.vehiculo.pesoMax && r.vol + p.vol * 3.2 <= r.vehiculo.volMax)
      .sort((a, b) => a.minutos - b.minutos)

    if (aptas.length === 0) {
      // RF-06: identificar qué restricción impidió la asignación
      const sinPeso = rutas.every(r => r.peso + p.peso / 1000 > r.vehiculo.pesoMax)
      const sinVol  = rutas.every(r => r.vol  + p.vol  * 3.2 > r.vehiculo.volMax)
      const motivo  = sinPeso && sinVol ? 'Excede peso y volumen disponibles en toda la flota'
                    : sinPeso           ? 'Excede el peso máximo de todos los vehículos'
                    :                    'Excede el volumen máximo disponible'
      sinAsignar.push({ ...p, motivo })
      continue
    }
    const r = aptas[0]
    r.pedidos.push({ ...p, ruta: r.id, color: r.color, km: c.km })
    r.peso += p.peso / 1000
    r.vol += p.vol * 3.2
    r.km += c.km
    r.minutos += c.viaje + c.servicio
  }

  // Dentro de cada ruta se ordena por ventana horaria y luego por prioridad:
  // es el orden de visita que verá el conductor.
  for (const r of rutas) {
    r.pedidos.sort((a, b) => {
      const ha = a.ventana === 'Todo el día' ? 99 : parseInt(a.ventana, 10)
      const hb = b.ventana === 'Todo el día' ? 99 : parseInt(b.ventana, 10)
      return ha - hb
    })
  }

  // RF-06: detectar ventanas horarias imposibles según tiempo acumulado.
  // Si la hora estimada de llegada supera el cierre de la ventana, se marca
  // ventanaConflicto = true con el detalle del conflicto.
  for (const r of rutas) {
    let cursor = 8 * 60 // salida almacén: 08:00
    for (const p of r.pedidos) {
      const c = costoPedido(p)
      const llegada = cursor + c.viaje
      cursor = llegada + p.servicio
      if (p.ventana !== 'Todo el día') {
        const partes = p.ventana.split('–')
        const [hf, mf] = partes[1].split(':').map(Number)
        const cierre = hf * 60 + mf
        if (llegada > cierre) {
          p.ventanaConflicto = true
          const hStr = String(Math.floor(llegada / 60)).padStart(2, '0')
          const mStr = String(Math.round(llegada % 60)).padStart(2, '0')
          p.conflictoDetalle = `Llegaría ~${hStr}:${mStr} · Ventana cierra ${partes[1]}`
        }
      }
    }
  }

  const activas = rutas.filter((r) => r.pedidos.length > 0)

  // Cada vehículo que sale suma su tramo de ida y retorno al almacén: por eso
  // más camiones reparten mejor la jornada pero recorren más kilómetros.
  for (const r of activas) {
    r.km += 6.4
    r.minutos += (6.4 / VELOCIDAD) * 60
  }
  const jornadaMax = activas.length ? Math.max(...activas.map((r) => r.minutos)) : 0
  const jornadaMin = activas.length ? Math.min(...activas.map((r) => r.minutos)) : 0

  // RF-06: lista plana de paradas con conflicto de ventana horaria
  const conflictos = activas.flatMap(r =>
    r.pedidos.filter(p => p.ventanaConflicto).map(p => ({ ...p, rutaId: r.id }))
  )

  return {
    n,
    rutas: activas,
    sinAsignar,
    conflictos,
    kmTotal: activas.reduce((s, r) => s + r.km, 0),
    jornadaMax,
    jornadaMin,
    // 100% = todos los camiones trabajan lo mismo
    balance: jornadaMax ? Math.round((jornadaMin / jornadaMax) * 100) : 0,
  }
}

export function hhmm(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h} h ${String(m).padStart(2, '0')} m`
}
