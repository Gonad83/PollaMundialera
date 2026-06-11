import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { adminApi, matchApi, groupApi } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Users, Trophy, BarChart3, RefreshCw, Zap,
  Trash2, Crown, Mail, Search, Settings,
  AlertTriangle, CheckCircle2, LayoutDashboard, Send,
  Database, FileDigit, Globe, Plus, Minus, Radio, X, ChevronLeft
} from 'lucide-react'

const TZ = 'America/Santiago'
const fmtChileDateTime = (date, options = {}) =>
  new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
    ...options,
  }).format(new Date(date))

const TABS = [
  { id: 'overview',  label: 'Resumen',     icon: LayoutDashboard },
  { id: 'saas',      label: 'Ligas',       icon: Crown },
  { id: 'users',     label: 'Usuarios',    icon: Users },
  { id: 'matches',   label: 'Partidos',    icon: Trophy },
  { id: 'broadcast', label: 'Anuncios',    icon: Send },
  { id: 'system',    label: 'Sistema',     icon: Database },
]

const PLAN_LABELS = { FREE: 'Gratis', CLASICO: 'Clásico', PRO: 'Pro' }
const PLAN_COLORS = { FREE: 'text-zinc-400', CLASICO: 'text-blue-400', PRO: 'text-mundial-gold' }

export default function AdminPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = location.state?.from || null
  const queryTab = new URLSearchParams(location.search).get('tab')
  const initialTab = TABS.some(tab => tab.id === queryTab) ? queryTab : 'overview'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const nextTab = new URLSearchParams(location.search).get('tab')
    if (TABS.some(tab => tab.id === nextTab)) {
      setActiveTab(nextTab)
    }
  }, [location.search])
  
  // States para Formularios
  const [activeMatch, setActiveMatch] = useState(null)
  const [resultForm, setResultForm] = useState({ scoreHome: 0, scoreAway: 0, wentToPenalties: false, winnerId: null })
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // Filtros de partidos
  const [matchStatusFilter, setMatchStatusFilter] = useState('pending') // 'pending'|'live'|'finished'|'all'
  const [matchTeamSearch, setMatchTeamSearch] = useState('')

  // ─── Consultas ───
  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.dashboard().then(r => r.data),
  })

  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups-admin-list'],
    queryFn: () => groupApi.listAll().then(r => r.data),
    enabled: activeTab === 'saas'
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => adminApi.getUsers().then(r => r.data),
    enabled: activeTab === 'users'
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['matches-all'],
    queryFn: () => matchApi.list().then(r => r.data),
    enabled: activeTab === 'matches'
  })

  // ─── Mutaciones ───
  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type })
    setTimeout(() => setFeedback(null), 4000)
  }

  const resultMut = useMutation({
    mutationFn: ({ matchId, data }) => adminApi.setResult(matchId, data),
    onSuccess: () => {
      showFeedback('Resultado cargado y puntos calculados')
      setActiveMatch(null)
      qc.invalidateQueries({ queryKey: ['matches-all'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
    onError: (err) => showFeedback(err.response?.data?.error || 'Error al cargar resultado', 'error'),
  })

  const statusMut = useMutation({
    mutationFn: ({ matchId, status }) => adminApi.setStatus(matchId, status),
    onSuccess: (_, { status }) => {
      showFeedback(`Partido marcado como ${status === 'LIVE' ? 'EN VIVO' : status}`)
      qc.invalidateQueries({ queryKey: ['matches-all'] })
    },
    onError: (err) => showFeedback(err.response?.data?.error || 'Error al cambiar estado', 'error'),
  })

  const premiumMut = useMutation({
    mutationFn: ({ id, isPremium, maxMembers }) => adminApi.setPremium(id, { isPremium, maxMembers }),
    onSuccess: () => {
      showFeedback('Plan de liga actualizado')
      qc.invalidateQueries({ queryKey: ['groups-admin-list'] })
    }
  })

  const deleteGroupMut = useMutation({
    mutationFn: (id) => adminApi.deleteGroup(id),
    onSuccess: () => {
      showFeedback('Liga eliminada del sistema', 'error')
      qc.invalidateQueries({ queryKey: ['groups-admin-list'] })
    }
  })

  const broadcastMut = useMutation({
    mutationFn: (data) => adminApi.sendBroadcast(data),
    onSuccess: () => {
      showFeedback('Anuncio global enviado vía Socket.io')
      setBroadcastMsg('')
    }
  })

  const syncMut = useMutation({
    mutationFn: () => adminApi.syncMatches(),
    onSuccess: (res) => {
      const warnings = res.data.warnings?.length ? ` - Avisos: ${res.data.warnings.length}` : ''
      showFeedback(`Sync OK: ${res.data.updated} actualizados, ${res.data.newlyFinished || 0} finalizados, ${res.data.scoredPredictions || 0} pronosticos puntuados${warnings}`)
      qc.invalidateQueries({ queryKey: ['matches-all'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    }
  })

  const setPlanMut = useMutation({
    mutationFn: ({ id, plan }) => adminApi.setUserPlan(id, plan),
    onSuccess: () => {
      showFeedback('Plan de usuario actualizado')
      qc.invalidateQueries({ queryKey: ['admin-users-list'] })
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    }
  })

  const openPoolMut = useMutation({
    mutationFn: () => adminApi.createOpenPool(),
    onSuccess: () => {
      showFeedback('Polla Abierta creada exitosamente')
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
    onError: (err) => showFeedback(err.response?.data?.error || 'Error', 'error')
  })

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">
      
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-72 shrink-0">
        <div className="sticky top-28 space-y-6">
          {/* Botón volver */}
          <button
            onClick={() => fromPath ? navigate(fromPath) : navigate(-1)}
            className="flex items-center gap-2 text-zinc-500 hover:text-mundial-gold transition-colors text-[10px] font-black uppercase tracking-widest px-2"
          >
            <ChevronLeft size={14} strokeWidth={3} />
            {fromPath?.startsWith('/groups/') ? 'Volver al Grupo' : 'Volver'}
          </button>

          <div className="flex items-center gap-4 px-2">
             <div className="w-12 h-12 rounded-2xl bg-mundial-gold/20 flex items-center justify-center text-mundial-gold border border-mundial-gold/30">
               <ShieldCheck size={24} />
             </div>
             <div>
               <h1 className="font-display text-xl text-white">CENTRO DE MANDO</h1>
               <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1 italic">SaaS Administrator Area</p>
             </div>
          </div>

          <nav className="flex flex-col gap-1">
             {TABS.map(tab => (
               <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all
                  ${activeTab === tab.id 
                    ? 'bg-mundial-gold text-mundial-navy shadow-xl shadow-mundial-gold/20' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
               >
                 <tab.icon size={18} />
                 {tab.label}
                 {activeTab === tab.id && <motion.div layoutId="adm-active" className="ml-auto w-1.5 h-1.5 bg-mundial-navy rounded-full" />}
               </button>
             ))}
          </nav>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {feedback && (
             <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className={`fixed top-12 right-12 z-[110] px-6 py-4 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl
                ${feedback.type === 'error' ? 'bg-mundial-red/90 border-mundial-red text-white' : 'bg-mundial-gold/90 border-mundial-gold text-mundial-navy'}`}
             >
               {feedback.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
               <span className="text-xs font-black uppercase tracking-widest">{feedback.msg}</span>
             </motion.div>
          )}
        </AnimatePresence>

        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.3 }}
           className="space-y-8"
        >
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && dashboard && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Usuarios" val={dashboard.stats.users} icon={Users} />
                <StatCard label="Predicciones" val={dashboard.stats.predictions} icon={BarChart3} />
                <StatCard label="Ligas Privadas" val={dashboard.stats.groups} icon={Crown} color="gold" />
                <StatCard label="Partidos Jugados" val={`${dashboard.stats.finishedMatches}/${dashboard.stats.matches}`} icon={Trophy} />
              </div>

              {/* Planes */}
              <div className="card p-8 border-white/5">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-mundial-gold" /> Distribución de Planes
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Free', val: dashboard.stats.plans?.free ?? 0, color: 'text-zinc-400' },
                    { label: 'Clásico', val: dashboard.stats.plans?.clasico ?? 0, color: 'text-blue-400' },
                    { label: 'Pro', val: dashboard.stats.plans?.pro ?? 0, color: 'text-mundial-gold' },
                  ].map(p => (
                    <div key={p.label} className="bg-white/5 rounded-2xl p-6 text-center border border-white/5">
                      <p className={`font-display text-4xl ${p.color}`}>{p.val}</p>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">{p.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Polla Abierta */}
              <div className={`card p-8 border flex flex-col sm:flex-row items-center justify-between gap-6 ${dashboard.stats.openPool ? 'border-mundial-gold/20 bg-mundial-gold/[0.02]' : 'border-white/5'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${dashboard.stats.openPool ? 'bg-mundial-gold text-mundial-navy border-mundial-gold' : 'bg-white/5 text-zinc-600 border-white/10'}`}>
                    <Globe size={28} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-white uppercase">Polla Abierta Global</h3>
                    {dashboard.stats.openPool ? (
                      <p className="text-[10px] text-mundial-gold font-black uppercase tracking-widest mt-1">
                        Activa · {dashboard.stats.openPool._count?.members ?? 0} participantes
                      </p>
                    ) : (
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">No creada — cualquier usuario registrado puede unirse</p>
                    )}
                  </div>
                </div>
                {!dashboard.stats.openPool && (
                  <button
                    onClick={() => openPoolMut.mutate()}
                    disabled={openPoolMut.isPending}
                    className="btn-gold px-6 py-3 text-[10px] whitespace-nowrap"
                  >
                    {openPoolMut.isPending ? 'Creando...' : 'Activar Polla Abierta'}
                  </button>
                )}
              </div>

              <div className="card p-8 bg-gradient-to-br from-white/5 to-white/[0.02] border-white/5">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <BarChart3 size={14} className="text-mundial-gold" /> Salud del Sistema
                </h3>
                <div className="space-y-6">
                  <SystemBar label="Partidos Jugados" current={dashboard.stats.finishedMatches} total={dashboard.stats.matches} color="gold" />
                  <SystemBar label="Actividad (Predicciones)" current={dashboard.stats.predictions} total={dashboard.stats.users * 12} color="red" />
                </div>
              </div>
            </div>
          )}

          {/* TAB: SAAS / GROUPS */}
          {activeTab === 'saas' && (
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h2 className="font-display text-3xl text-white uppercase">Gestión de Ligas SaaS</h2>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Monetización & Límites</p>
               </div>

               <div className="grid gap-3">
                  {allGroups.map(group => (
                    <div key={group.id} className="card p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-mundial-gold/30 transition-all">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${group.isPremium ? 'bg-mundial-gold border-mundial-gold text-mundial-navy' : 'bg-white/5 border-white/10 text-zinc-600' }`}>
                          {group.isPremium ? <Crown size={28} /> : <Users size={28} />}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                             <h4 className="font-display text-xl text-white uppercase truncate">{group.name}</h4>
                             {group.isPremium && <span className="bg-mundial-gold text-mundial-navy px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">PREMIUM</span>}
                          </div>
                          <div className="flex flex-wrap gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                             <span className="flex items-center gap-1.5"><Mail size={12} /> {group.creator?.username}</span>
                             <span className="flex items-center gap-1.5"><Users size={12} /> {group._count?.members} / {group.maxMembers} Miembros</span>
                             <span className="font-mono text-mundial-gold">{group.inviteCode}</span>
                          </div>
                       </div>

                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => premiumMut.mutate({ 
                               id: group.id, 
                               isPremium: !group.isPremium,
                               maxMembers: !group.isPremium ? 999 : 3
                            })}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                              ${group.isPremium ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white' : 'bg-mundial-gold/10 border-mundial-gold/20 text-mundial-gold hover:bg-mundial-gold hover:text-mundial-navy'}`}
                          >
                             {group.isPremium ? 'Bajar a Free' : 'Hacer Premium'}
                          </button>
                          
                          <button 
                            onClick={() => {
                              const limit = prompt('Nuevo límite de miembros:', group.maxMembers)
                              if (limit) premiumMut.mutate({ 
                                id: group.id, 
                                isPremium: group.isPremium,
                                maxMembers: parseInt(limit) 
                              })
                            }}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow-inner"
                          >
                            <Settings size={18} />
                          </button>

                          <button 
                             onClick={() => { if(confirm('¿ELIMINAR LIGA?')) deleteGroupMut.mutate(group.id) }}
                             className="w-10 h-10 rounded-xl bg-mundial-red/10 border border-mundial-red/20 flex items-center justify-center text-mundial-red/60 hover:text-mundial-red transition-all"
                          >
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <h2 className="font-display text-3xl text-white uppercase">Directorio de Usuarios</h2>
                <div className="relative">
                  <input
                    className="input pl-10 py-2.5 text-xs font-black tracking-widest text-zinc-400 min-w-[280px]"
                    placeholder="BUSCAR POR NOMBRE O EMAIL..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                </div>
              </div>

              <div className="card overflow-hidden bg-white/[0.02] border-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Usuario</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden md:table-cell">Email</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Plan</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pts</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Cambiar Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allUsers
                      .filter(u => u.role !== 'SUPER_ADMIN')
                      .filter(u =>
                        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(u => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-mundial-navyLight border border-white/10 flex items-center justify-center text-mundial-gold font-display text-xs">
                                {u.username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{u.username}</p>
                                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{u._count.predictions} preds · {u._count.groupMemberships} ligas</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500 hidden md:table-cell font-mono">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border
                              ${u.plan === 'PRO' ? 'text-mundial-gold border-mundial-gold/30 bg-mundial-gold/10' :
                                u.plan === 'CLASICO' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                                'text-zinc-500 border-white/10 bg-white/5'}`}>
                              {u.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-display text-lg text-white">{u.totalPoints}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <select
                              value={u.plan}
                              onChange={(e) => setPlanMut.mutate({ id: u.id, plan: e.target.value })}
                              className="bg-white/5 border border-white/10 text-[10px] font-black uppercase text-zinc-400 rounded-xl px-3 py-2 outline-none hover:border-mundial-gold/30 transition-colors cursor-pointer"
                            >
                              <option value="FREE">Free</option>
                              <option value="CLASICO">Clásico</option>
                              <option value="PRO">Pro</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: MATCHES */}
          {activeTab === 'matches' && (
            <MatchesTab
              matches={matches}
              matchStatusFilter={matchStatusFilter}
              setMatchStatusFilter={setMatchStatusFilter}
              matchTeamSearch={matchTeamSearch}
              setMatchTeamSearch={setMatchTeamSearch}
              activeMatch={activeMatch}
              setActiveMatch={setActiveMatch}
              resultForm={resultForm}
              setResultForm={setResultForm}
              resultMut={resultMut}
              statusMut={statusMut}
            />
          )}

          {/* TAB: BROADCAST */}
          {activeTab === 'broadcast' && (
            <div className="max-w-2xl mx-auto py-10 space-y-10">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-mundial-gold/20 rounded-3xl mx-auto flex items-center justify-center text-mundial-gold border border-mundial-gold/30">
                     <Send size={40} className="animate-pulse" />
                  </div>
                  <h2 className="font-display text-4xl text-white uppercase tracking-tight">Comunicación Global</h2>
                  <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest leading-loose">Envía alertas de sistema a todos los jugadores que estén navegando en tiempo real.</p>
               </div>

               <div className="card p-10 bg-gradient-to-br from-white/10 to-white/[0.02] border-white/10">
                  <div className="space-y-6">
                     <div>
                        <p className="text-[10px] font-black text-mundial-gold uppercase tracking-[0.2em] mb-4">Mensaje de la Notificación</p>
                        <textarea 
                          className="w-full bg-white/5 border-2 border-white/10 rounded-3xl p-6 text-sm font-bold text-white placeholder:text-zinc-800 focus:border-mundial-gold outline-none transition-all resize-none" 
                          rows={4}
                          placeholder="Escribe el anuncio aquí... ejemplo: '¡ATENCIÓN! Quedan 10 minutos para cerrar los pronósticos del Argentina vs Brasil.'"
                          value={broadcastMsg}
                          onChange={(e) => setBroadcastMsg(e.target.value)}
                        />
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Prioridad</p>
                           <div className="flex gap-2">
                              {['info', 'warning', 'urgent'].map(t => (
                                <button key={t} className="flex-1 py-3 rounded-xl border border-white/5 bg-white/5 text-[9px] font-black uppercase text-zinc-500 hover:text-white transition-all">{t}</button>
                              ))}
                           </div>
                        </div>
                        <div className="flex items-end">
                           <button 
                             onClick={() => broadcastMut.mutate({ message: broadcastMsg, type: 'info' })}
                             disabled={broadcastMut.isPending || !broadcastMsg}
                             className="w-full py-4 rounded-2xl bg-mundial-gold text-mundial-navy text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-mundial-gold/20 hover:scale-[1.02] transition-all disabled:opacity-30 disabled:hover:scale-100"
                           >
                              {broadcastMut.isPending ? 'Transmitiendo...' : 'Transmitir Ahora'}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-4 p-6 bg-mundial-red/10 border border-mundial-red/20 rounded-3xl">
                  <AlertTriangle size={24} className="text-mundial-red shrink-0" />
                  <p className="text-[10px] text-mundial-red font-black uppercase tracking-widest leading-loose">Esto disparará una notificación Socket.io instantánea en todos los clientes conectados. Úsalo con moderación.</p>
               </div>
            </div>
          )}

          {/* TAB: SYSTEM */}
          {activeTab === 'system' && (
            <div className="max-w-2xl mx-auto space-y-12">
               <PickSection title="Sincronización de Datos" subtitle="Actualiza los fixtures desde la API oficial" icon={RefreshCw}>
                  <div className="flex flex-col gap-6">
                     <p className="text-sm text-zinc-500 leading-relaxed font-bold uppercase tracking-widest bg-white/5 p-6 rounded-3xl border border-white/5">
                         Esta acción descargará solo los partidos del Mundial 2026 desde <span className="text-mundial-gold">football-data.org</span>.
                     </p>
                     <div className="grid grid-cols-1 gap-4">
                       <button 
                         onClick={() => { if(confirm('¿Iniciar sincronización externa?')) syncMut.mutate() }}
                          disabled={syncMut.isPending}
                         className="py-5 rounded-[2rem] bg-white/10 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-mundial-gold hover:text-mundial-navy hover:border-mundial-gold transition-all"
                       >
                          {syncMut.isPending ? 'Sincronizando...' : 'Iniciar Sincronización API'}
                       </button>
                     </div>
                  </div>
               </PickSection>

               <PickSection title="Backup de Base de Datos" subtitle="Exporta el estado actual del sistema" icon={Database}>
                  <div className="flex gap-4">
                     <button className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-3">
                        <FileDigit size={18} /> .JSON Export
                     </button>
                     <button className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-3">
                        <Database size={18} /> .SQL Snapshot
                     </button>
                  </div>
               </PickSection>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

// ── Componente separado para la tab de partidos ────────────────────────────────
function MatchesTab({
  matches, matchStatusFilter, setMatchStatusFilter,
  matchTeamSearch, setMatchTeamSearch,
  activeMatch, setActiveMatch, resultForm, setResultForm,
  resultMut, statusMut,
}) {
  const filtered = useMemo(() => {
    let list = [...matches].sort((a, b) => new Date(a.dateUtc) - new Date(b.dateUtc))
    if (matchStatusFilter === 'pending')  list = list.filter(m => m.status === 'SCHEDULED')
    if (matchStatusFilter === 'live')     list = list.filter(m => m.status === 'LIVE')
    if (matchStatusFilter === 'finished') list = list.filter(m => m.status === 'FINISHED')
    if (matchTeamSearch.trim()) {
      const q = matchTeamSearch.toLowerCase()
      list = list.filter(m =>
        m.teamHome?.name?.toLowerCase().includes(q) ||
        m.teamAway?.name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [matches, matchStatusFilter, matchTeamSearch])

  const counts = useMemo(() => ({
    pending:  matches.filter(m => m.status === 'SCHEDULED').length,
    live:     matches.filter(m => m.status === 'LIVE').length,
    finished: matches.filter(m => m.status === 'FINISHED').length,
  }), [matches])

  const openModal = (m) => {
    setActiveMatch(m)
    setResultForm({
      scoreHome: m.scoreHome ?? 0,
      scoreAway: m.scoreAway ?? 0,
      wentToPenalties: m.wentToPenalties ?? false,
      winnerId: m.winnerId ?? null,
    })
  }

  const STATUS_TABS = [
    { id: 'pending',  label: 'Próximos',   count: counts.pending },
    { id: 'live',     label: 'En Vivo',    count: counts.live },
    { id: 'finished', label: 'Finalizados', count: counts.finished },
    { id: 'all',      label: 'Todos',      count: matches.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header + búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <h2 className="font-display text-3xl text-white uppercase">Control de Encuentros</h2>
        <div className="relative">
          <input
            className="input pl-9 py-2 text-xs min-w-[220px]"
            placeholder="Buscar equipo..."
            value={matchTeamSearch}
            onChange={e => setMatchTeamSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          {matchTeamSearch && (
            <button onClick={() => setMatchTeamSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5">
        {STATUS_TABS.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setMatchStatusFilter(id)}
            className={`flex-1 py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5
              ${matchStatusFilter === id ? 'bg-mundial-gold text-mundial-navy' : 'text-zinc-500 hover:text-white'}`}
          >
            {label}
            <span className={`text-[8px] px-1 py-0.5 rounded-md ${matchStatusFilter === id ? 'bg-mundial-navy/20' : 'bg-white/10'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Match list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-700 font-black text-xs uppercase tracking-widest">
          Sin partidos en esta categoría
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const isLive = m.status === 'LIVE'
            const isDone = m.status === 'FINISHED'
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-4 border transition-all
                  ${isLive ? 'border-mundial-red/30 bg-mundial-red/[0.03]' : isDone ? 'border-white/5 opacity-75' : 'border-white/5 hover:border-white/10'}`}
              >
                {/* Meta: fase + fecha */}
                <div className="shrink-0 text-left sm:w-36">
                  <p className="text-[8px] font-black text-mundial-gold uppercase tracking-widest">
                    {m.phase === 'GROUP' ? `Grupo ${m.groupLetter}` : m.phase}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                    {fmtChileDateTime(m.dateUtc)}
                  </p>
                  <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase
                    ${isLive ? 'bg-mundial-red text-white' : isDone ? 'bg-white/10 text-zinc-500' : 'bg-white/5 text-zinc-600'}`}>
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    {m.status}
                  </span>
                </div>

                {/* Teams + score */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  {/* Home */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-black text-white truncate">{m.teamHome?.name}</span>
                    <img src={m.teamHome?.flagUrl} alt="" className="w-8 h-6 object-contain shrink-0" onError={e => { e.target.style.display='none' }} />
                  </div>
                  {/* Score */}
                  <div className="shrink-0 text-center">
                    {isDone || isLive
                      ? <span className="font-display text-2xl text-white px-3">{m.scoreHome ?? 0} – {m.scoreAway ?? 0}</span>
                      : <span className="font-display text-xl text-zinc-700 px-3">VS</span>
                    }
                  </div>
                  {/* Away */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <img src={m.teamAway?.flagUrl} alt="" className="w-8 h-6 object-contain shrink-0" onError={e => { e.target.style.display='none' }} />
                    <span className="text-sm font-black text-white truncate">{m.teamAway?.name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Marcar LIVE — solo si es SCHEDULED */}
                  {m.status === 'SCHEDULED' && (
                    <button
                      onClick={() => statusMut.mutate({ matchId: m.id, status: 'LIVE' })}
                      disabled={statusMut.isPending}
                      title="Marcar como EN VIVO"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mundial-red/10 border border-mundial-red/20 text-mundial-red text-[9px] font-black uppercase tracking-widest hover:bg-mundial-red/20 transition-all"
                    >
                      <Radio size={11} /> LIVE
                    </button>
                  )}
                  {/* Quitar LIVE → SCHEDULED */}
                  {m.status === 'LIVE' && (
                    <button
                      onClick={() => statusMut.mutate({ matchId: m.id, status: 'SCHEDULED' })}
                      disabled={statusMut.isPending}
                      title="Volver a Programado"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-[9px] font-black uppercase tracking-widest hover:text-white transition-all"
                    >
                      <X size={11} /> Quitar LIVE
                    </button>
                  )}
                  {/* Cargar / Editar resultado */}
                  <button
                    onClick={() => openModal(m)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border
                      ${isDone
                        ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                        : 'bg-mundial-gold text-mundial-navy border-mundial-gold hover:opacity-90'}`}
                  >
                    <Trophy size={11} />
                    {isDone ? 'Editar' : 'Resultado'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal resultado mejorado */}
      <AnimatePresence>
        {activeMatch && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card max-w-lg w-full bg-mundial-navyLight border border-mundial-gold/20 overflow-hidden"
            >
              {/* Header del modal */}
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-mundial-gold uppercase tracking-widest">
                    {activeMatch.phase === 'GROUP' ? `Grupo ${activeMatch.groupLetter}` : activeMatch.phase}
                    {' · '}{fmtChileDateTime(activeMatch.dateUtc, { year: 'numeric' })}
                  </p>
                  <h3 className="font-display text-xl text-white uppercase mt-0.5">
                    {activeMatch.status === 'FINISHED' ? 'Editar Resultado' : 'Cargar Resultado Final'}
                  </h3>
                </div>
                <button onClick={() => setActiveMatch(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Score controls */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  {/* Home */}
                  <div className="flex flex-col items-center gap-2">
                    <img src={activeMatch.teamHome?.flagUrl} alt="" className="w-12 h-9 object-contain" onError={e => { e.target.style.display='none' }} />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider text-center truncate w-full">{activeMatch.teamHome?.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setResultForm(f => ({ ...f, scoreHome: Math.max(0, f.scoreHome - 1) }))}
                        className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/15 transition-all">
                        <Minus size={14} />
                      </button>
                      <input
                        type="number" min="0" max="20"
                        className="w-14 bg-mundial-navy border border-mundial-gold/30 rounded-xl text-center text-3xl font-display text-mundial-gold outline-none focus:border-mundial-gold focus:ring-2 focus:ring-mundial-gold/20 py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        value={resultForm.scoreHome}
                        onChange={e => setResultForm(f => ({ ...f, scoreHome: Math.max(0, parseInt(e.target.value) || 0) }))}
                      />
                      <button onClick={() => setResultForm(f => ({ ...f, scoreHome: f.scoreHome + 1 }))}
                        className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/15 transition-all">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <span className="font-display text-3xl text-zinc-700 pb-1">–</span>

                  {/* Away */}
                  <div className="flex flex-col items-center gap-2">
                    <img src={activeMatch.teamAway?.flagUrl} alt="" className="w-12 h-9 object-contain" onError={e => { e.target.style.display='none' }} />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider text-center truncate w-full">{activeMatch.teamAway?.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setResultForm(f => ({ ...f, scoreAway: Math.max(0, f.scoreAway - 1) }))}
                        className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/15 transition-all">
                        <Minus size={14} />
                      </button>
                      <input
                        type="number" min="0" max="20"
                        className="w-14 bg-mundial-navy border border-mundial-gold/30 rounded-xl text-center text-3xl font-display text-mundial-gold outline-none focus:border-mundial-gold focus:ring-2 focus:ring-mundial-gold/20 py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        value={resultForm.scoreAway}
                        onChange={e => setResultForm(f => ({ ...f, scoreAway: Math.max(0, parseInt(e.target.value) || 0) }))}
                      />
                      <button onClick={() => setResultForm(f => ({ ...f, scoreAway: f.scoreAway + 1 }))}
                        className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/15 transition-all">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Penales toggle */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 cursor-pointer hover:border-white/15 transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-mundial-gold"
                    checked={resultForm.wentToPenalties}
                    onChange={e => setResultForm(f => ({ ...f, wentToPenalties: e.target.checked, winnerId: e.target.checked ? f.winnerId : null }))}
                  />
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">Definido por penales</p>
                    <p className="text-[9px] text-zinc-600 font-bold">El marcador debe ser el empate del partido; la tanda no se suma al marcador.</p>
                  </div>
                </label>

                {resultForm.wentToPenalties && resultForm.scoreHome === resultForm.scoreAway && (
                  <div className="p-3 rounded-xl bg-mundial-gold/5 border border-mundial-gold/15 space-y-3">
                    <p className="text-[9px] text-mundial-gold font-black uppercase tracking-widest">Ganador de la tanda</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[activeMatch.teamHome, activeMatch.teamAway].map(team => (
                        <button
                          key={team?.id}
                          type="button"
                          onClick={() => setResultForm(f => ({ ...f, winnerId: team?.id }))}
                          className={`py-2.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                            resultForm.winnerId === team?.id
                              ? 'bg-mundial-gold text-mundial-navy border-mundial-gold'
                              : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'
                          }`}
                        >
                          {team?.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advertencia si ya tenía resultado */}
                {activeMatch.status === 'FINISHED' && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-600/25">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-400 font-bold">
                      Resultado actual: <span className="font-black">{activeMatch.scoreHome} – {activeMatch.scoreAway}</span>.
                      Al confirmar se recalcularán los puntos de todos los participantes.
                    </p>
                  </div>
                )}

                {/* Botones */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveMatch(null)}
                    className="py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (resultForm.wentToPenalties && resultForm.scoreHome === resultForm.scoreAway && !resultForm.winnerId) {
                        showFeedback('Selecciona el ganador por penales', 'error')
                        return
                      }
                      resultMut.mutate({ matchId: activeMatch.id, data: resultForm })
                    }}
                    disabled={resultMut.isPending}
                    className="py-3 rounded-xl bg-mundial-gold text-mundial-navy text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resultMut.isPending
                      ? <><RefreshCw size={12} className="animate-spin" /> Calculando...</>
                      : <><CheckCircle2 size={12} /> Confirmar & Calcular</>
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, val, icon: Icon, trend, color }) {
  return (
    <div className={`card p-6 border-white/5 relative overflow-hidden group transition-all hover:bg-white/[0.03] ${color === 'gold' ? 'border-mundial-gold/10' : ''}`}>
       <div className="flex flex-col gap-1 relative z-10">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">{label}</span>
          <p className={`font-display text-3xl tracking-tight leading-none my-2 transition-colors ${color === 'gold' ? 'text-mundial-gold' : 'text-white'}`}>{val}</p>
          {trend && <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{trend}</span>}
       </div>
       <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
         <Icon size={64} fill="currentColor" />
       </div>
    </div>
  )
}

function SystemBar({ label, current, total, color }) {
  const pct = Math.min(100, Math.round((current / total) * 100))
  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
          <span className="text-zinc-500">{label}</span>
          <span className={color === 'red' ? 'text-mundial-red' : 'text-mundial-gold'}>{current} / {total}</span>
       </div>
       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${pct}%` }} 
            className={`h-full rounded-full ${color === 'red' ? 'bg-mundial-red' : 'bg-mundial-gold'}`} 
          />
       </div>
    </div>
  )
}

function PickSection({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="card p-10 bg-white/5 border-white/5 relative overflow-hidden group">
      <div className="flex items-center gap-5 mb-8 pb-8 border-b border-white/5">
         <div className="w-14 h-14 rounded-2xl bg-mundial-navy border border-white/10 flex items-center justify-center text-mundial-gold shadow-inner group-hover:rotate-12 transition-transform">
            <Icon size={28} />
         </div>
         <div>
            <h3 className="font-display text-2xl text-white uppercase tracking-tight">{title}</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
         </div>
      </div>
      {children}
    </div>
  )
}
