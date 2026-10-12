// Carga activos de ejemplo en el inventario de cada agente.
// Uso: npm run seed-assets
// Requiere haber cargado agentes antes (npm run seed-agents).
import { db, listAgents, upsertAsset } from '../src/db.js'

const agents = listAgents()
if (agents.length === 0) {
  console.error('No hay agentes. Ejecuta primero: npm run seed-agents')
  process.exit(1)
}

const catalog = [
  { family: 'TERMINALES', brand: 'TOUCH DYNAMIC', model: 'Quest II', prefix: 'LTE' },
  { family: 'TERMINALES', brand: 'PAX', model: 'A920', prefix: 'LTE' },
  { family: 'IMPRESORAS', brand: 'EPSON', model: 'TM-T20III', prefix: 'IMP' },
  { family: 'ROUTERS', brand: 'HUAWEI', model: 'B311', prefix: 'RTR' },
  { family: 'LECTORES', brand: 'ZEBRA', model: 'DS2208', prefix: 'LEC' },
]
const statuses = ['disponible', 'instalado', 'instalado', 'disponible', 'en_reparacion']

let count = 0
agents.forEach((agent, agentIndex) => {
  // Entre 1 y 5 activos por agente.
  const amount = (agentIndex % 5) + 1
  for (let i = 0; i < amount; i++) {
    const item = catalog[(agentIndex + i) % catalog.length]
    const number = 5000 + agentIndex * 10 + i
    upsertAsset({
      agentId: agent.id,
      code: `${item.prefix}-${number}`,
      family: item.family,
      brand: item.brand,
      model: item.model,
      serial: `Test${String(agentIndex * 10 + i + 1).padStart(3, '0')}`,
      status: statuses[(agentIndex + i) % statuses.length],
    })
    count++
  }
})

// Inventario que anda cargando cada asesor (disponible para instalar).
const users = db.prepare('SELECT * FROM users WHERE active = 1 ORDER BY id').all()
let carried = 0
users.forEach((user, userIndex) => {
  for (let i = 0; i < 4; i++) {
    const item = catalog[(userIndex + i) % catalog.length]
    const number = 7000 + userIndex * 10 + i
    upsertAsset({
      holderUserId: user.id,
      code: `${item.prefix}-${number}`,
      family: item.family,
      brand: item.brand,
      model: item.model,
      serial: `Asesor${String(userIndex * 10 + i + 1).padStart(3, '0')}`,
      status: 'disponible',
    })
    carried++
  }
})

console.log(
  `${count} activos de ejemplo cargados en ${agents.length} agentes y ${carried} en el inventario de ${users.length} asesores.`,
)
