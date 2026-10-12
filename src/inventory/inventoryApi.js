// Inventarios de activos.
//   - El inventario del asesor y el de los agentes se leen de la copia del
//     dispositivo (se descarga con "Sincronizar"), con o sin conexión.
//   - El inventario de otro asesor (administradores) se consulta en vivo.
import { apiFetch } from '../api.js'
import { addLocalAsset, currentUserId, getSnapshot } from '../sync/snapshot.js'

const NOT_SYNCED = 'Toque "Sincronizar" en Inicio para descargar el inventario a este dispositivo.'

const CACHE_PREFIX = 'visitaspro.inventory.'

async function cachedAssets(path, cacheKey) {
  try {
    const { assets } = await apiFetch(path)
    try {
      localStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(assets))
    } catch {
      // Sin espacio: se sigue sin copia local.
    }
    return { assets, offline: false }
  } catch (error) {
    if (error.status !== 0) throw error
    const saved = localStorage.getItem(CACHE_PREFIX + cacheKey)
    if (saved) return { assets: JSON.parse(saved), offline: true }
    throw new Error('Sin conexión y sin una copia guardada del inventario.')
  }
}

// Activos que anda cargando el usuario actual (copia del dispositivo).
export async function getMyAssets() {
  const snapshot = await getSnapshot()
  if (!snapshot) throw new Error(NOT_SYNCED)
  return { assets: snapshot.myAssets, offline: false }
}

// Activos de un asesor (solo administradores, o el propio usuario).
export function getUserAssets(userId) {
  return cachedAssets(`/inventory/users/${userId}`, `user-${userId}`)
}

// Activos instalados en un agente (copia del dispositivo).
export async function getAgentAssets(agentId) {
  const snapshot = await getSnapshot()
  if (!snapshot) throw new Error(NOT_SYNCED)
  return { assets: snapshot.agentAssets.filter((a) => a.agentId === Number(agentId)), offline: false }
}

export async function getAdvisors() {
  const { advisors } = await apiFetch('/inventory/advisors')
  return advisors
}

export async function assignAsset(asset) {
  const { asset: created } = await apiFetch('/inventory', { method: 'POST', body: asset })
  if (asset.holderUserId === currentUserId()) await addLocalAsset(created)
  return created
}

// "LTE-5060" → "LTE"
export function assetPrefix(code) {
  return (code ?? '').split('-')[0]
}

// Historial de movimientos de activos.
// params: { advisorId, agentId, assetCode, visitId } (uno o varios)
export async function getMovements(params) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
  try {
    const { movements } = await apiFetch(`/inventory/movements?${query}`)
    return movements
  } catch (error) {
    if (error.status === 0) throw new Error('Necesitas conexión para ver el historial de movimientos.')
    throw error
  }
}
