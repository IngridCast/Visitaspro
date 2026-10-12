// Acceso a visitas con soporte sin conexión.
//
// Si no hay red, los cambios se guardan en el dispositivo ("Pendiente de
// sincronizar") y se envían al servidor cuando vuelve la conexión:
//   - La cola (localStorage) guarda entradas de dos tipos:
//       { kind: 'create', key, localId, ...datos de la visita, details, photoKeys }
//       { kind: 'update', key, visitId, changes, photoKeys, base }
//   - Las fotos pendientes se guardan en IndexedDB (son demasiado grandes
//     para localStorage) y la cola solo guarda sus claves.
import { del as idbDel, get as idbGet, set as idbSet } from 'idb-keyval'
import { apiFetch } from '../api.js'
import { applyLocalMovements, currentUserId, getSnapshot, upsertLocalVisit } from '../sync/snapshot.js'

const OUTBOX_KEY = 'visitaspro.pendingVisits'
const TOP_LEVEL_FIELDS = ['type', 'visitDate', 'visitTime', 'status']
const DETAIL_FIELDS = [
  'reason',
  'subreason',
  'notes',
  'latitude',
  'longitude',
  'signature',
  'startedAt',
  'endedAt',
  'formData',
]

const isNetworkError = (error) => error?.status === 0
const randomId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

// ---------- Cola ----------

function readOutbox() {
  let items
  try {
    items = JSON.parse(localStorage.getItem(OUTBOX_KEY)) ?? []
  } catch {
    items = []
  }
  // Entradas de versiones anteriores (solo creaciones, sin "kind").
  return items.map((item) =>
    item.kind
      ? item
      : { ...item, kind: 'create', key: item.localId, details: {}, photoKeys: [] },
  )
}

function writeOutbox(items) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
}

function findEntry(key) {
  return readOutbox().find((item) => item.key === key)
}

// Modifica una entrada leyendo siempre la versión más reciente de la cola.
// Si `fn` devuelve null, la entrada se elimina.
function modifyEntry(key, fn) {
  const items = readOutbox()
  const index = items.findIndex((item) => item.key === key)
  const next = fn(index === -1 ? null : items[index])
  if (index === -1) {
    if (next) items.push(next)
  } else if (next) {
    items[index] = next
  } else {
    items.splice(index, 1)
  }
  writeOutbox(items)
  return next
}

function pick(object, fields) {
  return Object.fromEntries(fields.filter((f) => object[f] !== undefined).map((f) => [f, object[f]]))
}

async function storePhotos(blobs) {
  const keys = []
  for (const blob of blobs) {
    const key = `photo-${randomId()}`
    await idbSet(key, blob)
    keys.push(key)
  }
  return keys
}

// ---------- Forma de las visitas para la pantalla ----------

function toLocalVisit(entry) {
  return {
    ...pick(entry, ['agentId', 'agentName', 'agentCode', 'agentAddress', 'agentCity', 'startedAt']),
    ...pick(entry, TOP_LEVEL_FIELDS),
    ...entry.details,
    id: entry.localId,
    localId: entry.localId,
    hasSignature: Boolean(entry.details?.signature),
    pendingPhotos: entry.photoKeys.length,
    pendingSync: true,
    syncError: entry.syncError,
  }
}

function withPendingUpdate(visit, entry) {
  if (!entry) return visit
  return {
    ...visit,
    ...entry.changes,
    hasSignature: visit.hasSignature || Boolean(entry.changes.signature),
    pendingPhotos: entry.photoKeys.length,
    pendingSync: true,
    syncError: entry.syncError,
  }
}

const updateKey = (visitId) => `update-${visitId}`

function matches(visit, filters) {
  if (filters.mine && visit.userId && visit.userId !== currentUserId()) return false
  if (filters.from && visit.visitDate < filters.from) return false
  if (filters.to && visit.visitDate > filters.to) return false
  if (filters.status && visit.status !== filters.status) return false
  if (filters.type && visit.type !== filters.type) return false
  if (filters.city && visit.agentCity !== filters.city) return false
  if (filters.agentId && visit.agentId !== Number(filters.agentId)) return false
  if (
    filters.agentCode &&
    !visit.agentCode?.toLowerCase().includes(filters.agentCode.trim().toLowerCase())
  ) {
    return false
  }
  return true
}

function sortVisits(visits) {
  return visits.sort(
    (a, b) =>
      (a.visitDate ?? '').localeCompare(b.visitDate ?? '') ||
      (a.visitTime ?? '99:99').localeCompare(b.visitTime ?? '99:99'),
  )
}

// ---------- Lectura ----------

// filters: { mine, from, to, status, type, city, agentCode, agentId }
// Devuelve { visits, offline, olderUnavailable, neverSynced }.
//   - Visitas dentro de los últimos 3 meses (o futuras): desde la copia del
//     dispositivo, sin consultar al servidor.
//   - Rangos más antiguos: se consultan en vivo, solo con conexión.
export async function listVisits(filters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      params.set(key, value === true ? '1' : String(value))
    }
  }

  const outbox = readOutbox()
  const created = outbox.filter((e) => e.kind === 'create').map(toLocalVisit)
  const updates = new Map(outbox.filter((e) => e.kind === 'update').map((e) => [e.visitId, e]))
  const snapshot = await getSnapshot()
  const inWindow = snapshot && filters.from && filters.from >= snapshot.windowStart

  let base
  let offline = false
  let olderUnavailable = false
  if (inWindow) {
    base = snapshot.visits
  } else {
    try {
      base = (await apiFetch(`/visits?${params}`)).visits
    } catch (error) {
      if (!isNetworkError(error)) throw error
      offline = true
      olderUnavailable = Boolean(snapshot)
      base = snapshot?.visits ?? []
    }
  }

  const merged = base.map((v) => withPendingUpdate(v, updates.get(v.id)))
  const inBase = new Set(base.map((v) => v.id))
  // Visitas con cambios pendientes que no están en la copia (por ejemplo, antiguas).
  const editedOutside = [...updates.values()]
    .filter((e) => !inBase.has(e.visitId) && e.base)
    .map((e) => withPendingUpdate(e.base, e))

  return {
    visits: sortVisits([...merged, ...editedOutside, ...created].filter((v) => matches(v, filters))),
    offline,
    olderUnavailable,
    neverSynced: !snapshot,
  }
}

// Visita completa (con firma) para la pantalla de visita en curso.
export async function getVisitDetail(visit) {
  if (visit.localId) {
    const entry = findEntry(visit.localId)
    if (!entry) throw new Error('La visita ya fue sincronizada. Actualiza la lista.')
    return toLocalVisit(entry)
  }
  const pending = findEntry(updateKey(visit.id))
  try {
    const { visit: full } = await apiFetch(`/visits/${visit.id}`)
    return withPendingUpdate(full, pending)
  } catch (error) {
    if (!isNetworkError(error)) throw error
    return withPendingUpdate(visit, pending)
  }
}

// Fotos de una visita: [{ key, blob, serverId?, pending }].
// Sin conexión solo devuelve las fotos guardadas en el dispositivo.
export async function getVisitPhotos(visit) {
  const entry = findEntry(visit.localId ?? updateKey(visit.id))
  const photos = []

  if (!visit.localId) {
    try {
      const { photos: list } = await apiFetch(`/visits/${visit.id}/photos`)
      for (const photo of list) {
        const blob = await apiFetch(`/visits/${visit.id}/photos/${photo.id}`, {
          responseType: 'blob',
        })
        photos.push({ key: `server-${photo.id}`, serverId: photo.id, blob, pending: false })
      }
    } catch (error) {
      if (!isNetworkError(error)) throw error
    }
  }

  for (const key of entry?.photoKeys ?? []) {
    const blob = await idbGet(key)
    if (blob) photos.push({ key, blob, pending: true })
  }
  return photos
}

// ---------- Escritura ----------

// agent: { id, name, code, address, municipality }
export async function createVisit(agent, fields) {
  const details = pick(fields, DETAIL_FIELDS)
  const body = { agentId: agent.id, ...pick(fields, TOP_LEVEL_FIELDS), ...details }
  try {
    const { visit } = await apiFetch('/visits', { method: 'POST', body })
    await upsertLocalVisit(visit)
    return visit
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const localId = `local-${randomId()}`
    const entry = modifyEntry(localId, () => ({
      kind: 'create',
      key: localId,
      localId,
      agentId: agent.id,
      ...pick(fields, TOP_LEVEL_FIELDS),
      details,
      photoKeys: [],
      agentName: agent.name,
      agentCode: agent.code,
      agentAddress: agent.address,
      agentCity: agent.municipality,
      startedAt: fields.status === 'en_proceso' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    }))
    return toLocalVisit(entry)
  }
}

function queueUpdate(visit, changes, photoKeys) {
  const entry = modifyEntry(updateKey(visit.id), (current) => ({
    kind: 'update',
    key: updateKey(visit.id),
    visitId: visit.id,
    base: current?.base ?? { ...visit, signature: undefined },
    changes: { ...current?.changes, ...changes },
    photoKeys: [...(current?.photoKeys ?? []), ...photoKeys],
  }))
  return withPendingUpdate(visit, entry)
}

// Guarda cambios de una visita (datos, estado y fotos nuevas).
// Si falla una validación después de subir fotos, el error lleva
// `uploadedPhotos` con cuántas de `newPhotos` ya quedaron en el servidor.
// Al finalizar, los activos se mueven también en el inventario del dispositivo.
async function reflectClose(visit, changes) {
  if (changes.status !== 'cerrada') return
  const movements = changes.formData?.movements ?? visit.formData?.movements
  await applyLocalMovements({ agentId: visit.agentId, movements })
}

export async function saveVisit(visit, changes, newPhotos = []) {
  const saved = await saveVisitRemoteOrQueue(visit, changes, newPhotos)
  await reflectClose(visit, changes)
  return saved
}

async function saveVisitRemoteOrQueue(visit, changes, newPhotos) {
  // Visita creada sin conexión: se actualiza su entrada en la cola.
  if (visit.localId) {
    const photoKeys = await storePhotos(newPhotos)
    const entry = modifyEntry(visit.localId, (current) => {
      if (!current) return null
      return {
        ...current,
        ...pick(changes, TOP_LEVEL_FIELDS),
        details: { ...current.details, ...pick(changes, DETAIL_FIELDS) },
        photoKeys: [...current.photoKeys, ...photoKeys],
        startedAt:
          current.startedAt ?? (changes.status === 'en_proceso' ? new Date().toISOString() : null),
        syncError: undefined,
      }
    })
    if (!entry) throw new Error('La visita ya fue sincronizada. Actualiza la lista.')
    return toLocalVisit(entry)
  }

  // Si ya hay cambios pendientes de esta visita, se agregan a la cola para
  // respetar el orden (se enviarán todos juntos al sincronizar).
  if (findEntry(updateKey(visit.id))) {
    return queueUpdate(visit, changes, await storePhotos(newPhotos))
  }

  // Primero las fotos (una visita cerrada ya no acepta fotos), luego los datos.
  let uploaded = 0
  try {
    for (const blob of newPhotos) {
      await apiFetch(`/visits/${visit.id}/photos`, { method: 'POST', body: blob })
      uploaded++
    }
  } catch (error) {
    if (!isNetworkError(error)) {
      error.uploadedPhotos = uploaded
      throw error
    }
    return queueUpdate(visit, changes, await storePhotos(newPhotos.slice(uploaded)))
  }

  if (Object.keys(changes).length === 0) return visit
  try {
    const { visit: updated } = await apiFetch(`/visits/${visit.id}`, {
      method: 'PATCH',
      body: changes,
    })
    await upsertLocalVisit(updated)
    return updated
  } catch (error) {
    if (!isNetworkError(error)) {
      error.uploadedPhotos = uploaded
      throw error
    }
    return queueUpdate(visit, changes, [])
  }
}

// Quita una foto: si está pendiente se borra del dispositivo; si ya está en
// el servidor se borra allí (requiere conexión).
export async function removeVisitPhoto(visit, photo) {
  if (photo.pending) {
    modifyEntry(visit.localId ?? updateKey(visit.id), (current) =>
      current ? { ...current, photoKeys: current.photoKeys.filter((k) => k !== photo.key) } : null,
    )
    await idbDel(photo.key)
    return
  }
  try {
    await apiFetch(`/visits/${visit.id}/photos/${photo.serverId}`, { method: 'DELETE' })
  } catch (error) {
    if (isNetworkError(error)) throw new Error('Necesitas conexión para quitar una foto ya enviada.')
    throw error
  }
}

// ---------- Sincronización ----------

export function pendingVisitsCount() {
  return readOutbox().length
}

async function syncUpdate(entry) {
  try {
    await sendUpdate(entry)
  } catch (error) {
    error.entryKey = entry.key
    throw error
  }
}

async function sendUpdate(entry) {
  for (const key of entry.photoKeys) {
    const blob = await idbGet(key)
    if (blob) {
      await apiFetch(`/visits/${entry.visitId}/photos`, { method: 'POST', body: blob })
    }
    await idbDel(key)
    modifyEntry(entry.key, (current) =>
      current ? { ...current, photoKeys: current.photoKeys.filter((k) => k !== key) } : null,
    )
  }
  if (Object.keys(entry.changes).length > 0) {
    await apiFetch(`/visits/${entry.visitId}`, { method: 'PATCH', body: entry.changes })
  }
  modifyEntry(entry.key, () => null)
}

async function syncCreate(entry) {
  // 1. Crear la visita.
  const { visit } = await apiFetch('/visits', {
    method: 'POST',
    body: {
      agentId: entry.agentId,
      type: entry.type,
      visitDate: entry.visitDate,
      visitTime: entry.visitTime,
      // Se cierra al final, después de subir las fotos.
      status: entry.status === 'cerrada' ? 'en_proceso' : entry.status,
      ...pick(entry.details, DETAIL_FIELDS),
      // Hora real de inicio (no la hora en que se sincroniza).
      ...(entry.startedAt && !entry.details.startedAt ? { startedAt: entry.startedAt } : {}),
    },
  })
  const visitId = visit.id

  // 2. Convertir la entrada en una actualización de la visita ya creada.
  const update = {
    kind: 'update',
    key: updateKey(visitId),
    visitId,
    base: { ...toLocalVisit(entry), id: visitId, localId: undefined, signature: undefined },
    changes: entry.status === 'cerrada' ? { status: 'cerrada' } : {},
    photoKeys: entry.photoKeys,
  }
  const items = readOutbox().filter((item) => item.key !== entry.key && item.key !== update.key)
  writeOutbox([...items, update])

  // 3. Subir fotos y cerrar si corresponde.
  await syncUpdate(update)
}

let syncing = null

// Envía todo lo pendiente. Devuelve cuántas visitas se sincronizaron.
export function syncPendingVisits() {
  syncing ??= (async () => {
    let synced = 0
    for (const entry of readOutbox()) {
      try {
        if (entry.kind === 'create') await syncCreate(entry)
        else await syncUpdate(findEntry(entry.key) ?? entry)
        synced++
      } catch (error) {
        // Sin red o sesión vencida: se reintenta más tarde.
        if (isNetworkError(error) || error.status === 401) break
        // Rechazada por el servidor: se guarda el motivo para mostrarlo.
        modifyEntry(error.entryKey ?? entry.key, (current) => (current ? { ...current, syncError: error.message } : null))
      }
    }
    return synced
  })().finally(() => {
    syncing = null
  })
  return syncing
}
