import { Router } from 'express'
import { publicUser, requireAdmin, requireAuth } from './auth.js'
import { findUserById, insertUser, isUniqueViolation, listUsers, updateUser } from './db.js'
import { hashPassword } from './passwords.js'

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLES = ['admin', 'user']

// Valida los campos recibidos. Devuelve { error } o { data } con los valores limpios.
function validateUser(body, { creating }) {
  const data = {}

  if (creating) {
    if (typeof body.username !== 'string' || !USERNAME_PATTERN.test(body.username.trim())) {
      return { error: 'El usuario debe tener de 3 a 32 caracteres: letras, números, punto, guion o guion bajo.' }
    }
    data.username = body.username.trim()
  }

  if (creating || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100) {
      return { error: 'El nombre es obligatorio.' }
    }
    data.name = body.name.trim()
  }

  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email.trim())) {
      return { error: 'El correo no es válido.' }
    }
    data.email = body.email.trim()
  } else if (body.email !== undefined) {
    data.email = null
  }

  if (creating || body.role !== undefined) {
    data.role = body.role ?? 'user'
    if (!ROLES.includes(data.role)) return { error: 'Rol no válido.' }
  }

  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') return { error: 'Valor de "activo" no válido.' }
    data.active = body.active ? 1 : 0
  }

  if (creating || (body.password !== undefined && body.password !== '')) {
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 200) {
      return { error: 'La contraseña debe tener al menos 8 caracteres.' }
    }
    data.password = body.password
  }

  return { data }
}

export const usersRouter = Router()

usersRouter.use(requireAuth, requireAdmin)

usersRouter.get('/', (_req, res) => {
  res.json({ users: listUsers().map(publicUser) })
})

usersRouter.post('/', async (req, res) => {
  const { error, data } = validateUser(req.body ?? {}, { creating: true })
  if (error) return res.status(400).json({ error })

  try {
    const { password, ...fields } = data
    const user = insertUser({ ...fields, passwordHash: await hashPassword(password) })
    res.status(201).json({ user: publicUser(user) })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' })
    }
    throw err
  }
})

usersRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!findUserById(id)) return res.status(404).json({ error: 'Usuario no encontrado.' })

  const { error, data } = validateUser(req.body ?? {}, { creating: false })
  if (error) return res.status(400).json({ error })

  // Evita que un administrador se quite el acceso a sí mismo por error.
  if (id === req.user.id && (data.role === 'user' || data.active === 0)) {
    return res.status(400).json({ error: 'No puedes quitarte el rol de administrador ni desactivarte.' })
  }

  const { password, ...changes } = data
  if (password) changes.passwordHash = await hashPassword(password)

  res.json({ user: publicUser(updateUser(id, changes)) })
})
