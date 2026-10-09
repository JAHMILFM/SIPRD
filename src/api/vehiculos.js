import { apiFetch } from './cliente.js'

export async function listarVehiculosApi(soloDisponibles = false) {
  const query = soloDisponibles ? '?disponibles=true' : ''
  return await apiFetch(`/vehiculos${query}`)
}

export async function crearVehiculoApi(datos) {
  return await apiFetch('/vehiculos', {
    method: 'POST',
    body: JSON.stringify(datos)
  })
}

export async function desactivarVehiculoApi(id) {
  return await apiFetch(`/vehiculos/${id}/desactivar`, { method: 'POST' })
}
