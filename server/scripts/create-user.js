// Crea un usuario, o cambia sus datos y contraseña si ya existe.
// Uso: npm run create-user -- <usuario> "<nombre completo>" [email] [--admin]
// Si todavía no hay ningún administrador, el usuario se crea como administrador.
import { createInterface } from 'node:readline/promises'
import { findUserByUsername, hasAdmin, upsertUser } from '../src/db.js'
import { hashPassword } from '../src/passwords.js'

const args = process.argv.slice(2)
const wantsAdmin = args.includes('--admin')
const [username, name, email] = args.filter((arg) => arg !== '--admin')

if (!username || !name) {
  console.error('Uso: npm run create-user -- <usuario> "<nombre completo>" [email] [--admin]')
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const password = await rl.question('Contraseña: ')
rl.close()

if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.')
  process.exit(1)
}

// Al cambiar la contraseña de un usuario existente se conserva su rol.
const existing = findUserByUsername(username)
const role = wantsAdmin || !hasAdmin() ? 'admin' : (existing?.role ?? 'user')
upsertUser({ username, passwordHash: await hashPassword(password), name, email, role })
console.log(`Usuario "${username}" guardado (${role === 'admin' ? 'administrador' : 'usuario'}).`)
