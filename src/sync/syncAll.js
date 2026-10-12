// Sincronización manual (botón "Sincronizar"):
//   1. Envía lo pendiente: inicio de labores y visitas registradas sin conexión.
//   2. Descarga al dispositivo: agentes, visitas de los últimos 3 meses (y las
//      próximas), inventario del asesor e inventario de los agentes.
import { syncAgentsCatalog } from '../agents/agentsCatalog.js'
import { apiFetch } from '../api.js'
import { pendingVisitsCount, syncPendingVisits } from '../visits/visitsApi.js'
import { syncPendingWorkday } from '../workday/workdayApi.js'
import { currentUserId, notifyDataChanged, offlineWindowStart, saveSnapshot } from './snapshot.js'

let running = null

export function syncAll() {
  running ??= run().finally(() => {
    running = null
  })
  return running
}

async function run() {
  const userId = currentUserId()
  if (!userId) throw new Error('Inicie sesión para sincronizar.')

  try {
    // 1. Enviar lo pendiente.
    await syncPendingWorkday()
    const sent = await syncPendingVisits()

    // 2. Descargar.
    const from = offlineWindowStart()
    const [catalog, visits, mine, agentAssets] = await Promise.all([
      syncAgentsCatalog(userId),
      apiFetch(`/visits?from=${from}`),
      apiFetch('/inventory/me'),
      apiFetch('/inventory/agent-assets'),
    ])
    await saveSnapshot({
      userId,
      syncedAt: new Date().toISOString(),
      windowStart: from,
      // Sin firmas: ocupan mucho y se consultan al abrir la visita.
      // eslint-disable-next-line no-unused-vars
      visits: visits.visits.map(({ signature, ...rest }) => rest),
      myAssets: mine.assets,
      agentAssets: agentAssets.assets,
    })
    notifyDataChanged()

    return {
      sent,
      stillPending: pendingVisitsCount(),
      visits: visits.visits.length,
      agents: catalog.agents.length,
      assets: mine.assets.length,
    }
  } catch (error) {
    notifyDataChanged()
    if (error.status === 0 || /conexión/i.test(error.message)) {
      throw new Error('Necesitas conexión para sincronizar.')
    }
    throw error
  }
}
