import { useEffect, useState } from 'react'

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  )
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const onDisplayChange = () => setIsInstalled(displayMode.matches || navigator.standalone === true)
    const onInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    displayMode.addEventListener('change', onDisplayChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      displayMode.removeEventListener('change', onDisplayChange)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } finally {
      setDeferredPrompt(null)
    }
  }

  return { canInstall: !isInstalled && deferredPrompt !== null, install, isInstalled, isIOS, isSecure: window.isSecureContext }
}
