import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { agentsRouter } from './agents.js'
import { publicUser, requireAuth, signToken } from './auth.js'
import { findUserByUsername } from './db.js'
import { dummyHash, verifyPassword } from './passwords.js'
import { integrationsRouter } from './integrations.js'
import { inventoryRouter } from './inventory.js'
import { reportsRouter } from './reports.js'
import { usersRouter } from './users.js'
import { visitsRouter } from './visits.js'
import { workdaysRouter } from './workdays.js'

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: allowedOrigins }))
// 1 MB alcanza para la firma (imagen) de una visita; las fotos van aparte.
app.use(express.json({ limit: '1mb' }))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' },
})

app.post('/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' })
  }

  const user = findUserByUsername(username.trim())
  const valid = await verifyPassword(password, user?.password_hash ?? dummyHash)
  if (!user || !valid || !user.active) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
  }

  res.json({ token: signToken(user), user: publicUser(user) })
})

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

app.use('/users', usersRouter)
app.use('/agents', agentsRouter)
app.use('/visits', visitsRouter)
app.use('/inventory', inventoryRouter)
app.use('/reports', reportsRouter)
app.use('/workdays', workdaysRouter)
app.use('/integrations', integrationsRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Errores no controlados: siempre responde JSON para que la app muestre el mensaje.
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El archivo es demasiado grande (máximo 10 MB).' })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Datos no válidos.' })
  }
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor.' })
})
