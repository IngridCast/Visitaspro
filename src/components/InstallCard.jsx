import { useState } from 'react'

function InstallCard({ canInstall, onInstall, isInstalled, isIOS, isSecure }) {
  const [error, setError] = useState('')
  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    setError('')
    setInstalling(true)
    try {
      await onInstall()
    } catch {
      setError('No se pudo abrir la instalación. Intenta desde el menú del navegador.')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <section className="install-card" aria-labelledby="install-title">
      <h2 id="install-title">VisitasPro en tu teléfono</h2>
      {isInstalled ? (
        <p>Ya estás usando la aplicación instalada.</p>
      ) : (
        <>
          <p>Agrega VisitasPro a tu pantalla de inicio para abrirla como una aplicación.</p>
          {!isSecure ? (
            <p>Para instalarla, abre la dirección HTTPS de VisitasPro.</p>
          ) : canInstall ? (
            <button type="button" onClick={handleInstall} disabled={installing}>
              {installing ? 'Abriendo instalación…' : 'Instalar VisitasPro'}
            </button>
          ) : isIOS ? (
            <ol>
              <li>Abre esta página en Safari.</li>
              <li>Toca Compartir y luego Agregar a pantalla de inicio.</li>
              <li>Si aparece «Abrir como app web», actívalo y toca Agregar.</li>
            </ol>
          ) : (
            <p>En el menú del navegador, busca «Instalar aplicación» o «Agregar a pantalla de inicio». Si no aparece, prueba en Chrome.</p>
          )}
          <p className="hint">Después de iniciar sesión, toca Sincronizar en Inicio para guardar agentes, visitas e inventario en este dispositivo.</p>
          {error && <p className="login-error" role="alert">{error}</p>}
        </>
      )}
    </section>
  )
}

export default InstallCard
