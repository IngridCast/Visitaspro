// Copia local de los datos de trabajo (visitas de los últimos 3 meses y
// próximas, inventario del asesor e inventario de los agentes), para usar la
// app sin conexión. Se guarda en IndexedDB y solo se reemplaza al tocar
// "Sincronizar". Lo que se guarda con conexión también se refleja aquí.
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { loadLocalSession } from '../auth/localAuth.js'
import { toISODate } from '../visits/dates.js'

const KEY = 'visitaspro.snapshot'
export const OFFLINE_MONTHS = 3

let cache // undefined = todavía no se leyó de IndexedDB
const listeners = new Set()

export function currentUserId() {
  return loadLocalSession()?.user?.id ?? null
}

// Fecha desde la que se guardan visitas en el dispositivo ("YYYY-MM-DD").
export function offlineWindowStart() {
  const date = new Date()
  date.setMonth(date.getMonth() - OFFLINE_MONTHS)
  return toISODate(date)
}

// Avisa a la app cuando cambian los datos locales (tras sincronizar).
export function onDataChanged(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyDataChanged() {
  listeners.forEach((listener) => listener())
}

// Copia del usuario actual, o null si nunca se sincronizó en este dispositivo.
export async function getSnapshot() {
  if (cache === undefined) {
    try {
      cache = (await idbGet(KEY)) ?? null
    } catch {
      cache = null
    }
  }
  return cache && cache.userId === currentUserId() ? cache : null
}

export async function saveSnapshot(snapshot) {
  cache = snapshot
  await idbSet(KEY, snapshot)
}

async function update(fn) {
  const snapshot = await getSnapshot()
  if (!snapshot) return
  await saveSnapshot(fn(snapshot))
}

// La firma no se guarda en la copia (ocupa mucho); se consulta al abrir la visita.
function slimVisit(visit) {
  // eslint-disable-next-line no-unused-vars
  const { signature, ...rest } = visit
  return rest
}

// Agrega o reemplaza una visita guardada con conexión.
export function upsertLocalVisit(visit) {
  if (!visit || typeof visit.id !== 'number') return Promise.resolve()
  return update((s) => ({
    ...s,
    visits: [...s.visits.filter((v) => v.id !== visit.id), slimVisit(visit)],
  }))
}

// Refleja en el inventario local los movimientos de una visita finalizada.
export function applyLocalMovements({ agentId, movements }) {
  if (!movements?.length) return Promise.resolve()
  return update((s) => {
    let myAssets = [...s.myAssets]
    let agentAssets = [...s.agentAssets]
    for (const m of movements) {
      if (m.inAsset) {
        const asset = myAssets.find((a) => a.code === m.inAsset)
        myAssets = myAssets.filter((a) => a.code !== m.inAsset)
        if (asset) agentAssets.push({ ...asset, agentId, status: 'instalado' })
      }
      if (m.outAsset) {
        const asset = agentAssets.find((a) => a.code === m.outAsset)
        agentAssets = agentAssets.filter((a) => a.code !== m.outAsset)
        if (asset) myAssets.push({ ...asset, agentId: undefined, status: 'retirado' })
      }
    }
    return { ...s, myAssets, agentAssets }
  })
}

export function addLocalAsset(asset) {
  return update((s) => ({ ...s, myAssets: [...s.myAssets.filter((a) => a.code !== asset.code), asset] }))
}
