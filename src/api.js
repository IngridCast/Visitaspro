import { loadLocalSession } from './auth/localAuth.js'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

let unauthorizedHandler = null

// Se llama cuando el servidor rechaza el token (sesión vencida o usuario desactivado).
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

const REQUEST_TIMEOUT_MS = 15_000

// responseType: 'json' (por defecto) o 'blob' (para descargar imágenes).
export async function apiFetch(path, { method = 'GET', body, responseType = 'json' } = {}) {
  if (!API_URL) {
    throw new ApiError(0, 'El servidor no está configurado (VITE_API_URL).')
  }

  const headers = {}
  // Un Blob (por ejemplo una foto) se envía tal cual; lo demás, como JSON.
  const isBlob = body instanceof Blob
  if (body !== undefined) headers['Content-Type'] = isBlob ? body.type : 'application/json'
  const token = loadLocalSession()?.token
  if (token) headers.Authorization = `Bearer ${token}`

  // Si el servidor no responde a tiempo se trata como "sin conexión", para que
  // la app no se quede cargando. Las fotos tienen más tiempo para subir.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), isBlob ? 60_000 : REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isBlob ? body : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (response.status === 401 && token) unauthorizedHandler?.()
    throw new ApiError(response.status, data.error || 'Error del servidor. Intenta de nuevo.')
  }
  if (responseType === 'blob') return response.blob()
  if (response.status === 204) return {}
  return response.json().catch(() => ({}))
}
