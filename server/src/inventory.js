import { Router } from 'express'
import { requireAdmin, requireAuth } from './auth.js'
import {
  findAssetByCode,
  findUserById,
  insertAsset,
  isUniqueViolation,
  listAdvisorsWithAssets,
  listAllAgentAssets,
  listAssetMovements,
  listUserAssets,
  recordAssetMovement,
} from './db.js'

export function publicAsset(asset) {
  return {
    id: asset.id,
    code: asset.code,
    family: asset.family,
    brand: asset.brand,
    model: asset.model,
    serial: asset.serial,
    status: asset.status,
  }
}

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

export const inventoryRouter = Router()

inventoryRouter.use(requireAuth)

// GET /inventory/me → activos que anda cargando el usuario
inventoryRouter.get('/me', (req, res) => {
  res.json({ assets: listUserAssets(req.user.id).map(publicAsset) })
})

// GET /inventory/advisors → asesores con la cantidad de activos (solo admin)
inventoryRouter.get('/advisors', requireAdmin, (_req, res) => {
  res.json({ advisors: listAdvisorsWithAssets() })
})

// GET /inventory/users/:id → inventario de un asesor (admin, o el propio usuario)
inventoryRouter.get('/users/:id', (req, res) => {
  const userId = Number(req.params.id)
  if (userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo puedes ver tu propio inventario.' })
  }
  if (!findUserById(userId)) return res.status(404).json({ error: 'Usuario no encontrado.' })
  res.json({ assets: listUserAssets(userId).map(publicAsset) })
})

// POST /inventory → asigna un activo nuevo a un asesor (solo admin)
// { code, family, brand?, model?, serial?, holderUserId }
inventoryRouter.post('/', requireAdmin, (req, res) => {
  const body = req.body ?? {}
  const code = text(body.code, 40).toUpperCase()
  const family = text(body.family, 60).toUpperCase()
  const holderUserId = Number(body.holderUserId)

  if (!/^[A-Z0-9][A-Z0-9._-]{1,39}$/.test(code)) {
    return res.status(400).json({ error: 'El código del activo no es válido (ej.: LTE-5001).' })
  }
  if (!family) return res.status(400).json({ error: 'La familia es obligatoria.' })
  if (!findUserById(holderUserId)) return res.status(400).json({ error: 'Asesor no válido.' })
  if (findAssetByCode(code)) return res.status(409).json({ error: `El activo ${code} ya existe.` })

  try {
    const asset = insertAsset({
      code,
      family,
      brand: text(body.brand, 60).toUpperCase() || null,
      model: text(body.model, 60) || null,
      serial: text(body.serial, 60) || null,
      holderUserId,
    })
    recordAssetMovement({
      code: asset.code,
      kind: 'asignacion',
      advisorId: holderUserId,
      performedBy: req.user.id,
    })
    res.status(201).json({ asset: publicAsset(asset) })
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: `El activo ${code} ya existe.` })
    throw error
  }
})

function publicMovement(m) {
  return {
    id: m.id,
    kind: m.kind,
    assetCode: m.asset_code,
    assetFamily: m.asset_family,
    assetBrand: m.asset_brand,
    visitId: m.visit_id,
    visitType: m.visit_type,
    visitDate: m.visit_date,
    agentId: m.agent_id,
    agentCode: m.agent_code,
    agentName: m.agent_name,
    advisorId: m.advisor_id,
    advisorName: m.advisor_name,
    performedByName: m.performed_by_name,
    createdAt: m.created_at,
  }
}

// GET /inventory/movements?assetCode=&agentId=&advisorId=&visitId=
// Historial de movimientos de activos (lo más reciente primero).
// Un asesor ve sus propios movimientos y los de cualquier agente o visita;
// el historial de otro asesor solo lo ve un administrador.
inventoryRouter.get('/movements', (req, res) => {
  const { assetCode, agentId, advisorId, visitId } = req.query
  const filters = {
    assetCode: typeof assetCode === 'string' && assetCode ? assetCode.trim().toUpperCase() : undefined,
    agentId: agentId ? Number(agentId) : undefined,
    visitId: visitId ? Number(visitId) : undefined,
    advisorId: advisorId ? Number(advisorId) : undefined,
  }
  const scoped = filters.agentId !== undefined || filters.visitId !== undefined || filters.assetCode
  if (!scoped && filters.advisorId === undefined) filters.advisorId = req.user.id
  if (filters.advisorId !== undefined && filters.advisorId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo puedes ver tu propio historial.' })
  }
  res.json({ movements: listAssetMovements(filters).map(publicMovement) })
})

// GET /inventory/agent-assets → activos instalados en todos los agentes
// (para guardar en el dispositivo y consultarlos sin conexión).
inventoryRouter.get('/agent-assets', (_req, res) => {
  const assets = listAllAgentAssets().map((asset) => ({ ...publicAsset(asset), agentId: asset.agent_id }))
  res.json({ assets })
})
