// Cliente HTTP centralizado para comunicación con el backend FastAPI (/api/v1)

const BASE_URL = '/api/v1'

export class ApiError extends Error {
  constructor(codigo, mensaje, detalle, status) {
    super(mensaje)
    this.name = 'ApiError'
    this.codigo = codigo
    this.detalle = detalle
    this.status = status
  }
}

export async function apiFetch(endpoint, opciones = {}) {
  const url = `${BASE_URL}${endpoint}`
  const headers = {
    'Accept': 'application/json',
    ...(opciones.headers || {})
  }

  // Si no es FormData, fijar Content-Type json
  if (!(opciones.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // Token JWT en memoria / localStorage
  const token = localStorage.getItem('siprd_access_token')
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...opciones,
    headers,
  }

  try {
    const res = await fetch(url, config)

    if (res.status === 401) {
      // Token expirado o inválido
      // localStorage.removeItem('siprd_access_token')
    }

    if (!res.ok) {
      let dataError = {}
      try {
        dataError = await res.json()
      } catch {
        dataError = { mensaje: res.statusText }
      }
      throw new ApiError(
        dataError.codigo || 'ERROR_PETICION',
        dataError.mensaje || (typeof dataError.detail === 'string' ? dataError.detail : 'Error en la comunicación con el servidor'),
        dataError.detalle,
        res.status
      )
    }

    // Si la respuesta es archivo binario o vacía
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await res.json()
    }
    return res
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('ERROR_CONEXION', 'No se pudo conectar con el servidor SIPRD', err.message, 0)
  }
}
