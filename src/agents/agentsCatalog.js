// Información de agentes guardada en el dispositivo, para usarla sin conexión.
// Solo se actualiza cuando el usuario toca "Sincronizar".
import { useSyncExternalStore } from 'react'
import { apiFetch } from '../api.js'

const KEY = 'visitaspro.agentsCatalog'
const listeners = new Set()

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

let catalog = load() // { userId, syncedAt, agents: [...], mineIds: [...] } | null

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// La copia es de un usuario: si entra otro en el mismo dispositivo no se usa.
export function getCatalog(userId) {
  return catalog && catalog.userId === userId ? catalog : null
}

// Descarga todos los agentes (con su información general) y cuáles son del usuario.
export async function syncAgentsCatalog(userId) {
  let all
  let mine
  try {
    ;[all, mine] = await Promise.all([apiFetch('/agents'), apiFetch('/agents?mine=1')])
  } catch (error) {
    if (error.status === 0) throw new Error('Necesitas conexión para sincronizar la información.')
    throw error
  }
  catalog = {
    userId,
    syncedAt: new Date().toISOString(),
    agents: all.agents,
    mineIds: mine.agents.map((a) => a.id),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(catalog))
  } catch {
    // Sin espacio en el dispositivo: la copia queda solo en memoria.
  }
  notify()
  return catalog
}

// Copia local de agentes del usuario (o null si nunca se sincronizó).
export function useAgentsCatalog(userId) {
  const current = useSyncExternalStore(subscribe, () => catalog)
  return current && current.userId === userId ? current : null
}

export function findAgent(current, agentId) {
  return current?.agents.find((a) => a.id === Number(agentId)) ?? null
}
