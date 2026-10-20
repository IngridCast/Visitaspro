import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import BrandLogo from './BrandLogo.jsx'

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

function LoginPage() {
  const { login, loginWithMicrosoft } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (action) => {
    setError('')
    setLoading(true)
    try {
      await action()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    run(() => login(username.trim(), password))
  }

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand">
          <BrandLogo className="brand-logo-login" />
          <h1>VisitasPro</h1>
          <p>Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="divider">
          <span>o</span>
        </div>

        <button
          type="button"
          className="microsoft"
          onClick={() => run(loginWithMicrosoft)}
          disabled={loading}
        >
          <MicrosoftLogo />
          Iniciar sesión con Microsoft
        </button>
      </div>
    </main>
  )
}

export default LoginPage
