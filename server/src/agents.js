import { Router } from 'express'
import { requireAuth } from './auth.js'
import { publicAsset } from './inventory.js'
import { agentFields, agentVisitSummary, findAgentById, listAgentAssets, listAgents } from './db.js'

function publicAgent(agent) {
  const result = { id: agent.id }
  for (const [field, column] of Object.entries(agentFields)) {
    result[field] = agent[column] ?? null
  }
  return result
}

export const agentsRouter = Router()

agentsRouter.use(requireAuth)

// GET /agents          → todos los agentes
// GET /agents?mine=1   → solo los asignados al usuario que consulta
agentsRouter.get('/', (req, res) => {
  const mine = req.query.mine === '1' || req.query.mine === 'true'
  const agents = listAgents(mine ? { assignedUserId: req.user.id } : {})
  res.json({ agents: agents.map(publicAgent) })
})

agentsRouter.get('/:id', (req, res) => {
  const agent = findAgentById(Number(req.params.id))
  if (!agent) return res.status(404).json({ error: 'Agente no encontrado.' })
  res.json({ agent: publicAgent(agent) })
})

// GET /agents/:id/assets → inventario de activos del agente
agentsRouter.get('/:id/assets', (req, res) => {
  const agentId = Number(req.params.id)
  if (!findAgentById(agentId)) return res.status(404).json({ error: 'Agente no encontrado.' })
  res.json({ assets: listAgentAssets(agentId).map(publicAsset) })
})

// GET /agents/:id/visit-summary → totales de visitas del agente (todas las fechas)
agentsRouter.get('/:id/visit-summary', (req, res) => {
  const agentId = Number(req.params.id)
  if (!findAgentById(agentId)) return res.status(404).json({ error: 'Agente no encontrado.' })
  res.json({ summary: agentVisitSummary(agentId) })
})
