import { useState, useEffect, useCallback } from 'react'
import { matchApi } from '../lib/api'

const KEY = 'match_reminders_v1'

const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }

export function useMatchReminders() {
  const [permission, setPermission] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'denied'))
  const [activeCount, setActiveCount] = useState(0)

  const scheduleAll = useCallback(async () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    let matches = []
    try {
      const res = await matchApi.list({ status: 'SCHEDULED' })
      matches = res.data || []
    } catch { return }

    const now = Date.now()
    const saved = load()

    // Limpiar partidos pasados
    Object.keys(saved).forEach(k => {
      if (saved[k].dateUtc && new Date(saved[k].dateUtc).getTime() < now - 3 * 60 * 60 * 1000) delete saved[k]
    })

    let pending = 0

    matches.forEach(match => {
      const matchTime = new Date(match.dateUtc).getTime()
      if (matchTime <= now) return

      const key = match.id
      if (!saved[key]) saved[key] = { dateUtc: match.dateUtc }

      const home = match.teamHome?.name || '?'
      const away = match.teamAway?.name || '?'
      let hasPending = false

      // Recordatorio 60 minutos antes
      const delay60 = matchTime - 60 * 60 * 1000 - now
      if (delay60 > 0 && !saved[key].s60) {
        hasPending = true
        setTimeout(() => {
          try {
            new Notification('⚽ Recordatorio de partido', {
              body: `${home} vs ${away} empieza en 1 hora. ¡Registra tu pronóstico!`,
              icon: '/logo.png',
              tag: `${key}-60`,
            })
          } catch {}
          const s = load(); if (s[key]) { s[key].s60 = true; save(s) }
        }, delay60)
      }

      // Recordatorio 15 minutos antes
      const delay15 = matchTime - 15 * 60 * 1000 - now
      if (delay15 > 0 && !saved[key].s15) {
        hasPending = true
        setTimeout(() => {
          try {
            new Notification('🔔 ¡Último aviso!', {
              body: `${home} vs ${away} en 15 minutos. ¡Última chance para apostar!`,
              icon: '/logo.png',
              tag: `${key}-15`,
            })
          } catch {}
          const s = load(); if (s[key]) { s[key].s15 = true; save(s) }
        }, delay15)
      }

      if (hasPending) pending++
    })

    save(saved)
    setActiveCount(pending)
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied'
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm === 'granted') await scheduleAll()
    return perm
  }, [scheduleAll])

  // Auto-programar al montar si ya tiene permiso
  useEffect(() => {
    if (permission === 'granted') scheduleAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { permission, requestPermission, activeCount }
}
