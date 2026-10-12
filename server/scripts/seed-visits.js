// Carga visitas de ejemplo alrededor de la semana actual para probar "Mis Visitas".
// Uso: npm run seed-visits -- [usuario]   (por defecto, el primer administrador)
// Requiere haber cargado agentes antes (npm run seed-agents).
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

function isoDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Lunes de la semana actual
const monday = new Date()
monday.setHours(0, 0, 0, 0)
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

// [día relativo al lunes, hora, estado, tipo]
const plan = [
  [-5, '10:00', 'cerrada', 'comercial'],
  [-3, '14:30', 'cerrada', 'pm'],
  [0, '09:30', 'programada', 'comercial'],
  [0, '14:15', 'en_proceso', 'hotline'],
  [0, '16:00', 'cerrada', 'pm'],
  [1, '11:00', 'cerrada', 'comercial'],
  [1, '16:30', 'sin_programar', 'hotline'],
  [2, '08:45', 'programada', 'pm'],
  [2, '13:20', 'programada', 'comercial'],
  [3, '10:10', 'sin_programar', 'comercial'],
  [4, '09:00', 'programada', 'hotline'],
  [4, '15:40', 'programada', 'comercial'],
  [8, '09:15', 'programada', 'pm'],
  [10, '11:30', 'programada', 'comercial'],
]

plan.forEach(([offset, time, status, type], index) => {
  const date = new Date(monday)
  date.setDate(monday.getDate() + offset)
  const now = new Date().toISOString()
  insertVisit({
    agentId: agents[index % agents.length].id,
    userId: user.id,
    type,
    visitDate: isoDate(date),
    visitTime: time,
    status,
    startedAt: status === 'en_proceso' || status === 'cerrada' ? now : null,
    closedAt: status === 'cerrada' ? now : null,
  })
})

console.log(`${plan.length} visitas de ejemplo cargadas para "${user.username}".`)
