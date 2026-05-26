import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const HEALTH_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/health`
  : 'http://localhost:3001/health'

// Estados: 'ok' | 'waking' | 'error'
export function useServerStatus() {
  const [status, setStatus] = useState('ok')

  const ping = useCallback(async () => {
    try {
      await axios.get(HEALTH_URL, { timeout: 5000 })
      setStatus('ok')
    } catch (err) {
      if (err.code === 'ECONNABORTED' || !err.response) {
        setStatus('waking')
      } else {
        setStatus('error')
      }
    }
  }, [])

  // Escuchar errores de red desde axios interceptors vía evento custom
  useEffect(() => {
    const handler = () => {
      setStatus(s => s === 'ok' ? 'waking' : s)
      // Reintentar ping cada 4s hasta que responda
      const interval = setInterval(async () => {
        try {
          await axios.get(HEALTH_URL, { timeout: 5000 })
          setStatus('ok')
          clearInterval(interval)
        } catch {}
      }, 4000)
      // Limpiar después de 60s máximo
      setTimeout(() => clearInterval(interval), 60000)
    }

    window.addEventListener('server:waking', handler)
    return () => window.removeEventListener('server:waking', handler)
  }, [])

  return { status, ping }
}
