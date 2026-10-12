import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initMicrosoftAuth } from './auth/msal.js'

try {
  await initMicrosoftAuth()
} catch (error) {
  console.error('Error al procesar el inicio de sesión con Microsoft', error)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
