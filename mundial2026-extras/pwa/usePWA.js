// src/hooks/usePWA.js
// Agrega este hook al frontend para manejar la instalación y notificaciones

import { useState, useEffect } from 'react'

/**
 * Hook para manejar la instalación de la PWA y push notifications
 *
 * Uso en cualquier componente:
 *   const { canInstall, install, notifEnabled, requestNotifications } = usePWA()
 */
export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  )

  useEffect(() => {
    // Detectar si ya está instalada como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Escuchar el evento de instalación
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setCanInstall(false)
      setInstallPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Disparar la instalación
  const install = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setCanInstall(false)
    }
  }

  // Solicitar permisos de notificaciones push
  const requestNotifications = async () => {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    const granted = permission === 'granted'
    setNotifEnabled(granted)
    return granted
  }

  return { canInstall, isInstalled, install, notifEnabled, requestNotifications }
}

// ─── Componente de banner de instalación ─────────────────────────────────────
// Puedes añadir este componente al Layout.jsx

export const PWAInstallBanner = () => {
  const { canInstall, install } = usePWA()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa_banner_dismissed') === 'true'
  )

  if (!canInstall || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="card border-field-700 p-4 flex items-center gap-3 shadow-2xl">
        <span className="text-2xl">⚽</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">Instalar app</p>
          <p className="text-xs text-zinc-500">Acceso rápido desde tu celular</p>
        </div>
        <button
          onClick={install}
          className="btn-primary text-xs px-3 py-1.5 shrink-0"
        >
          Instalar
        </button>
        <button
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('pwa_banner_dismissed', 'true')
          }}
          className="text-zinc-600 hover:text-zinc-400 text-xs shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
