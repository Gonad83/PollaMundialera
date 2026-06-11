import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Star, Trophy, Target, TrendingUp, Calendar, Zap, BarChart3, Settings } from 'lucide-react'
import api, { predictionApi } from '../lib/api'
import { teamEsp } from '../lib/teams'

const PLAN_CONFIG = {
  FREE:    { label: 'Free',     color: 'text-zinc-400',     bg: 'bg-zinc-800/60',        border: 'border-zinc-700' },
  CLASICO: { label: 'Clásico', color: 'text-blue-400',     bg: 'bg-blue-900/40',        border: 'border-blue-700/50' },
  DT:      { label: 'DT ⚡',   color: 'text-amber-400',    bg: 'bg-amber-900/30',       border: 'border-amber-700/40' },
  PRO:     { label: 'Elite ⚡', color: 'text-mundial-gold', bg: 'bg-mundial-gold/10',   border: 'border-mundial-gold/30' },
}

function pointsColor(pts) {
  if (pts >= 5) return 'text-mundial-gold'
  if (pts >= 3) return 'text-blue-300'
  if (pts >= 1) return 'text-green-400'
  return 'text-zinc-600'
}

function resultLabel(pred) {
  if (pred.pointsExact >= 5) return { icon: '🔥', text: 'Exacto', cls: 'text-mundial-gold' }
  if (pred.pointsWinner > 0) return { icon: '✓', text: 'Ganador', cls: 'text-green-400' }
  return { icon: '—', text: 'Fallo', cls: 'text-zinc-600' }
}

export default function ProfilePage() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const isMe = id === me?.id

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.get(`/users/${id}/profile`).then(r => r.data),
  })

  const { data: predictions = [] } = useQuery({
    queryKey: ['predictions-history', id],
    queryFn: () => predictionApi.my({ status: 'FINISHED' }).then(r => r.data),
    enabled: isMe,
  })

  if (isLoading) return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-48 rounded-[2rem] bg-white/5" />
      <div className="h-32 rounded-[2rem] bg-white/5" />
      <div className="h-64 rounded-[2rem] bg-white/5" />
    </div>
  )

  if (!profile) return (
    <div className="text-center py-20">
      <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Usuario no encontrado</p>
    </div>
  )

  const plan = PLAN_CONFIG[profile.plan || 'FREE'] || PLAN_CONFIG.FREE
  const exactPct  = profile.played > 0 ? Math.round((profile.exactHits / profile.played) * 100) : 0
  const winnerPct = profile.played > 0 ? Math.round(((profile.winnerHits || 0) / profile.played) * 100) : 0

  // Estadísticas derivadas del historial (solo isMe)
  const totalPredPts = predictions.reduce((s, p) => s + (p.pointsTotal || 0), 0)
  const streak = (() => {
    let s = 0
    for (const p of [...predictions].sort((a, b) => new Date(b.match?.dateUtc) - new Date(a.match?.dateUtc))) {
      if (p.pointsTotal > 0) s++
      else break
    }
    return s
  })()

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-5">

      {/* ── Hero Card ── */}
      <div className="card p-8 relative overflow-hidden border border-white/8">
        {/* Glow de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-mundial-gold/5 blur-[80px] -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-3xl bg-mundial-navyLight border border-white/10 flex items-center justify-center text-4xl font-display text-mundial-gold shadow-2xl">
              {profile.username?.[0]?.toUpperCase()}
            </div>
            {profile.plan === 'PRO' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-mundial-gold rounded-full border-2 border-mundial-navy flex items-center justify-center">
                <Zap size={10} className="text-mundial-navy" fill="currentColor" />
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-display text-3xl text-white uppercase tracking-tight">{profile.username}</h1>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${plan.bg} ${plan.color} ${plan.border}`}>
                {plan.label}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Miembro desde {format(new Date(profile.createdAt), "MMMM yyyy", { locale: es })}
            </p>
            {isMe && streak > 1 && (
              <p className="text-[10px] text-mundial-gold font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                <Zap size={10} fill="currentColor" /> Racha de {streak} partidos con puntos
              </p>
            )}
          </div>

          {/* Puntos totales + ajustes */}
          <div className="shrink-0 text-right flex flex-col items-end gap-3">
            <div>
              <p className="font-display text-5xl text-mundial-gold leading-none">{profile.totalPoints}</p>
              <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1">pts totales</p>
            </div>
            {isMe && (
              <Link to="/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-zinc-500 hover:text-mundial-gold hover:border-mundial-gold/30 transition-all text-[9px] font-black uppercase tracking-widest">
                <Settings size={11} /> Editar perfil
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Partidos',  value: profile.played,          icon: Calendar,   color: 'text-white' },
          { label: 'Exactos',   value: profile.exactHits,       icon: Target,     color: 'text-mundial-gold' },
          { label: '% Exactos', value: `${exactPct}%`,          icon: TrendingUp, color: 'text-green-400' },
          { label: 'Puntos',    value: profile.totalPoints,     icon: Star,       color: 'text-mundial-gold' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 text-center bg-white/3 border border-white/5">
            <Icon size={16} className={`mx-auto mb-2 ${color} opacity-60`} />
            <p className={`font-display text-2xl leading-none ${color}`}>{value}</p>
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Barras de precisión ── */}
      {profile.played > 0 && (
        <div className="card p-6 bg-white/3 border border-white/5 space-y-4">
          <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={12} /> Precisión de pronósticos
          </h3>

          {[
            { label: 'Marcador exacto', pct: exactPct, color: 'bg-mundial-gold' },
            { label: 'Ganador correcto (incluye exactos)', pct: winnerPct, color: 'bg-green-500' },
          ].map(({ label, pct, color }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>{label}</span>
                <span className="text-white">{pct}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${color}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Historial de apuestas (solo propio usuario) ── */}
      {isMe && (
        <div className="card overflow-hidden bg-white/3 border border-white/5">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display text-lg text-white uppercase flex items-center gap-2">
              <Trophy size={16} className="text-mundial-gold" /> Historial
            </h2>
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{predictions.length} partidos</span>
          </div>

          {predictions.length === 0 ? (
            <div className="text-center py-14">
              <Calendar size={36} className="mx-auto text-zinc-800 mb-3" />
              <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Sin partidos finalizados aún</p>
              <Link to="/matches" className="text-mundial-gold text-[10px] font-black uppercase tracking-widest mt-3 inline-block hover:opacity-80 transition-opacity">
                Ver partidos →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {predictions.map((pred, idx) => {
                const m = pred.match
                const { icon, text, cls } = resultLabel(pred)
                const homeEsp = teamEsp(m?.teamHome)
                const awayEsp = teamEsp(m?.teamAway)
                return (
                  <motion.div
                    key={pred.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors"
                  >
                    {/* Fecha */}
                    <div className="shrink-0 w-10 text-center">
                      <p className="text-[8px] font-black text-zinc-600 uppercase leading-tight">
                        {m?.dateUtc ? format(new Date(m.dateUtc), 'd MMM', { locale: es }) : '—'}
                      </p>
                    </div>

                    {/* Partido */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {homeEsp || m?.teamHome?.name} <span className="text-zinc-600">vs</span> {awayEsp || m?.teamAway?.name}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-bold mt-0.5">
                        Real: <span className="text-zinc-300">{m?.scoreHome ?? '—'}–{m?.scoreAway ?? '—'}</span>
                        {' · '}Aposté: <span className="text-zinc-300">{pred.predHome}–{pred.predAway}</span>
                      </p>
                    </div>

                    {/* Resultado */}
                    <div className="shrink-0 text-right">
                      <p className={`font-display text-lg leading-none ${pointsColor(pred.pointsTotal)}`}>
                        +{pred.pointsTotal}
                      </p>
                      <p className={`text-[8px] font-black uppercase tracking-widest ${cls}`}>
                        {icon} {text}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
