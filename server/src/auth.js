import jwt from 'jsonwebtoken'
import { findUserById } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET no está definido o es muy corto (mínimo 32 caracteres).')
}

export function signToken(user) {
  return jwt.sign({ sub: String(user.id) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    active: Boolean(user.active),
    createdAt: user.created_at,
  }
}

// Se consulta el usuario en cada petición, así un usuario desactivado
// pierde el acceso de inmediato aunque su token siga vigente.
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado.' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = findUserById(Number(payload.sub))
    if (!user || !user.active) {
      return res.status(401).json({ error: 'No autenticado.' })
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Sesión expirada o inválida.' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden hacer esto.' })
  }
  next()
}
