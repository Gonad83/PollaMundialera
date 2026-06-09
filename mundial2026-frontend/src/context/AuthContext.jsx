import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

const readCache = () => {
  try {
    const u = localStorage.getItem('cachedUser')
    return u ? JSON.parse(u) : null
  } catch { return null }
}

const writeCache = (user) => {
  try { localStorage.setItem('cachedUser', JSON.stringify(user)) } catch {}
}

export const AuthProvider = ({ children }) => {
  const hasToken = !!localStorage.getItem('accessToken')
  const cached = hasToken ? readCache() : null

  // Si hay token + cache: arranca con usuario inmediato, sin bloquear
  // Si hay token sin cache: loading=true hasta que /me responda
  // Sin token: user=null, loading=false
  const [user, setUser] = useState(cached)
  const [loading, setLoading] = useState(hasToken && !cached)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setLoading(false); return }

    authApi.me()
      .then(({ data }) => {
        setUser(data)
        writeCache(data)
      })
      .catch((err) => {
        // Solo borrar sesión si el error es autenticación (401/403)
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear()
          setUser(null)
        }
        // Si es otro error (timeout, 500, etc), mantener el token y dejar que reintente
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    writeCache(data.user)
    setUser(data.user)
    return data.user
  }

  const register = async (username, email, password) => {
    const { data } = await authApi.register({ username, email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    writeCache(data.user)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    await authApi.logout().catch(() => {})
    localStorage.clear()
    setUser(null)
    window.location.replace('/')
  }

  const updateUser = (updates) => setUser((u) => {
    const next = { ...u, ...updates }
    writeCache(next)
    return next
  })

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
