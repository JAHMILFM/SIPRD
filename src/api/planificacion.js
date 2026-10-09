import { apiFetch } from './cliente.js'

export async function generarPlanificacionApi(fecha, vehiculoIds, parametros = {}) {
  return await apiFetch('/planificaciones', {
    method: 'POST',
    body: JSON.stringify({
      fecha,
      vehiculo_ids: vehiculoIds,
      parametros
    })
  })
}

export async function listarPlanificacionesApi(fecha = null) {
  const qs = fecha ? `?fecha=${fecha}` : ''
  return await apiFetch(`/planificaciones${qs}`)
}

export async function obtenerVersionPlanApi(planificacionId, versionNumero) {
  return await apiFetch(`/planificaciones/${planificacionId}/versiones/${versionNumero}`)
}

export async function asignarRepartidorApi(planificacionId, versionNumero, rutaId, repartidorId) {
  return await apiFetch(`/planificaciones/${planificacionId}/versiones/${versionNumero}/rutas/${rutaId}/repartidor`, {
    method: 'PUT',
    body: JSON.stringify({ repartidor_id: repartidorId })
  })
}

export async function confirmarVersionApi(planificacionId, versionNumero) {
  return await apiFetch(`/planificaciones/${planificacionId}/versiones/${versionNumero}/confirmar`, {
    method: 'POST'
  })
}
