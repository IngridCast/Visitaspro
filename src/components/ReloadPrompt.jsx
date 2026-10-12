import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Error al registrar el service worker', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="toast" role="alert">
      <p>
        {offlineReady
          ? 'La app está lista para funcionar sin conexión.'
          : 'Hay una nueva versión disponible.'}
      </p>
      <div className="toast-actions">
        {needRefresh && (
          <button type="button" onClick={() => updateServiceWorker(true)}>
            Actualizar
          </button>
        )}
        <button type="button" className="secondary" onClick={close}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default ReloadPrompt
