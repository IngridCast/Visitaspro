import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

// Formato guardado: scrypt$<salt>$<hash>, ambos en base64.
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [algorithm, saltB64, hashB64] = stored.split('$')
  if (algorithm !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}

// Hash de relleno: se verifica contra él cuando el usuario no existe, para que
// el tiempo de respuesta no revele qué usuarios están registrados.
export const dummyHash = await hashPassword(randomBytes(16).toString('hex'))
