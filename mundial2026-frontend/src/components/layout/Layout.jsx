import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Trophy, BarChart3, Users, BookOpen, Settings, LogOut, Bell, X, Zap, ArrowUp, Crown } from 'lucide-react'

// ── Plan Badge ──────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
  FREE:    { label: 'Free',     bg: 'bg-zinc-800',          text: 'text-zinc-400',      border: 'border-zinc-700' },
  CLASICO: { label: 'Clásico', bg: 'bg-blue-900/60',        text: 'text-blue-400',      border: 'border-blue-700/50' },
  PRO:     { label: 'Pro ⚡',   bg: 'bg-mundial-gold/10',    text: 'text-mundial-gold',  border: 'border-mundial-gold/30' },
}

function PlanBadge({ plan, size = 'sm' }) {
  const cfg = PLAN_CONFIG[plan] || PLAN_CONFIG.FREE
  const isSmall = size === 'sm'
  return (
    <span className={`inline-flex items-center font-black uppercase tracking-widest rounded-full border
      ${cfg.bg} ${cfg.text} ${cfg.border}
      ${isSmall ? 'text-[8px] px-2 py-0.5' : 'text-[10px] px-3 py-1'}`}>
      {cfg.label}
    </span>
  )
}
import BottomNav from './BottomNav'
import CountdownTimer from '../common/CountdownTimer'

const NAV = [
  { to: '/matches',     label: 'Partidos', icon: Calendar },
  { to: '/tournament',  label: 'Torneo',   icon: Trophy },
  { to: '/leaderboard', label: 'Ranking',  icon: BarChart3 },
  { to: '/groups',      label: 'Grupos',   icon: Users },
  { to: '/rules',       label: 'Reglas',   icon: BookOpen },
]

export default function Layout() {
  const { user, logout, loadingProfile } = useAuth()
  const socketRef = useSocket()
  const navigate = useNavigate()
  const [notification, setNotification] = useState(null)
  const location = useLocation()
  const { pathname } = location

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  // Restricción: Si el usuario no tiene grupos, solo ve Grupos y Reglas
  const isRestricted = !isSuperAdmin && (user?.groupCount === 0 || user?.groupCount === undefined)
  
  useEffect(() => {
    if (!loadingProfile && isRestricted) {
      const allowed = ['/groups', '/rules', '/admin']
      const isAllowed = allowed.some(path => pathname.startsWith(path))
      if (!isAllowed) {
        navigate('/groups', { replace: true })
      }
    }
  }, [isRestricted, pathname, navigate, loadingProfile])

  // Listener de Notificaciones Globales
  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return

    socket.on('notification:global', (data) => {
      setNotification(data)
      // Auto-ocultar después de 8 segundos
      setTimeout(() => setNotification(null), 8000)
    })

    return () => socket.off('notification:global')
  }, [socketRef])

  const filteredNav = NAV.filter(item => {
    if (isRestricted) {
      return ['/groups', '/rules'].includes(item.to)
    }
    return true
  })

  return (
    <div className="min-h-screen flex flex-col bg-mundial-navy text-white selection:bg-mundial-gold selection:text-mundial-navy overflow-x-hidden">
      {/* Notificación Global (Real-time Broadcast) */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg"
          >
            <div className="relative group overflow-hidden p-[1px] rounded-3xl bg-gradient-to-r from-mundial-gold via-white/50 to-mundial-gold shadow-2xl">
               <div className="bg-mundial-navyLight backdrop-blur-3xl rounded-[calc(1.5rem-1px)] p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-mundial-gold/20 flex items-center justify-center text-mundial-gold shrink-0 border border-mundial-gold/20 shadow-inner">
                    <Bell size={24} className="animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-mundial-gold uppercase tracking-[0.2em]">COMUNICADO OFICIAL</span>
                      <button onClick={() => setNotification(null)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-white leading-relaxed">{notification.message}</p>
                    <div className="mt-3 flex items-center gap-2">
                       <Zap size={12} className="text-mundial-gold" fill="currentColor" />
                       <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Enviado por: Administración Mundialista</span>
                    </div>
                  </div>
               </div>
               
               {/* Progress bar decay */}
               <motion.div 
                 initial={{ width: '100%' }}
                 animate={{ width: '0%' }}
                 transition={{ duration: 8, ease: 'linear' }}
                 className="absolute bottom-0 left-0 h-1 bg-mundial-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]"
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background radial sutil */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden h-screen z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-mundial-gold/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-mundial-red/5 rounded-full blur-[100px]" />
      </div>

      {/* Header / Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-mundial-navy/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-4">
          
          {/* Logo dinámico */}
          <NavLink to={isRestricted ? "/groups" : "/matches"} className="flex items-center gap-3 shrink-0 group">
            <div className="relative">
              <img src="/logo.png" alt="MUNDIAL 2026" className="w-10 md:w-12 h-auto drop-shadow-2xl group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute -inset-2 bg-mundial-gold opacity-0 blur-xl rounded-full group-hover:opacity-20 transition" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl md:text-2xl text-white leading-none tracking-tight">QUIÉN <span className="text-mundial-gold">GANA</span></span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1">World Cup 2026</span>
            </div>
          </NavLink>

          {/* Menú Superior (Desktop) */}
          <nav className="hidden md:flex items-center justify-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
            {filteredNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all
                   ${isActive
                     ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20'
                     : 'text-zinc-400 hover:text-white hover:bg-white/5'
                   }`
                }
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Usuario / Logout (Desktop) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Botón upgrade — solo plan FREE, no admin */}
            {user?.plan === 'FREE' && !isSuperAdmin && (
              <NavLink
                to="/groups"
                title="Actualizar a Plan Elite"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#FFD700]/40 bg-[#FFD700]/8 text-[#FFD700] text-[9px] font-black uppercase tracking-widest hover:bg-[#FFD700]/15 hover:border-[#FFD700]/60 transition-all"
                style={{ textDecoration: 'none' }}
              >
                <Crown size={11} />
                Plan Free · Subir
              </NavLink>
            )}

            <NavLink
              to={`/profile/${user?.id}`}
              className="flex items-center gap-3 hover:bg-white/5 pr-4 pl-1.5 py-1.5 rounded-full transition-all border border-transparent hover:border-white/10 group"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-mundial-navyLight border border-white/10 flex items-center justify-center text-sm font-display text-mundial-gold shadow-2xl group-hover:border-mundial-gold/30">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                {/* Dot indicador de plan */}
                {user?.plan === 'PRO' && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-mundial-gold rounded-full border-2 border-mundial-navy" />
                )}
                {user?.plan === 'CLASICO' && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-400 rounded-full border-2 border-mundial-navy" />
                )}
              </div>
              <div className="hidden lg:flex flex-col items-start gap-1">
                <p className="text-xs font-bold text-white leading-none">{user?.username}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-mundial-gold font-mono tracking-tighter">{user?.totalPoints || 0} PTS</p>
                  <PlanBadge plan={user?.plan || 'FREE'} size="sm" />
                </div>
              </div>
            </NavLink>
            
            {isSuperAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `hidden md:flex w-10 h-10 items-center justify-center rounded-full transition-all border
                   ${isActive ? 'bg-mundial-gold text-mundial-navy border-mundial-gold' : 'text-zinc-500 hover:text-mundial-gold hover:bg-mundial-gold/10 border-transparent hover:border-mundial-gold/20'}`
                }
                title="Panel Admin"
              >
                <Settings size={20} />
              </NavLink>
            )}

            <button
              onClick={logout}
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-full text-zinc-500 hover:text-mundial-red hover:bg-mundial-red/10 transition-all border border-transparent hover:border-mundial-red/20"
              title="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-12">
        
        {/* Banner de Bienvenida Premium */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12 flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group"
        >
          {/* Subtle patterns */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-mundial-gold/5 blur-[80px] -mr-32 -mt-32" />
          
          <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
            <div className="w-16 h-16 bg-mundial-navy border border-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:border-mundial-gold/50 transition-colors">
              {pathname === '/groups' ? <Users className="text-mundial-gold" /> : <Calendar className="text-mundial-gold" />}
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-white leading-tight uppercase tracking-tight">
                {pathname === '/groups' ? 'GESTOR DE GRUPOS' : 
                 pathname === '/leaderboard' ? 'RANKING MUNDIAL' :
                 pathname === '/tournament' ? 'CUADRO DEL TORNEO' :
                 'TUS PRONÓSTICOS'}
              </h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="w-2 h-2 bg-mundial-gold rounded-full animate-pulse" />
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                   Mundial FIFA 2026 · {user?.username}
                </p>
                <PlanBadge plan={user?.plan || 'FREE'} size="md" />
              </div>
              {/* Upgrade prompt para plan FREE */}
              {user?.plan === 'FREE' && !isSuperAdmin && (
                <div className="mt-3 flex items-center gap-2">
                  <NavLink
                    to="/groups"
                    className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-mundial-gold transition-colors border border-white/10 hover:border-mundial-gold/30 rounded-full px-3 py-1 bg-white/5 hover:bg-mundial-gold/5"
                  >
                    <ArrowUp size={10} className="text-mundial-gold" />
                    Actualizar Plan
                  </NavLink>
                  <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
                    {user?.plan === 'FREE' && '5 miembros máx · 1 grupo'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Reloj Cuenta Regresiva */}
          <div className="relative z-10 w-full md:w-auto">
            <CountdownTimer variant="mini" />
          </div>
        </motion.div>

        {/* Page Content with Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Desktop */}
      <footer className="hidden md:block relative z-10 border-t border-white/5 py-12 text-center bg-mundial-navy/50 backdrop-blur-sm mt-auto">
        <div className="flex flex-col items-center gap-10">
          <div className="flex items-center gap-8 grayscale opacity-40">
             <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
             <div className="h-10 w-[1px] bg-white/10" />
             <p className="font-display text-2xl text-white">2026</p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-600 font-mono tracking-[0.4em] uppercase">
               Mundial de la FIFA 2026 · Plataforma Oficial de Pronósticos
            </p>
            <p className="text-xs text-zinc-500">©{new Date().getFullYear()} · SaaS Edition Premium · <span className="text-mundial-gold">Vibe Coding</span></p>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation (Native-like) */}
      <BottomNav user={user} filteredNav={filteredNav} />
    </div>
  )
}
