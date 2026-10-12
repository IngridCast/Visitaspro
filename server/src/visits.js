import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import express, { Router } from 'express'
import { requireAuth } from './auth.js'
import {
  countVisitPhotos,
  deleteVisitPhoto,
  findAgentById,
  findVisitById,
  findVisitPhoto,
  insertVisit,
  insertVisitPhoto,
  listVisitPhotos,
  photosDir,
  queryVisits,
  recordAgentVisit,
  transaction,
  updateVisit,
  applyEquipmentMovements,
  validateEquipmentMovements,
  VISIT_TYPE_VALUES,
} from './db.js'

const VISIT_TYPES = VISIT_TYPE_VALUES
const VISIT_STATUSES = ['programada', 'sin_programar', 'en_proceso', 'cerrada', 'cancelada']
// Estados finales: la visita ya no se puede modificar.
const FINAL_STATUSES = ['cerrada', 'cancelada']
// Tipos que ya se pueden iniciar (tienen su pantalla de visita en curso en la app).
const STARTABLE_TYPES = ['comercial', 'pm', 'hotline', 'otros_soportes', 'instalacion', 'retiro']
// Tipos que solo se crean desde otra aplicación (no desde esta app).
export const ASSIGNED_TYPES = ['instalacion', 'retiro']
const MAX_FORM_DATA_LENGTH = 20_000

function parseFormData(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
const NOT_STARTABLE_ERROR = 'El inicio de este tipo de visita estará disponible próximamente.'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_PHOTOS = 10
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const MAX_SIGNATURE_LENGTH = 500_000
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Orden del ciclo de vida: no se puede volver a un estado anterior.
const STATUS_ORDER = { sin_programar: 0, programada: 0, en_proceso: 1, cerrada: 2, cancelada: 2 }

// SQLite guarda datetime('now') en UTC sin zona: "2026-10-11 02:28:15".
function sqliteToIso(value) {
  return value ? `${value.replace(' ', 'T')}Z` : null
}

// Fecha y hora local del servidor: "2026-10-11T09:41".
function localDateTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function publicVisit(visit, { withSignature = false } = {}) {
  return {
    id: visit.id,
    agentId: visit.agent_id,
    agentCode: visit.agent_code,
    agentName: visit.agent_name,
    agentAddress: visit.agent_address,
    agentCity: visit.agent_city,
    userId: visit.user_id,
    userName: visit.user_name,
    type: visit.type,
    visitDate: visit.visit_date,
    visitTime: visit.visit_time,
    status: visit.status,
    startedAt: visit.started_at,
    closedAt: visit.closed_at,
    endedAt: visit.ended_at,
    reason: visit.reason,
    subreason: visit.subreason,
    notes: visit.notes,
    latitude: visit.latitude,
    longitude: visit.longitude,
    formData: parseFormData(visit.form_data),
    hasSignature: Boolean(visit.signature),
    ...(withSignature ? { signature: visit.signature } : {}),
    syncedAt: sqliteToIso(visit.created_at),
  }
}

function isValidDate(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
}

function isValidTime(value) {
  return value === undefined || value === null || (typeof value === 'string' && TIME_PATTERN.test(value))
}

const optionalText = (max) => (value) =>
  value === null || (typeof value === 'string' && value.length <= max)

// Campos que se llenan durante la visita: [validador, mensaje de error].
const detailValidators = {
  reason: [optionalText(100), 'Razón no válida.'],
  subreason: [optionalText(150), 'Sub razón no válida.'],
  notes: [optionalText(2000), 'Las observaciones son demasiado largas.'],
  latitude: [(v) => v === null || (typeof v === 'number' && v >= -90 && v <= 90), 'Latitud no válida.'],
  longitude: [(v) => v === null || (typeof v === 'number' && v >= -180 && v <= 180), 'Longitud no válida.'],
  formData: [
    (v) =>
      v === null ||
      (typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= MAX_FORM_DATA_LENGTH),
    'Datos del formulario no válidos.',
  ],
  startedAt: [
    (v) => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)),
    'Hora de inicio no válida.',
  ],
  endedAt: [
    (v) => v === null || (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v))),
    'Hora de fin no válida.',
  ],
  signature: [
    (v) => v === null || (typeof v === 'string' && v.startsWith('data:image/') && v.length <= MAX_SIGNATURE_LENGTH),
    'Firma no válida.',
  ],
}

// Devuelve { error } o { details } con los campos de detalle presentes en body.
function readDetails(body) {
  const details = {}
  for (const [field, [isValid, message]] of Object.entries(detailValidators)) {
    if (body[field] === undefined) continue
    if (!isValid(body[field])) return { error: message }
    details[field] = body[field]
  }
  return { details }
}

function canAccess(visit, user) {
  return visit.user_id === user.id || user.role === 'admin'
}

export const visitsRouter = Router()

visitsRouter.use(requireAuth)

// GET /visits?mine=1&from=YYYY-MM-DD&to=YYYY-MM-DD&status=&type=&city=&agentCode=&agentId=
visitsRouter.get('/', (req, res) => {
  const { mine, from, to, status, type, city, agentCode, agentId } = req.query
  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return res.status(400).json({ error: 'Rango de fechas no válido.' })
  }
  const visits = queryVisits({
    userId: mine === '1' || mine === 'true' ? req.user.id : undefined,
    agentId: agentId ? Number(agentId) : undefined,
    from,
    to,
    status: VISIT_STATUSES.includes(status) ? status : undefined,
    type: VISIT_TYPES.includes(type) ? type : undefined,
    city: typeof city === 'string' && city ? city : undefined,
    agentCode: typeof agentCode === 'string' && agentCode.trim() ? agentCode.trim() : undefined,
  })
  res.json({ visits: visits.map((v) => publicVisit(v)) })
})

visitsRouter.get('/:id', (req, res) => {
  const visit = findVisitById(Number(req.params.id))
  if (!visit) return res.status(404).json({ error: 'Visita no encontrada.' })
  res.json({ visit: publicVisit(visit, { withSignature: true }) })
})

// POST /visits  { agentId, type, visitDate, visitTime?, status?, ...detalles }
// Se usa también para sincronizar visitas registradas sin conexión.
visitsRouter.post('/', (req, res) => {
  const body = req.body ?? {}
  const { agentId, type, visitDate, visitTime, status = 'programada' } = body

  if (!findAgentById(Number(agentId))) {
    return res.status(400).json({ error: 'Agente no válido.' })
  }
  if (!VISIT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Selecciona un tipo de visita.' })
  }
  if (ASSIGNED_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Las visitas de instalación y retiro se crean desde otra aplicación.' })
  }
  if (!isValidDate(visitDate)) {
    return res.status(400).json({ error: 'La fecha de visita no es válida.' })
  }
  if (!isValidTime(visitTime)) {
    return res.status(400).json({ error: 'La hora de visita no es válida.' })
  }
  // Una visita se cierra con PATCH, después de subir sus fotos.
  if (!VISIT_STATUSES.includes(status) || FINAL_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estado de visita no válido.' })
  }
  if (status === 'en_proceso' && !STARTABLE_TYPES.includes(type)) {
    return res.status(400).json({ error: NOT_STARTABLE_ERROR })
  }
  const { error, details } = readDetails(body)
  if (error) return res.status(400).json({ error })

  const visit = insertVisit({
    agentId: Number(agentId),
    userId: req.user.id,
    type,
    visitDate,
    visitTime,
    status,
    startedAt: status === 'en_proceso' ? new Date().toISOString() : null,
  })
  const saved = Object.keys(details).length ? updateVisit(visit.id, details) : visit
  res.status(201).json({ visit: publicVisit(saved, { withSignature: true }) })
})

// PATCH /visits/:id  { type?, visitDate?, visitTime?, status?, ...detalles }
visitsRouter.patch('/:id', (req, res) => {
  const visit = findVisitById(Number(req.params.id))
  if (!visit) return res.status(404).json({ error: 'Visita no encontrada.' })
  if (!canAccess(visit, req.user)) {
    return res.status(403).json({ error: 'Solo puedes editar tus propias visitas.' })
  }
  if (FINAL_STATUSES.includes(visit.status)) {
    return res.status(400).json({ error: 'Una visita cerrada o cancelada ya no se puede editar.' })
  }

  const body = req.body ?? {}
  const { type, visitDate, visitTime, status } = body
  const { error, details } = readDetails(body)
  if (error) return res.status(400).json({ error })

  const changes = { ...details }

  // El tipo se define al crear la visita y no se puede cambiar.
  if (type !== undefined && type !== visit.type) {
    return res.status(400).json({ error: 'El tipo de visita no se puede cambiar.' })
  }
  if (visitDate !== undefined) {
    if (!isValidDate(visitDate)) return res.status(400).json({ error: 'La fecha de visita no es válida.' })
    changes.visitDate = visitDate
  }
  if (visitTime !== undefined) {
    if (!isValidTime(visitTime)) return res.status(400).json({ error: 'La hora de visita no es válida.' })
    changes.visitTime = visitTime
  }
  let movementsToApply = []
  if (status !== undefined && status !== visit.status) {
    if (!VISIT_STATUSES.includes(status) || STATUS_ORDER[status] < STATUS_ORDER[visit.status]) {
      return res.status(400).json({ error: 'Cambio de estado no válido.' })
    }
    if (status === 'en_proceso' && !STARTABLE_TYPES.includes(visit.type)) {
      return res.status(400).json({ error: NOT_STARTABLE_ERROR })
    }
    if (status === 'cerrada') {
      const merged = { ...visit, ...details }
      // Requisitos propios de cada tipo de visita.
      if (visit.type === 'comercial') {
        if (!merged.reason || !merged.subreason) {
          return res.status(400).json({ error: 'Para finalizar la visita indica la razón y la sub razón.' })
        }
        if (!merged.signature) {
          return res.status(400).json({ error: 'Para finalizar la visita se necesita la firma.' })
        }
      }
      if (visit.type === 'hotline' || visit.type === 'otros_soportes') {
        const form = details.formData !== undefined ? details.formData : parseFormData(visit.form_data)
        if (!form?.supportCase || !form?.problem || !form?.solution) {
          return res.status(400).json({ error: 'Para finalizar la visita completa el caso de soporte, el problema y la solución.' })
        }
        if (!merged.signature) {
          return res.status(400).json({ error: 'Para finalizar la visita se necesita la firma.' })
        }
        const movementError = validateEquipmentMovements({
          agentId: visit.agent_id,
          userId: visit.user_id,
          movements: form.movements,
        })
        if (movementError) return res.status(400).json({ error: movementError })
        movementsToApply = form.movements ?? []
      }
      if (ASSIGNED_TYPES.includes(visit.type)) {
        const form = details.formData !== undefined ? details.formData : parseFormData(visit.form_data)
        const movements = form?.movements ?? []
        if (movements.length === 0) {
          return res.status(400).json({
            error: `Para finalizar la visita registra al menos un movimiento de ${visit.type === 'instalacion' ? 'instalación' : 'retiro'}.`,
          })
        }
        const movementError = validateEquipmentMovements({
          agentId: visit.agent_id,
          userId: visit.user_id,
          movements,
        })
        if (movementError) return res.status(400).json({ error: movementError })
        movementsToApply = movements
      }
      if (visit.type === 'pm' && countVisitPhotos(visit.id) < 1) {
        return res.status(400).json({ error: 'Para finalizar la visita agrega al menos 1 foto de evidencia.' })
      }
      if (merged.latitude == null || merged.longitude == null) {
        return res.status(400).json({ error: 'Registra las coordenadas de ubicación antes de enviar la visita.' })
      }
      if (!merged.ended_at && !details.endedAt) {
        return res.status(400).json({ error: 'Registra la hora de fin antes de enviar la visita.' })
      }
      const start = details.startedAt ?? visit.started_at
      const end = details.endedAt ?? visit.ended_at
      if (start && end && new Date(end) < new Date(start)) {
        return res.status(400).json({ error: 'La hora de fin es anterior a la hora de inicio.' })
      }
    }
    const now = new Date().toISOString()
    changes.status = status
    if (STATUS_ORDER[status] >= 1 && !visit.started_at) changes.startedAt = now
    if (status === 'cerrada') changes.closedAt = now
  }

  // Al cerrar se guardan los cambios y se mueven los activos en una sola operación.
  const updated = transaction(() => {
    const result = updateVisit(visit.id, changes)
    if (changes.status === 'cerrada') {
      recordAgentVisit(result.agent_id, {
        type: result.type,
        closedAt: localDateTime(),
        userName: result.user_name,
      })
      applyEquipmentMovements({
        visitId: visit.id,
        agentId: visit.agent_id,
        userId: visit.user_id,
        movements: movementsToApply,
      })
    }
    return result
  })
  res.json({ visit: publicVisit(updated, { withSignature: true }) })
})

// ---------- Fotos ----------

function loadEditableVisit(req, res) {
  const visit = findVisitById(Number(req.params.id))
  if (!visit) {
    res.status(404).json({ error: 'Visita no encontrada.' })
    return null
  }
  if (!canAccess(visit, req.user)) {
    res.status(403).json({ error: 'Solo puedes modificar tus propias visitas.' })
    return null
  }
  if (FINAL_STATUSES.includes(visit.status)) {
    res.status(400).json({ error: 'Una visita cerrada o cancelada ya no se puede modificar.' })
    return null
  }
  return visit
}

function publicPhoto(photo) {
  return { id: photo.id, size: photo.size, createdAt: sqliteToIso(photo.created_at) }
}

visitsRouter.get('/:id/photos', (req, res) => {
  const visitId = Number(req.params.id)
  if (!findVisitById(visitId)) return res.status(404).json({ error: 'Visita no encontrada.' })
  res.json({ photos: listVisitPhotos(visitId).map(publicPhoto) })
})

visitsRouter.get('/:id/photos/:photoId', (req, res) => {
  const photo = findVisitPhoto(Number(req.params.id), Number(req.params.photoId))
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada.' })
  res.type(photo.mime)
  res.set('Cache-Control', 'private, max-age=31536000, immutable')
  createReadStream(join(photosDir, photo.filename))
    .on('error', () => {
      if (!res.headersSent) res.status(404).json({ error: 'Archivo de foto no encontrado.' })
      else res.end()
    })
    .pipe(res)
})

// POST /visits/:id/photos  con la imagen como cuerpo (Content-Type: image/jpeg|png|webp)
visitsRouter.post(
  '/:id/photos',
  express.raw({ type: Object.keys(PHOTO_TYPES), limit: MAX_PHOTO_BYTES }),
  async (req, res) => {
    const visit = loadEditableVisit(req, res)
    if (!visit) return

    const extension = PHOTO_TYPES[req.get('Content-Type')]
    if (!extension || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Formato de foto no válido (usa JPG, PNG o WebP).' })
    }
    if (countVisitPhotos(visit.id) >= MAX_PHOTOS) {
      return res.status(400).json({ error: `Máximo ${MAX_PHOTOS} fotos por visita.` })
    }

    const filename = `${visit.id}-${randomUUID()}.${extension}`
    await writeFile(join(photosDir, filename), req.body)
    const photo = insertVisitPhoto({
      visitId: visit.id,
      filename,
      mime: req.get('Content-Type'),
      size: req.body.length,
    })
    res.status(201).json({ photo: publicPhoto(photo) })
  },
)

visitsRouter.delete('/:id/photos/:photoId', async (req, res) => {
  const visit = loadEditableVisit(req, res)
  if (!visit) return
  const photo = findVisitPhoto(visit.id, Number(req.params.photoId))
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada.' })
  deleteVisitPhoto(photo.id)
  await unlink(join(photosDir, photo.filename)).catch(() => {})
  res.status(204).end()
})
