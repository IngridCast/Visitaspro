import { useEffect, useState } from 'react'
import { onUnauthorized } from '../api.js'
import {
  clearLocalSession,
  loadLocalSession,
  loginWithPassword,
  refreshLocalUser,
} from './localAuth.js'
import { isMicrosoftConfigured, loginRequest, msalInstance } from './msal.js'
import { AuthContext } from './useAuth.js'

function getInitialUser() {
  const account = msalInstance?.getActiveAccount()
  if (account) {
    return {
      name: account.name || account.username,
      email: account.username,
      provider: 'microsoft',
    }
  }
  const session = loadLocalSession()
  return session ? { ...session.user, provider: 'local' } : null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser)
  const isLocal = user?.provider === 'local'

  useEffect(() => {
    onUnauthorized(() => {
      clearLocalSession()
      setUser(null)
    })
  }, [])

  // Al abrir la app, actualiza rol y datos del usuario desde el servidor.
  // Sin conexión se mantiene la sesión guardada.
  useEffect(() => {
    if (!isLocal) return
    refreshLocalUser()
      .then((fresh) => fresh && setUser({ ...fresh, provider: 'local' }))
      .catch(() => {})
  }, [isLocal])

  const login = async (username, password) => {
    const session = await loginWithPassword(username, password)
    setUser({ ...session.user, provider: 'local' })
  }

  const loginWithMicrosoft = async () => {
    if (!isMicrosoftConfigured) {
      throw new Error(
        'El inicio de sesión con Microsoft no está configurado (VITE_AZURE_CLIENT_ID).',
      )
    }
    // Redirige a Microsoft; al volver, initMicrosoftAuth() procesa la respuesta.
    await msalInstance.loginRedirect(loginRequest)
  }

  const logout = async () => {
    if (user?.provider === 'microsoft') {
      await msalInstance.logoutRedirect({
        account: msalInstance.getActiveAccount(),
      })
      return
    }
    clearLocalSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithMicrosoft, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
