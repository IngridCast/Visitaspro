import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { db, findUserByUsername, insertVisit } from './db.js'

// Rutas para otras aplicaciones del negocio. Se autentican con una clave
// (cabecera X-Api-Key) definida en INTEGRATION_API_KEY del archivo .env.
const API_KEY = process.env.INTEGRATION_API_KEY ?? ''
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const TYPES = ['instalacion', 'retiro']

function requireApiKey(req, res, next) {
  if (API_KEY.length < 24) {
    return res.status(503).json({ error: 'La integración no está configurada (INTEGRATION_API_KEY).' })
  }
  const given = Buffer.from(req.get('X-Api-Key') ?? '')
  const expected = Buffer.from(API_KEY)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return res.status(401).json({ error: 'Clave de integración no válida.' })
  }
  next()
}

export const integrationsRouter = Router()

integrationsRouter.use(requireApiKey)

// POST /integrations/visits
// { type: 'instalacion' | 'retiro', agentCode, username, visitDate: 'AAAA-MM-DD', visitTime?: 'HH:MM' }
// Crea una visita programada de instalación o retiro para un asesor.
integrationsRouter.post('/visits', (req, res) => {
  const { type, agentCode, username, visitDate, visitTime } = req.body ?? {}

  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: 'type debe ser "instalacion" o "retiro".' })
  }
  const agent =
    typeof agentCode === 'string'
      ? db.prepare('SELECT * FROM agents WHERE code = ?').get(agentCode.trim())
      : null
  if (!agent) return res.status(400).json({ error: 'agentCode no existe.' })
  const user = typeof username === 'string' ? findUserByUsername(username.trim()) : null
  if (!user || !user.active) return res.status(400).json({ error: 'username no existe o está inactivo.' })
  if (typeof visitDate !== 'string' || !DATE_PATTERN.test(visitDate) || Number.isNaN(Date.parse(visitDate))) {
    return res.status(400).json({ error: 'visitDate no es válida (AAAA-MM-DD).' })
  }
  if (visitTime !== undefined && visitTime !== null && !TIME_PATTERN.test(visitTime)) {
    return res.status(400).json({ error: 'visitTime no es válida (HH:MM).' })
  }

  const visit = insertVisit({
    agentId: agent.id,
    userId: user.id,
    type,
    visitDate,
    visitTime: visitTime ?? null,
    status: 'programada',
  })
  res.status(201).json({
    visit: { id: visit.id, type: visit.type, agentCode: agent.code, username: user.username, visitDate, status: visit.status },
  })
})
