// Crea visitas de ejemplo de instalación y retiro (las que normalmente llegan
// desde otra aplicación), para probar sus pantallas.
// Uso: npm run seed-assigned-visits -- [usuario]   (por defecto, el primer administrador)
import { db, findUserByUsername, insertVisit, listAgents } from '../src/db.js'

const username = process.argv[2]
const user = username
  ? findUserByUsername(username)
  : db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get()
if (!user) {
  console.error(username ? `No existe el usuario "${username}".` : 'No hay usuarios creados.')
  process.exit(1)
}
const agents = listAgents()
if (agents.length === 0) {
  console.error('No hay agentes. Ejecuta primero: npm run seed-agents')
  process.exit(1)
}

const pad = (n) => String(n).padStart(2, '0')
const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const plan = [
  ['instalacion', 0, '09:00'],
  ['retiro', 0, '11:30'],
  ['instalacion', 1, '10:00'],
  ['retiro', 2, '14:00'],
]
plan.forEach(([type, offset, time], i) => {
  insertVisit({
    agentId: agents[i % agents.length].id,
    userId: user.id,
    type,
    visitDate: day(offset),
    visitTime: time,
    status: 'programada',
  })
})
console.log(`${plan.length} visitas de instalación/retiro creadas para "${user.username}".`)
