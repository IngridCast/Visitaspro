import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const dbPath = resolve(process.env.DB_PATH || './data/visitaspro.db')
mkdirSync(dirname(dbPath), { recursive: true })

export const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    email         TEXT,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    code             TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name             TEXT NOT NULL,
    department       TEXT,
    municipality     TEXT,
    address          TEXT,
    assigned_user_id INTEGER REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// Columnas agregadas después de crear la tabla; se añaden si faltan
// para no perder los datos existentes.
const agentExtraColumns = {
  zone: 'TEXT',
  subzone: 'TEXT',
  locality: 'TEXT',
  category: 'TEXT',
  sales_manager: 'TEXT',
  advisor: 'TEXT',
  pm_by: 'TEXT',
  last_pm_at: 'TEXT',
  last_visit_at: 'TEXT',
  latitude: 'REAL',
  longitude: 'REAL',
}

const existingAgentColumns = new Set(
  db.prepare('PRAGMA table_info(agents)').all().map((column) => column.name),
)
for (const [column, type] of Object.entries(agentExtraColumns)) {
  if (!existingAgentColumns.has(column)) {
    db.exec(`ALTER TABLE agents ADD COLUMN ${column} ${type}`)
  }
}

// Nombre del campo en la API → columna en la base de datos.
export const agentFields = {
  code: 'code',
  name: 'name',
  department: 'department',
  municipality: 'municipality',
  address: 'address',
  zone: 'zone',
  subzone: 'subzone',
  locality: 'locality',
  category: 'category',
  salesManager: 'sales_manager',
  advisor: 'advisor',
  pmBy: 'pm_by',
  lastPmAt: 'last_pm_at',
  lastVisitAt: 'last_visit_at',
  latitude: 'latitude',
  longitude: 'longitude',
  assignedUserId: 'assigned_user_id',
}

export function listAgents({ assignedUserId } = {}) {
  if (assignedUserId !== undefined) {
    return db
      .prepare('SELECT * FROM agents WHERE assigned_user_id = ? ORDER BY name COLLATE NOCASE')
      .all(assignedUserId)
  }
  return db.prepare('SELECT * FROM agents ORDER BY name COLLATE NOCASE').all()
}

export function findAgentById(id) {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id)
}

export function upsertAgent(agent) {
  const columns = Object.values(agentFields)
  const values = Object.keys(agentFields).map((field) => agent[field] ?? null)
  const updates = columns
    .filter((column) => column !== 'code')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  db.prepare(
    `INSERT INTO agents (${columns.join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})
     ON CONFLICT(code) DO UPDATE SET ${updates}`,
  ).run(...values)
}

export const VISIT_TYPE_VALUES = [
  'comercial',
  'hotline',
  'pm',
  'otros_soportes',
  // Se crean desde otra aplicación (ruta /integrations/visits).
  'instalacion',
  'retiro',
]
const VISIT_STATUS_VALUES = ['programada', 'sin_programar', 'en_proceso', 'cerrada', 'cancelada']
const sqlList = (values) => values.map((v) => `'${v}'`).join(', ')

// Esquema completo de la tabla de visitas.
const visitsTableSql = (name) => `
  CREATE TABLE ${name} (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id   INTEGER NOT NULL REFERENCES agents(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    type       TEXT NOT NULL CHECK (type IN (${sqlList(VISIT_TYPE_VALUES)})),
    visit_date TEXT NOT NULL,
    visit_time TEXT,
    status     TEXT NOT NULL CHECK (status IN (${sqlList(VISIT_STATUS_VALUES)})),
    started_at TEXT,
    closed_at  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    -- Datos que se llenan durante la visita (pantalla de visita en curso).
    reason     TEXT,
    subreason  TEXT,
    notes      TEXT,
    latitude   REAL,
    longitude  REAL,
    signature  TEXT,
    ended_at   TEXT,
    -- Datos propios de cada tipo de visita (por ejemplo, el caso de soporte y
    -- los movimientos de equipo de una Hotline), guardados como JSON.
    form_data  TEXT
  )
`
const VISIT_COLUMNS = [
  'id', 'agent_id', 'user_id', 'type', 'visit_date', 'visit_time', 'status', 'started_at',
  'closed_at', 'created_at', 'updated_at', 'reason', 'subreason', 'notes', 'latitude',
  'longitude', 'signature', 'ended_at', 'form_data',
]

// SQLite no permite cambiar las reglas (CHECK) de una tabla. Cuando cambian los
// tipos o estados de visita, se recrea la tabla conservando todas las visitas
// (procedimiento recomendado por SQLite: tabla nueva, copiar, borrar, renombrar).
function rebuildVisitsTable() {
  const oldColumns = new Set(db.prepare('PRAGMA table_info(visits)').all().map((c) => c.name))
  const columns = VISIT_COLUMNS.filter((c) => oldColumns.has(c))
  const select = columns.map((c) =>
    c === 'status'
      ? `CASE status WHEN 'pendiente' THEN 'programada'
                    WHEN 'en_curso'  THEN 'en_proceso'
                    WHEN 'finalizada' THEN 'cerrada'
                    ELSE status END`
      : c,
  )
  const foreignKeys = db.prepare('PRAGMA foreign_keys').get().foreign_keys
  db.exec('PRAGMA foreign_keys = OFF')
  db.exec('BEGIN')
  try {
    db.exec(visitsTableSql('visits_new'))
    db.exec(`INSERT INTO visits_new (${columns.join(', ')}) SELECT ${select.join(', ')} FROM visits`)
    db.exec('DROP TABLE visits')
    db.exec('ALTER TABLE visits_new RENAME TO visits')
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally {
    db.exec(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`)
  }
}

const currentVisitsSql = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'visits'")
  .get()?.sql
if (!currentVisitsSql) {
  db.exec(visitsTableSql('visits'))
} else if (
  [...VISIT_TYPE_VALUES, ...VISIT_STATUS_VALUES].some((v) => !currentVisitsSql.includes(`'${v}'`)) ||
  VISIT_COLUMNS.some((c) => !currentVisitsSql.includes(c))
) {
  rebuildVisitsTable()
}
db.exec('CREATE INDEX IF NOT EXISTS idx_visits_user_date ON visits (user_id, visit_date)')
db.exec('CREATE INDEX IF NOT EXISTS idx_visits_agent_date ON visits (agent_id, visit_date)')

db.exec(`
  CREATE TABLE IF NOT EXISTS visit_photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id   INTEGER NOT NULL REFERENCES visits(id),
    filename   TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

export const photosDir = resolve(dirname(dbPath), 'photos')
mkdirSync(photosDir, { recursive: true })

export function listVisitPhotos(visitId) {
  return db.prepare('SELECT * FROM visit_photos WHERE visit_id = ? ORDER BY id').all(visitId)
}

export function countVisitPhotos(visitId) {
  return db.prepare('SELECT COUNT(*) AS n FROM visit_photos WHERE visit_id = ?').get(visitId).n
}

export function findVisitPhoto(visitId, photoId) {
  return db.prepare('SELECT * FROM visit_photos WHERE visit_id = ? AND id = ?').get(visitId, photoId)
}

export function insertVisitPhoto({ visitId, filename, mime, size }) {
  const result = db
    .prepare('INSERT INTO visit_photos (visit_id, filename, mime, size) VALUES (?, ?, ?, ?)')
    .run(visitId, filename, mime, size)
  return db.prepare('SELECT * FROM visit_photos WHERE id = ?').get(Number(result.lastInsertRowid))
}

export function deleteVisitPhoto(photoId) {
  db.prepare('DELETE FROM visit_photos WHERE id = ?').run(photoId)
}

// Al cerrar una visita se actualiza la ficha del agente.
export function recordAgentVisit(agentId, { type, closedAt, userName }) {
  if (type === 'pm') {
    db.prepare('UPDATE agents SET last_pm_at = ?, pm_by = ? WHERE id = ?').run(closedAt, userName, agentId)
  } else if (type === 'comercial') {
    db.prepare('UPDATE agents SET last_visit_at = ? WHERE id = ?').run(closedAt, agentId)
  }
}

const visitSelect = `
  SELECT v.*, a.code AS agent_code, a.name AS agent_name, a.address AS agent_address,
         a.municipality AS agent_city, u.name AS user_name
  FROM visits v
  JOIN agents a ON a.id = v.agent_id
  JOIN users u ON u.id = v.user_id
`

export function findVisitById(id) {
  return db.prepare(`${visitSelect} WHERE v.id = ?`).get(id)
}

export function queryVisits({ userId, agentId, from, to, status, type, city, agentCode } = {}) {
  const conditions = []
  const params = []
  const add = (sql, value) => {
    conditions.push(sql)
    params.push(value)
  }
  if (userId !== undefined) add('v.user_id = ?', userId)
  if (agentId !== undefined) add('v.agent_id = ?', agentId)
  if (from) add('v.visit_date >= ?', from)
  if (to) add('v.visit_date <= ?', to)
  if (status) add('v.status = ?', status)
  if (type) add('v.type = ?', type)
  if (city) add('a.municipality = ?', city)
  if (agentCode) add("a.code LIKE '%' || ? || '%'", agentCode)

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return db
    .prepare(
      `${visitSelect} ${where}
       ORDER BY v.visit_date, v.visit_time IS NULL, v.visit_time, v.id`,
    )
    .all(...params)
}

export function insertVisit({ agentId, userId, type, visitDate, visitTime, status, startedAt, closedAt }) {
  const result = db
    .prepare(
      `INSERT INTO visits (agent_id, user_id, type, visit_date, visit_time, status, started_at, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(agentId, userId, type, visitDate, visitTime ?? null, status, startedAt ?? null, closedAt ?? null)
  return findVisitById(Number(result.lastInsertRowid))
}

const visitColumns = {
  type: 'type',
  visitDate: 'visit_date',
  visitTime: 'visit_time',
  status: 'status',
  startedAt: 'started_at',
  closedAt: 'closed_at',
  reason: 'reason',
  subreason: 'subreason',
  notes: 'notes',
  latitude: 'latitude',
  longitude: 'longitude',
  signature: 'signature',
  endedAt: 'ended_at',
  formData: 'form_data',
}

export function updateVisit(id, changes) {
  const entries = Object.entries(changes).filter(([key]) => key in visitColumns)
  if (entries.length > 0) {
    const assignments = entries.map(([key]) => `${visitColumns[key]} = ?`).join(', ')
    db.prepare(`UPDATE visits SET ${assignments}, updated_at = datetime('now') WHERE id = ?`).run(
      // Los objetos (como form_data) se guardan como JSON.
      ...entries.map(([, value]) =>
        value !== null && typeof value === 'object' ? JSON.stringify(value) : (value ?? null),
      ),
      id,
    )
  }
  return findVisitById(id)
}

// ---------- Inventario (activos asignados a cada agente) ----------

db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id   INTEGER REFERENCES agents(id),
    code       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    family     TEXT NOT NULL,
    brand      TEXT,
    model      TEXT,
    serial     TEXT,
    status     TEXT NOT NULL DEFAULT 'disponible'
               CHECK (status IN ('disponible', 'instalado', 'en_reparacion', 'retirado')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)
db.exec('CREATE INDEX IF NOT EXISTS idx_assets_agent ON assets (agent_id)')

// Un activo está en un agente (agent_id) o lo anda cargando un asesor (holder_user_id).
const assetColumns = new Set(db.prepare('PRAGMA table_info(assets)').all().map((c) => c.name))
if (!assetColumns.has('holder_user_id')) {
  db.exec('ALTER TABLE assets ADD COLUMN holder_user_id INTEGER REFERENCES users(id)')
}
db.exec('CREATE INDEX IF NOT EXISTS idx_assets_holder ON assets (holder_user_id)')

export function listUserAssets(userId) {
  return db
    .prepare('SELECT * FROM assets WHERE holder_user_id = ? ORDER BY family COLLATE NOCASE, code COLLATE NOCASE')
    .all(userId)
}

export function findAssetByCode(code) {
  return db.prepare('SELECT * FROM assets WHERE code = ?').get(code)
}

export function insertAsset({ code, family, brand, model, serial, holderUserId, agentId, status = 'disponible' }) {
  const result = db
    .prepare(
      `INSERT INTO assets (code, family, brand, model, serial, holder_user_id, agent_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(code, family, brand ?? null, model ?? null, serial ?? null, holderUserId ?? null, agentId ?? null, status)
  return db.prepare('SELECT * FROM assets WHERE id = ?').get(Number(result.lastInsertRowid))
}

// Usuarios activos con la cantidad de activos que andan cargando.
export function listAdvisorsWithAssets() {
  return db
    .prepare(
      `SELECT u.id, u.name, u.username, COUNT(a.id) AS assets
       FROM users u LEFT JOIN assets a ON a.holder_user_id = u.id
       WHERE u.active = 1
       GROUP BY u.id ORDER BY u.name COLLATE NOCASE`,
    )
    .all()
}

// Movimientos de equipo de una visita (Hotline / Otros soportes):
//   outAsset: activo que SALE del agente → pasa al asesor (retirado)
//   inAsset:  activo que ENTRA al agente → sale del inventario del asesor (instalado)
// Devuelve un mensaje de error si algún activo no está donde debe, o null.
export function validateEquipmentMovements({ agentId, userId, movements }) {
  const seen = new Set()
  for (const m of movements ?? []) {
    for (const [code, direction] of [[m.outAsset, 'out'], [m.inAsset, 'in']]) {
      if (!code) continue
      if (seen.has(code)) return `El activo ${code} aparece en más de un movimiento.`
      seen.add(code)
      const asset = findAssetByCode(code)
      if (!asset) return `El activo ${code} no existe en el inventario.`
      if (direction === 'out' && asset.agent_id !== agentId) {
        return `El activo ${code} ya no está en el inventario del agente.`
      }
      if (direction === 'in' && asset.holder_user_id !== userId) {
        return `El activo ${code} ya no está en el inventario del asesor.`
      }
    }
  }
  return null
}

export function applyEquipmentMovements({ visitId, agentId, userId, movements }) {
  const toAdvisor = db.prepare(
    "UPDATE assets SET agent_id = NULL, holder_user_id = ?, status = 'retirado' WHERE code = ?",
  )
  const toAgent = db.prepare(
    "UPDATE assets SET agent_id = ?, holder_user_id = NULL, status = 'instalado' WHERE code = ?",
  )
  for (const m of movements ?? []) {
    if (m.outAsset) {
      toAdvisor.run(userId, m.outAsset)
      recordAssetMovement({ code: m.outAsset, kind: 'retiro', visitId, agentId, advisorId: userId, performedBy: userId })
    }
    if (m.inAsset) {
      toAgent.run(agentId, m.inAsset)
      recordAssetMovement({ code: m.inAsset, kind: 'instalacion', visitId, agentId, advisorId: userId, performedBy: userId })
    }
  }
}

// ---------- Historial de movimientos de activos ----------
//   instalacion: del asesor al agente (en una visita)
//   retiro:      del agente al asesor (en una visita)
//   asignacion:  un administrador entrega el activo a un asesor (sin visita)

const movementsTableExisted = Boolean(
  db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'asset_movements'").get(),
)
db.exec(`
  CREATE TABLE IF NOT EXISTS asset_movements (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id     INTEGER REFERENCES assets(id),
    asset_code   TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('instalacion', 'retiro', 'asignacion')),
    visit_id     INTEGER REFERENCES visits(id),
    agent_id     INTEGER REFERENCES agents(id),
    advisor_id   INTEGER REFERENCES users(id),
    performed_by INTEGER REFERENCES users(id),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`)
db.exec('CREATE INDEX IF NOT EXISTS idx_movements_asset ON asset_movements (asset_code)')
db.exec('CREATE INDEX IF NOT EXISTS idx_movements_visit ON asset_movements (visit_id)')
db.exec('CREATE INDEX IF NOT EXISTS idx_movements_agent ON asset_movements (agent_id)')
db.exec('CREATE INDEX IF NOT EXISTS idx_movements_advisor ON asset_movements (advisor_id)')

export function recordAssetMovement({ code, kind, visitId, agentId, advisorId, performedBy, createdAt }) {
  const asset = db.prepare('SELECT id FROM assets WHERE code = ?').get(code)
  db.prepare(
    `INSERT INTO asset_movements (asset_id, asset_code, kind, visit_id, agent_id, advisor_id, performed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
  ).run(asset?.id ?? null, code, kind, visitId ?? null, agentId ?? null, advisorId ?? null, performedBy ?? null, createdAt ?? null)
}

// La primera vez se agregan al historial los movimientos de visitas que ya
// estaban finalizadas (con la fecha de cierre de la visita).
if (!movementsTableExisted) {
  const closedVisits = db
    .prepare("SELECT * FROM visits WHERE status = 'cerrada' AND form_data IS NOT NULL ORDER BY closed_at, id")
    .all()
  for (const visit of closedVisits) {
    let form = null
    try {
      form = JSON.parse(visit.form_data)
    } catch {
      continue
    }
    for (const m of form?.movements ?? []) {
      const base = {
        visitId: visit.id,
        agentId: visit.agent_id,
        advisorId: visit.user_id,
        performedBy: visit.user_id,
        createdAt: visit.closed_at,
      }
      if (m.outAsset) recordAssetMovement({ ...base, code: m.outAsset, kind: 'retiro' })
      if (m.inAsset) recordAssetMovement({ ...base, code: m.inAsset, kind: 'instalacion' })
    }
  }
}

// filters: { assetCode, agentId, advisorId, visitId, limit }
export function listAssetMovements({ assetCode, agentId, advisorId, visitId, limit = 200 } = {}) {
  const conditions = []
  const params = []
  if (assetCode) {
    conditions.push('m.asset_code = ?')
    params.push(assetCode)
  }
  if (agentId !== undefined) {
    conditions.push('m.agent_id = ?')
    params.push(agentId)
  }
  if (advisorId !== undefined) {
    conditions.push('m.advisor_id = ?')
    params.push(advisorId)
  }
  if (visitId !== undefined) {
    conditions.push('m.visit_id = ?')
    params.push(visitId)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return db
    .prepare(
      `SELECT m.*, a.family AS asset_family, a.brand AS asset_brand,
              ag.code AS agent_code, ag.name AS agent_name,
              adv.name AS advisor_name, perf.name AS performed_by_name,
              v.type AS visit_type, v.visit_date AS visit_date
       FROM asset_movements m
       LEFT JOIN assets a ON a.id = m.asset_id
       LEFT JOIN agents ag ON ag.id = m.agent_id
       LEFT JOIN users adv ON adv.id = m.advisor_id
       LEFT JOIN users perf ON perf.id = m.performed_by
       LEFT JOIN visits v ON v.id = m.visit_id
       ${where}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ?`,
    )
    .all(...params, Math.min(Math.max(Number(limit) || 200, 1), 500))
}

// Ejecuta fn dentro de una transacción.
export function transaction(fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function listAgentAssets(agentId) {
  return db
    .prepare('SELECT * FROM assets WHERE agent_id = ? ORDER BY family COLLATE NOCASE, code COLLATE NOCASE')
    .all(agentId)
}

export function listAllAgentAssets() {
  return db
    .prepare('SELECT * FROM assets WHERE agent_id IS NOT NULL ORDER BY family COLLATE NOCASE, code COLLATE NOCASE')
    .all()
}

export function upsertAsset({ agentId, holderUserId, code, family, brand, model, serial, status = 'disponible' }) {
  db.prepare(
    `INSERT INTO assets (agent_id, holder_user_id, code, family, brand, model, serial, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET
       agent_id = excluded.agent_id, holder_user_id = excluded.holder_user_id,
       family = excluded.family, brand = excluded.brand,
       model = excluded.model, serial = excluded.serial, status = excluded.status`,
  ).run(agentId ?? null, holderUserId ?? null, code, family, brand ?? null, model ?? null, serial ?? null, status)
}

// Totales de visitas de un agente (todas las fechas), por estado.
export function agentVisitSummary(agentId) {
  const rows = db
    .prepare('SELECT status, COUNT(*) AS n FROM visits WHERE agent_id = ? GROUP BY status')
    .all(agentId)
  const counts = Object.fromEntries(rows.map((r) => [r.status, r.n]))
  const total = rows.reduce((sum, r) => sum + r.n, 0)
  return {
    total,
    completed: counts.cerrada ?? 0,
    pending: (counts.programada ?? 0) + (counts.sin_programar ?? 0) + (counts.en_proceso ?? 0),
    cancelled: counts.cancelada ?? 0,
  }
}

export function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function listUsers() {
  return db.prepare('SELECT * FROM users ORDER BY name COLLATE NOCASE').all()
}

export function hasAdmin() {
  return Boolean(db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get())
}

export function insertUser({ username, passwordHash, name, email, role }) {
  const result = db
    .prepare(
      'INSERT INTO users (username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)',
    )
    .run(username, passwordHash, name, email ?? null, role)
  return findUserById(Number(result.lastInsertRowid))
}

const updatableColumns = {
  name: 'name',
  email: 'email',
  role: 'role',
  active: 'active',
  passwordHash: 'password_hash',
}

export function updateUser(id, changes) {
  const entries = Object.entries(changes).filter(([key]) => key in updatableColumns)
  if (entries.length > 0) {
    const assignments = entries.map(([key]) => `${updatableColumns[key]} = ?`).join(', ')
    db.prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(
      ...entries.map(([, value]) => value),
      id,
    )
  }
  return findUserById(id)
}

export function upsertUser({ username, passwordHash, name, email, role }) {
  db.prepare(
    `INSERT INTO users (username, password_hash, name, email, role)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       password_hash = excluded.password_hash,
       name = excluded.name,
       email = excluded.email,
       role = excluded.role`,
  ).run(username, passwordHash, name, email ?? null, role)
}

export function isUniqueViolation(error) {
  return /UNIQUE constraint failed/.test(error?.message ?? '')
}
