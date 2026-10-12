import { PublicClientApplication } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common'

export const isMicrosoftConfigured = Boolean(clientId)

export const msalInstance = isMicrosoftConfigured
  ? new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    })
  : null

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
}

// Procesa la respuesta al volver de la página de login de Microsoft.
export async function initMicrosoftAuth() {
  if (!msalInstance) return
  await msalInstance.initialize()
  const result = await msalInstance.handleRedirectPromise()
  if (result?.account) {
    msalInstance.setActiveAccount(result.account)
  } else if (!msalInstance.getActiveAccount()) {
    const [account] = msalInstance.getAllAccounts()
    if (account) msalInstance.setActiveAccount(account)
  }
}
