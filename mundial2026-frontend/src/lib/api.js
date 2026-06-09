import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
})

// Inyectar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh automático si el token expira
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (err) {
        // Solo limpiar si el refresh realmente falla (no por timeout)
        if (err.response?.status === 401 || err.response?.status === 403 || !err.response) {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }

    // Sin respuesta del servidor → probablemente cold start de Railway
    if (!error.response && error.code !== 'ERR_CANCELED') {
      window.dispatchEvent(new Event('server:waking'))
    }

    return Promise.reject(error)
  }
)

export default api

// ─── Helpers por recurso ──────────────────────────────────────────────────────

export const authApi = {
  register: (data)   => api.post('/auth/register', data),
  login:    (data)   => api.post('/auth/login', data),
  logout:   ()       => api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }),
  me:       ()       => api.get('/auth/me'),
  updateMe: (data)   => api.patch('/auth/me', data),
}

export const matchApi = {
  list:       (params) => api.get('/matches', { params }),
  get:        (id)     => api.get(`/matches/${id}`),
  upcoming:   ()       => api.get('/matches/upcoming'),
  teams:      ()       => api.get('/matches/teams'),
  players:    (teamId) => api.get(`/matches/teams/${teamId}/players`),
}

export const predictionApi = {
  my:         (params) => api.get('/predictions/my', { params }),
  forMatch:   (matchId, params) => api.get(`/predictions/match/${matchId}`, { params }),
  save:       (matchId, data) => api.post(`/predictions/match/${matchId}`, data),
  allForMatch: (matchId, params) => api.get(`/predictions/match/${matchId}/all`, { params }),
  compare:    (groupId) => api.get(`/predictions/group/${groupId}/compare`),
}

export const tournamentApi = {
  myPicks:   (params) => api.get('/tournament/picks', { params }),
  savePicks: (data) => api.put('/tournament/picks', data),
  userPicks: (id, params) => api.get(`/tournament/picks/${id}`, { params }),
}

export const leaderboardApi = {
  global:  (params)   => api.get('/leaderboard/global', { params }),
  me:      ()         => api.get('/leaderboard/me'),
  group:   (groupId)  => api.get(`/leaderboard/group/${groupId}`),
}

export const adminApi = {
  dashboard:       ()          => api.get('/admin/dashboard'),
  setResult:       (id, data)  => api.post(`/admin/matches/${id}/result`, data),
  setStatus:       (id, status) => api.put(`/admin/matches/${id}/status`, { status }),
  setAwards:       (data)      => api.post('/admin/tournament/awards', data),
  syncMatches:     (params)    => api.post('/admin/sync', null, { params }),
  getUsers:        ()          => api.get('/admin/users'),
  sendBroadcast:   (data)      => api.post('/admin/broadcast', data),
  setPremium:      (id, data)  => api.patch(`/admin/groups/${id}/premium`, data),
  deleteGroup:     (id)        => api.delete(`/admin/groups/${id}`),
  setUserPlan:     (id, plan)  => api.patch(`/admin/users/${id}/plan`, { plan }),
  createOpenPool:  ()          => api.post('/admin/open-pool'),
}

export const groupApi = {
  listAll: ()       => api.get('/groups'),
  create:  (data)   => api.post('/groups', data),
  join:    (code)   => api.post('/groups/join', { inviteCode: code }),
  joinByToken: (token) => api.post(`/groups/join/${token}`),
  getByToken:  (token) => api.get(`/groups/token/${token}`),
  toggleInvite: (id)  => api.patch(`/groups/${id}/invite`),
  update:  (id, data)  => api.patch(`/groups/${id}`, data),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  getMessages:  (id)        => api.get(`/groups/${id}/messages`),
  sendMessage:  (id, msg)   => api.post(`/groups/${id}/messages`, { message: msg }),
  my:      ()       => api.get('/groups/my'),
  get:     (id)     => api.get(`/groups/${id}`),
}

export const paymentApi = {
  createPreference: (groupId, tierId) => api.post('/payments/create-preference', { groupId, tierId }),
}
