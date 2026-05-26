import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupApi, leaderboardApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Users, Crown, ChevronRight, Lock, Sparkles, AlertCircle, Link2, Check, Trophy, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const PLAN_GROUP_LIMIT = { FREE: 1, CLASICO: 1, DT: 3, PRO: 99 }
const PLAN_MEMBER_LIMIT = { FREE: 5, CLASICO: 15, DT: 50, PRO: 150 }

export default function GroupsPage() {
  const qc = useQueryClient()
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('my')
  const [mode, setMode] = useState(null)
  const [activeGroupForJoin, setActiveGroupForJoin] = useState(null)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const plan = user?.plan || 'FREE'
  const maxGroups = PLAN_GROUP_LIMIT[plan]

  const copyInviteLink = (group) => {
    const url = `${window.location.origin}/join/${group.inviteToken}`
    navigator.clipboard.writeText(url)
    setCopiedId(group.id)
    toast.success('Link copiado')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const { data: myGroups = [], isLoading: loadingMy } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupApi.my().then(r => r.data),
  })

  const { data: allGroups = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-groups'],
    queryFn: () => groupApi.listAll().then(r => r.data),
    enabled: tab === 'all',
  })

  const createMut = useMutation({
    mutationFn: () => groupApi.create({ name: createName }),
    onSuccess: (res) => {
      updateUser({ groupCount: (user.groupCount || 0) + 1 })
      qc.invalidateQueries({ queryKey: ['my-groups'] })
      setCreateName('')
      setMode(null)
      setTab('my')
      setError('')
      if (res?.data?.id) navigate(`/groups/${res.data.id}`)
    },
    onError: (err) => setError(err.response?.data?.error || 'Error al crear grupo'),
  })

  const joinMut = useMutation({
    mutationFn: () => groupApi.join(joinCode.trim().toUpperCase()),
    onSuccess: (res) => {
      updateUser({ groupCount: (user.groupCount || 0) + 1 })
      qc.invalidateQueries({ queryKey: ['my-groups'] })
      setJoinCode('')
      setMode(null)
      setActiveGroupForJoin(null)
      setTab('my')
      setError('')
      if (res?.data?.group?.id) navigate(`/groups/${res.data.group.id}`)
    },
    onError: (err) => setError(err.response?.data?.error || 'Código inválido'),
  })

  return (
    <div className="max-w-3xl mx-auto pb-20 px-4">
      <div className="flex flex-col gap-8 mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-white tracking-tight uppercase">Comunidades</h1>
            <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">Crea tu liga o únete a una existente</p>
          </div>
          <button
            onClick={() => {
              if (myGroups.filter(g => g.creatorId === user?.id).length >= maxGroups) {
                toast.error(`Tu plan ${plan} permite crear hasta ${maxGroups} grupo(s). Actualiza tu plan para crear más.`)
                return
              }
              setMode('create'); setError('')
            }}
            className="btn-gold px-6 py-3 rounded-2xl flex items-center gap-2 group transition-all"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            <span className="font-bold">CREAR MI GRUPO</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1.5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
          {[
            { id: 'my', label: 'Mis Grupos', count: myGroups.length, icon: Users },
            { id: 'all', label: 'Explorar', icon: Search }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2
                ${tab === t.id 
                  ? 'bg-mundial-gold text-mundial-navy shadow-xl shadow-mundial-gold/20' 
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <t.icon size={14} />
              {t.label} 
              {t.count !== undefined && <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${tab === t.id ? 'bg-mundial-navy/10' : 'bg-white/10'}`}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Create Form */}
        {mode === 'create' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-8 mb-10 border-mundial-gold/20 bg-mundial-gold/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={120} className="text-mundial-gold" />
            </div>
            <h2 className="font-display text-2xl text-white mb-2 flex items-center gap-3">
               <Plus className="text-mundial-gold" /> NUEVO GRUPO
            </h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-lg">Crea una liga privada para tus amigos o colegas. Podrás compartir el código de invitación una vez creado.</p>
            
            {error && (
              <motion.div initial={{ x: -10 }} animate={{ x: 0 }} className="mb-6 p-4 bg-mundial-red/10 border border-mundial-red/20 rounded-2xl text-mundial-red text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="group relative">
                <input
                  className="input py-4 pr-12 focus:border-mundial-gold/50"
                  placeholder="Ej: La Oficina Qatar 2.0"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => createMut.mutate()}
                  disabled={!createName.trim() || createMut.isPending}
                  className="btn-gold flex-1 py-4 text-sm tracking-widest shadow-2xl"
                >
                  {createMut.isPending ? 'CREANDO...' : 'INICIAR MI LIGA'}
                </button>
                <button onClick={() => setMode(null)} className="px-8 py-4 text-sm font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest leading-none">
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Join form */}
        {(mode === 'join' || activeGroupForJoin) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-8 mb-10 border-white/10 bg-white/5 relative overflow-hidden"
          >
            <h2 className="font-display text-2xl text-white mb-2 uppercase tracking-tight">
              {activeGroupForJoin ? `Unirme a "${activeGroupForJoin.name}"` : 'Acceder con Código'}
            </h2>
            <p className="text-sm text-zinc-400 mb-6">Ingresa el código alfanumérico que te enviaron para entrar al grupo.</p>
            
            {error && (
              <motion.div initial={{ x: -10 }} animate={{ x: 0 }} className="mb-6 p-4 bg-mundial-red/10 border border-mundial-red/20 rounded-2xl text-mundial-red text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <div className="space-y-6">
              <input
                className="input py-6 font-mono text-center text-4xl uppercase tracking-[0.4em] placeholder:text-white/5 focus:border-mundial-gold/30"
                placeholder="XXXX1234"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => joinMut.mutate()}
                  disabled={joinCode.length < 4 || joinMut.isPending}
                  className="btn-gold flex-1 py-4 text-sm tracking-widest"
                >
                  {joinMut.isPending ? 'VALIDANDO...' : 'CONFIRMAR INGRESO'}
                </button>
                <button onClick={() => { setMode(null); setActiveGroupForJoin(null) }} className="px-8 py-4 text-sm font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest leading-none">
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List content */}
      <div className="space-y-4">
        {tab === 'my' ? (
          loadingMy ? <SkeletonList /> :
          myGroups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 px-6 bg-gradient-to-b from-mundial-gold/5 to-transparent border border-dashed border-mundial-gold/20 rounded-[2.5rem]"
            >
              <div className="w-24 h-24 bg-mundial-gold/10 border border-mundial-gold/20 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-mundial-gold/10">
                <Trophy size={44} className="text-mundial-gold" />
              </div>
              <h3 className="text-white font-display text-3xl uppercase tracking-tight">Arma tu liga</h3>
              <p className="text-zinc-400 mt-3 max-w-xs mx-auto text-sm leading-relaxed">
                Crea tu primera comunidad, invita a tus amigos y empiecen a apostar juntos.
              </p>
              <button
                onClick={() => { setMode('create'); setError('') }}
                className="mt-8 btn-gold px-8 py-4 rounded-2xl flex items-center gap-2 mx-auto font-black text-sm uppercase tracking-widest shadow-lg shadow-mundial-gold/20 hover:scale-105 transition-transform"
              >
                <Plus size={18} /> CREAR MI PRIMERA LIGA
              </button>
              <button
                onClick={() => { setMode('join'); setError('') }}
                className="mt-4 text-zinc-500 hover:text-mundial-gold text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 mx-auto"
              >
                o únete con un código <ChevronRight size={12} />
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-5">
              {myGroups.map((group, idx) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 }}
                >
                  <Link to={`/groups/${group.id}`} className="group block">
                    <div className="relative overflow-hidden rounded-[2rem] border border-white/8 hover:border-mundial-gold/40 transition-all duration-300 bg-gradient-to-br from-mundial-navyLight via-mundial-navy to-mundial-navy shadow-xl hover:shadow-mundial-gold/10 hover:shadow-2xl">
                      {/* Degradé dorado izquierda */}
                      <div className="absolute inset-0 bg-gradient-to-r from-mundial-gold/10 via-transparent to-transparent pointer-events-none" />
                      {/* Glow top-right */}
                      <div className="absolute top-0 right-0 w-56 h-56 bg-mundial-gold/5 blur-[70px] -mr-20 -mt-20 pointer-events-none" />
                      {/* Línea izquierda dorada */}
                      <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-gradient-to-b from-transparent via-mundial-gold to-transparent rounded-full" />

                      <div className="relative z-10 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                          {/* Icono + nombre */}
                          <div className="flex items-center gap-5 flex-1 min-w-0">
                            <div className="w-16 h-16 rounded-2xl bg-mundial-gold/10 border border-mundial-gold/20 flex items-center justify-center shrink-0 group-hover:bg-mundial-gold/15 group-hover:border-mundial-gold/40 transition-all">
                              {group.isPremium
                                ? <Crown className="text-mundial-gold" size={28} />
                                : <Users className="text-mundial-gold/60" size={28} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-display text-2xl sm:text-3xl text-white group-hover:text-mundial-gold transition-colors uppercase leading-none tracking-tight truncate">
                                  {group.name}
                                </h3>
                                {group.isPremium && (
                                  <span className="bg-mundial-gold text-mundial-navy text-[8px] font-black px-2 py-0.5 rounded-full tracking-widest shrink-0">PREMIUM</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                  <UserIcon value={group.creator?.username[0]} /> Admin: {group.creator?.username}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${group._count?.members >= group.maxMembers ? 'text-mundial-red' : 'text-zinc-500'}`}>
                                  <Users size={11} /> {group._count?.members || 0}/{group.maxMembers}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Derecha: rank + código + link + chevron */}
                          <div className="flex items-center gap-3 sm:shrink-0 pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-5">
                            <GroupRankBadge groupId={group.id} userId={user?.id} />

                            <div className="hidden sm:flex flex-col items-center">
                              <span className="font-mono text-sm text-mundial-gold font-black tracking-widest">{group.inviteCode}</span>
                              <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">código</span>
                            </div>

                            {group.creatorId === user?.id && group.inviteToken && (
                              <button
                                onClick={(e) => { e.preventDefault(); copyInviteLink(group) }}
                                title="Copiar link"
                                className={`p-2.5 rounded-xl border transition-all ${copiedId === group.id ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-mundial-gold hover:border-mundial-gold/30'}`}
                              >
                                {copiedId === group.id ? <Check size={16} /> : <Link2 size={16} />}
                              </button>
                            )}

                            <ChevronRight className="text-zinc-600 group-hover:text-mundial-gold group-hover:translate-x-1 transition-all" size={22} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          loadingAll ? <SkeletonList /> :
          allGroups.length === 0 ? (
            <p className="text-center py-12 text-zinc-600 font-bold uppercase tracking-widest text-xs italic">No se encontraron ligas públicas</p>
          ) : (
            <div className="grid gap-4">
              {allGroups.map((group, idx) => {
                const isMember = myGroups.some(mg => mg.id === group.id)
                const isFull = group._count?.members >= group.maxMembers
                
                return (
                  <motion.div 
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative group overflow-hidden ${isFull && !group.isPremium ? 'opacity-60' : 'bg-white/5'}`}
                  >
                    {group.isPremium && <div className="absolute top-0 right-0 w-32 h-32 bg-mundial-gold/5 -mr-16 -mt-16 rounded-full blur-2xl" />}
                    
                    <div className="w-14 h-14 rounded-2xl bg-mundial-navy border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:border-mundial-gold/30 transition-all shrink-0">
                      {group.isPremium ? <Crown className="text-mundial-gold" size={28} /> : <Users className="text-zinc-700" size={28} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-xl text-white uppercase">{group.name}</h3>
                        {group.isPremium && <span className="bg-mundial-gold/10 text-mundial-gold text-[9px] font-black px-1.5 py-0.5 rounded border border-mundial-gold/20">PRO</span>}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        Admin: <span className="text-zinc-300">{group.creator?.username}</span>
                        <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                        <span className={isFull ? "text-mundial-red" : "text-zinc-300"}>
                           {group._count?.members || 0} / {group.maxMembers} Jugadores
                        </span>
                      </p>
                    </div>

                    <div className="w-full sm:w-auto shrink-0 mt-4 sm:mt-0">
                      {isMember ? (
                        <Link to={`/groups/${group.id}`} className="btn-gold-outline w-full sm:w-auto px-6 h-11 flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                          Ya eres miembro
                        </Link>
                      ) : isFull && !group.isPremium ? (
                        <div className="flex flex-col items-end">
                          <span className="flex items-center gap-1.5 text-mundial-red text-[10px] font-black uppercase tracking-widest mb-1">
                             <Lock size={12} /> Grupo Lleno
                          </span>
                          <span className="text-[9px] text-zinc-600 italic">Límite de miembros alcanzado</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setActiveGroupForJoin(group); setError('') }}
                          className="btn-gold w-full sm:w-auto px-8 h-11 text-[10px] uppercase font-black tracking-widest"
                        >
                          Unirse ahora
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function GroupRankBadge({ groupId, userId }) {
  const { data = [] } = useQuery({
    queryKey: ['group-leaderboard', groupId],
    queryFn: () => leaderboardApi.group(groupId).then(r => r.data),
    staleTime: 60_000,
  })
  const ranked = data.filter(e => e.user?.role !== 'SUPER_ADMIN')
  const entry  = ranked.find(e => e.userId === userId)
  if (!entry) return null

  const medalColor =
    entry.rank === 1 ? 'text-mundial-gold border-mundial-gold/30 bg-mundial-gold/10' :
    entry.rank === 2 ? 'text-zinc-300 border-zinc-500/30 bg-zinc-700/20' :
    entry.rank === 3 ? 'text-orange-400 border-orange-500/30 bg-orange-900/20' :
                       'text-zinc-400 border-white/10 bg-white/5'

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${medalColor} shrink-0`}>
      <TrendingUp size={11} />
      <span className="font-display text-base leading-none tabular-nums">#{entry.rank}</span>
      <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{entry.totalPoints} pts</span>
    </div>
  )
}

function UserIcon({ value }) {
  return (
    <div className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center text-[8px] text-white overflow-hidden">
      {value?.toUpperCase() || '?'}
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 rounded-3xl animate-pulse bg-white/5 border border-white/5" />
      ))}
    </div>
  )
}
