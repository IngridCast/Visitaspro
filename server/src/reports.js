import { Router } from 'express'
import { requireAuth } from './auth.js'
import { db, findUserById } from './db.js'

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

function parseForm(value) {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

// Minutos entre inicio y fin (ignora datos incompletos o inconsistentes).
function minutesBetween(start, end) {
  const ms = new Date(end) - new Date(start)
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60_000) : 0
}

export function monthlyReport(userId, month) {
  const from = `${month}-01`
  const to = `${month}-31`
  const visits = db
    .prepare(
      `SELECT * FROM visits
       WHERE user_id = ? AND visit_date BETWEEN ? AND ? AND status != 'cancelada'`,
    )
    .all(userId, from, to)

  const byType = (type) => visits.filter((v) => v.type === type)
  const closed = visits.filter((v) => v.status === 'cerrada')

  // Activos instalados / retirados en visitas finalizadas.
  let installations = 0
  let removals = 0
  for (const visit of closed) {
    for (const m of parseForm(visit.form_data)?.movements ?? []) {
      if (m.inAsset) installations++
      if (m.outAsset) removals++
    }
  }

  // Tiempo invertido (inicio → fin) por tipo de visita, en minutos.
  const minutes = { comercial: 0, hotline: 0, pm: 0, otros_soportes: 0, instalacion: 0, retiro: 0 }
  for (const visit of visits) {
    if (visit.started_at && visit.ended_at && visit.type in minutes) {
      minutes[visit.type] += minutesBetween(visit.started_at, visit.ended_at)
    }
  }

  // Cobertura de agentes.
  const assigned = db
    .prepare('SELECT id FROM agents WHERE assigned_user_id = ?')
    .all(userId)
    .map((a) => a.id)
  const assignedSet = new Set(assigned)
  const visited = new Set(closed.map((v) => v.agent_id))
  const ownVisited = [...visited].filter((id) => assignedSet.has(id)).length

  return {
    month,
    counts: {
      hotline: byType('hotline').length,
      preventive: byType('pm').length,
      commercial: byType('comercial').length,
      otherSupport: byType('otros_soportes').length,
      installations,
      removals,
      open: visits.filter((v) => v.status !== 'cerrada').length,
      closed: closed.length,
      unplanned: visits.filter((v) => v.status === 'sin_programar').length,
      planned: visits.filter((v) => v.status !== 'sin_programar').length,
    },
    minutes: {
      ...minutes,
      total: Object.values(minutes).reduce((a, b) => a + b, 0),
    },
    productivity: {
      assignedAgents: assigned.length,
      visitedAgents: visited.size,
      coverage: assigned.length ? Math.round((ownVisited / assigned.length) * 1000) / 10 : 0,
      executedJobs: closed.length,
      ownAgents: ownVisited,
      supportAgents: visited.size - ownVisited,
    },
  }
}

export const reportsRouter = Router()

reportsRouter.use(requireAuth)

// GET /reports/monthly?month=YYYY-MM[&userId=]  (userId de otro asesor: solo admin)
reportsRouter.get('/monthly', (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : ''
  if (!MONTH_PATTERN.test(month)) {
    return res.status(400).json({ error: 'Mes no válido (formato AAAA-MM).' })
  }
  const userId = req.query.userId ? Number(req.query.userId) : req.user.id
  if (userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo puedes ver tu propio reporte.' })
  }
  if (!findUserById(userId)) return res.status(404).json({ error: 'Usuario no encontrado.' })
  res.json({ report: monthlyReport(userId, month) })
})
