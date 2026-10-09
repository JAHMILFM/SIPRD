import { apiFetch } from './cliente.js'

export async function listarPedidosApi(estado = null, fecha = null) {
  const params = new URLSearchParams()
  if (estado) params.append('estado', estado)
  if (fecha) params.append('fecha', fecha)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return await apiFetch(`/pedidos${qs}`)
}

export async function importarCorteApi(fechaCorte, pedidosDatos = null) {
  return await apiFetch('/pedidos/importaciones', {
    method: 'POST',
    body: JSON.stringify({
      fecha_corte: fechaCorte,
      pedidos_datos: pedidosDatos
    })
  })
}

export async function cerrarPedidoApi(pedidoId) {
  return await apiFetch(`/pedidos/${pedidoId}/cerrar`, { method: 'POST' })
}
