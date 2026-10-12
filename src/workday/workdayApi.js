// Inicio de labores. Sin conexión se guarda en el dispositivo y se envía al
// volver la conexión.
import { apiFetch } from '../api.js'
import { todayISO } from '../visits/dates.js'

const PENDING_KEY = 'visitaspro.pendingWorkday'
const LAST_PLACE_KEY = 'visitaspro.lastWorkPlace'

function readPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY))
  } catch {
    return null
  }
}

// Último departamento y municipio usados, para proponerlos la próxima vez.
export function lastWorkPlace() {
  try {
    return JSON.parse(localStorage.getItem(LAST_PLACE_KEY)) ?? {}
  } catch {
    return {}
  }
}

// Jornada de hoy: { workday, pending } (pending = guardada sin enviar).
export async function getTodayWorkday() {
  const today = todayISO()
  const pending = readPending()
  if (pending?.workDate === today) return { workday: pending, pending: true }
  try {
    const { workday } = await apiFetch(`/workdays?date=${today}`)
    return { workday, pending: false }
  } catch (error) {
    if (error.status === 0) return { workday: null, pending: false, offline: true }
    throw error
  }
}

export async function registerWorkday({ department, municipality }) {
  const body = {
    workDate: todayISO(),
    startedAt: new Date().toISOString(),
    department,
    municipality,
  }
  localStorage.setItem(LAST_PLACE_KEY, JSON.stringify({ department, municipality }))
  try {
    const { workday } = await apiFetch('/workdays', { method: 'POST', body })
    localStorage.removeItem(PENDING_KEY)
    return { workday, pending: false }
  } catch (error) {
    if (error.status !== 0) throw error
    localStorage.setItem(PENDING_KEY, JSON.stringify(body))
    return { workday: body, pending: true }
  }
}

// Envía la jornada pendiente. Devuelve true si se envió.
export async function syncPendingWorkday() {
  const pending = readPending()
  if (!pending) return false
  try {
    await apiFetch('/workdays', { method: 'POST', body: pending })
    localStorage.removeItem(PENDING_KEY)
    return true
  } catch (error) {
    // Rechazada por el servidor (ya registrada ese día o datos inválidos):
    // se descarta para no bloquear.
    if (error.status !== 0 && error.status !== 401) localStorage.removeItem(PENDING_KEY)
    return false
  }
}
