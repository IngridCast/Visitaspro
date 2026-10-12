import { Router } from 'express'
import { requireAuth } from './auth.js'
import { db } from './db.js'

// Inicio de labores: una jornada por asesor y por día.
db.exec(`
  CREATE TABLE IF NOT EXISTS workdays (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    work_date    TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    department   TEXT NOT NULL,
    municipality TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT,
    UNIQUE (user_id, work_date)
  )
`)

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function publicWorkday(row) {
  return {
    id: row.id,
    workDate: row.work_date,
    startedAt: row.started_at,
    department: row.department,
    municipality: row.municipality,
  }
}

const findWorkday = (userId, workDate) =>
  db.prepare('SELECT * FROM workdays WHERE user_id = ? AND work_date = ?').get(userId, workDate)

export const workdaysRouter = Router()

workdaysRouter.use(requireAuth)

// GET /workdays?date=YYYY-MM-DD → jornada del usuario ese día (o null)
workdaysRouter.get('/', (req, res) => {
  const date = req.query.date
  if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
    return res.status(400).json({ error: 'Fecha no válida.' })
  }
  const row = findWorkday(req.user.id, date)
  res.json({ workday: row ? publicWorkday(row) : null })
})

// POST /workdays { workDate, startedAt, department, municipality }
// Registra el inicio de labores del día. Solo se permite una vez por día.
// workDate y startedAt los envía el celular (hora local, también sin conexión).
workdaysRouter.post('/', (req, res) => {
  const { workDate, startedAt, department, municipality } = req.body ?? {}
  if (typeof workDate !== 'string' || !DATE_PATTERN.test(workDate)) {
    return res.status(400).json({ error: 'Fecha no válida.' })
  }
  const start = new Date(startedAt)
  if (typeof startedAt !== 'string' || Number.isNaN(start.getTime())) {
    return res.status(400).json({ error: 'Hora de inicio no válida.' })
  }
  // Se tolera una pequeña diferencia de reloj, pero no horas futuras.
  if (start.getTime() > Date.now() + 5 * 60_000) {
    return res.status(400).json({ error: 'La hora de inicio no puede ser futura.' })
  }
  const text = (v) => (typeof v === 'string' ? v.trim().slice(0, 80) : '')
  if (!text(department) || !text(municipality)) {
    return res.status(400).json({ error: 'Selecciona el departamento y el municipio.' })
  }

  if (findWorkday(req.user.id, workDate)) {
    return res.status(409).json({ error: 'Ya registraste el inicio de labores de hoy.' })
  }

  db.prepare(
    `INSERT INTO workdays (user_id, work_date, started_at, department, municipality)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(req.user.id, workDate, start.toISOString(), text(department), text(municipality))

  res.status(201).json({ workday: publicWorkday(findWorkday(req.user.id, workDate)) })
})
