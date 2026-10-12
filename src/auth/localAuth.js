import { apiFetch } from '../api.js'

const SESSION_KEY = 'visitaspro.session'

export function loadLocalSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

function saveLocalSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function loginWithPassword(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: { username, password },
  })
  const session = { token: data.token, user: data.user }
  saveLocalSession(session)
  return session
}

// Trae los datos actuales del usuario (por ejemplo, si un admin le cambió el rol).
export async function refreshLocalUser() {
  const session = loadLocalSession()
  if (!session) return null
  const { user } = await apiFetch('/auth/me')
  saveLocalSession({ ...session, user })
  return user
}
