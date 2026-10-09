import { apiFetch } from './cliente.js'

export async function loginApi(usuario, clave) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, clave })
  })
  if (data.access_token) {
    localStorage.setItem('siprd_access_token', data.access_token)
  }
  return data
}

export async function obtenerUsuarioActualApi() {
  return await apiFetch('/auth/yo', { method: 'GET' })
}

export async function salirApi() {
  try {
    await apiFetch('/auth/salir', { method: 'POST' })
  } finally {
    localStorage.removeItem('siprd_access_token')
  }
}
