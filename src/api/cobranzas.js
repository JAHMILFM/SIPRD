import { apiFetch } from './cliente.js'

export async function listarCobrosApi(estado = null) {
  const qs = estado ? `?estado=${estado}` : ''
  return await apiFetch(`/cobros${qs}`)
}

export async function registrarCobroApi(datos) {
  return await apiFetch('/cobros', {
    method: 'POST',
    body: JSON.stringify(datos)
  })
}

export async function subirComprobanteApi(cobroId, file) {
  const formData = new FormData()
  formData.append('archivo', file)
  return await apiFetch(`/cobros/${cobroId}/comprobante`, {
    method: 'POST',
    body: formData
  })
}

export async function contrastarCobroApi(cobroId, resultado, observacion = null) {
  return await apiFetch(`/cobros/${cobroId}/contraste`, {
    method: 'POST',
    body: JSON.stringify({ resultado, observacion })
  })
}
