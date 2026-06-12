import { useEffect, useState, Component } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Trophy, BookOpen, Settings, LogOut, Bell, BellOff, BellRing, X, Zap, ArrowUp, Crown, Users, Wifi, WifiOff, Download, Star, AlertTriangle, BarChart3, MessageSquare } from 'lucide-react'
import { useHeaderActions } from '../../context/HeaderActionsContext'
import { useServerStatus } from '../../hooks/useServerStatus'
import { useMatchReminders } from '../../hooks/useMatchReminders'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import BottomNav from './BottomNav'
import CountdownTimer from '../common/CountdownTimer'

class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err) { console.error('[ErrorBoundary]', err) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <AlertTriangle size={40} className="text-mundial-red opacity-60" />
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Algo salió mal en esta página</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            className="px-5 py-2.5 rounded-2xl bg-mundial-gold/10 border border-mundial-gold/30 text-mundial-gold text-xs font-black uppercase tracking-widest hover:bg-mundial-gold/20 transition-all"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Plan Badge ──────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
  FREE:    { label: 'Free',      bg: 'bg-zinc-800',           text: 'text-zinc-400',      border: 'border-zinc-700' },
  CLASICO: { label: 'Clásico',  bg: 'bg-blue-900/60',         text: 'text-blue-400',      border: 'border-blue-700/50' },
  DT:      { label: 'DT ⚡',    bg: 'bg-amber-900/40',        text: 'text-amber-400',     border: 'border-amber-700/40' },
  PRO:     { label: 'Elite ⚡', bg: 'bg-mundial-gold/10',     text: 'text-mundial-gold',  border: 'border-mundial-gold/30' },
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

const MAIN_NAV = [
  { to: '/matches', label: 'Pronósticos', icon: Calendar },
  { to: '/rules',   label: 'Reglas',   icon: BookOpen },
]

const RESTRICTED_NAV = [
  { to: '/groups', label: 'Grupos', icon: Users },
  { to: '/rules',  label: 'Reglas', icon: BookOpen },
]

export default function Layout() {
  const { user, logout, loading: loadingProfile } = useAuth()
  const socketRef = useSocket()
  const navigate = useNavigate()
  const [notification, setNotification] = useState(null)
  const location = useLocation()
  const { pathname, search } = location

  const { actions: headerActions } = useHeaderActions()
  const { status: serverStatus } = useServerStatus()
  const { permission: notifPerm, requestPermission, activeCount } = useMatchReminders()
  const { canInstall, install } = usePWAInstall()
  const [dismissedPWA, setDismissedPWA] = useState(false)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  // Restricción: Si el usuario no tiene grupos, solo ve Grupos y Reglas
  const isRestricted = !isSuperAdmin && (user?.groupCount === 0 || user?.groupCount === undefined)
  // En la página de lista de grupos, ocultar el nav completo (PARTIDOS, TORNEO, etc.)
  const isGroupsListing = pathname === '/groups' || pathname === '/groups/'
  const isGroupDetail = /^\/groups\/[^/]+/.test(pathname)
  const routeGroupId = isGroupDetail ? pathname.match(/^\/groups\/([^/]+)/)?.[1] : null
  const isProfileRoute = pathname.startsWith('/profile')
  const storedGroupId = typeof window !== 'undefined'
    ? sessionStorage.getItem('lastGroupId') || localStorage.getItem('lastGroupId')
    : null
  const storedCanManageGroup = typeof window !== 'undefined'
    && (sessionStorage.getItem('lastGroupCanManage') === 'true' || localStorage.getItem('lastGroupCanManage') === 'true')
  const currentGroupId = routeGroupId || (isProfileRoute ? storedGroupId : null)
  const fallbackHeaderActions = !isGroupDetail && isProfileRoute && currentGroupId
    ? [
        { id: 'simulator', icon: BarChart3, label: 'Simular', onClick: () => navigate(`/groups/${currentGroupId}?tab=simulador`), isActive: false },
        { id: 'messages', icon: MessageSquare, label: 'Mensajes', onClick: () => navigate(`/groups/${currentGroupId}?tab=messages`), isActive: false },
        ...(storedCanManageGroup && !isSuperAdmin ? [{ id: 'config', icon: Settings, label: 'Ajustes', onClick: () => navigate(`/groups/${currentGroupId}?tab=config`), isActive: false }] : []),
      ]
    : []
  const effectiveHeaderActions = headerActions.length > 0 ? headerActions : fallbackHeaderActions
  const isAdminPanelActive = pathname.startsWith('/admin') || (currentGroupId && new URLSearchParams(search).get('tab') === 'config')

  useEffect(() => {
    if (routeGroupId) {
      sessionStorage.setItem('lastGroupId', routeGroupId)
      localStorage.setItem('lastGroupId', routeGroupId)
    }
  }, [routeGroupId])

  const openAdminPanel = () => {
    if (currentGroupId) {
      navigate(`/groups/${currentGroupId}?tab=config`)
      return
    }
    navigate('/admin', { state: { from: pathname } })
  }

  const openUpgradeFlow = () => {
    if (currentGroupId) {
      navigate(`/groups/${currentGroupId}?upgrade=plans`)
      return
    }
    navigate('/groups?upgrade=plans')
  }
  
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

  // Nav logic:
  // - Inside a group detail → always MAIN_NAV (skip loading flash)
  // - Loading or no groups → RESTRICTED_NAV
  // - Has groups on /groups listing → no nav
  // - Has groups elsewhere → MAIN_NAV
  const filteredNav = currentGroupId
    ? MAIN_NAV
    : loadingProfile
      ? []
      : isRestricted
        ? RESTRICTED_NAV
        : isGroupsListing
          ? []
          : MAIN_NAV


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
          <NavLink to={currentGroupId ? `/groups/${currentGroupId}` : isRestricted ? "/groups" : "/matches"} className="flex items-center gap-3 shrink-0 group">
            <div className="relative">
              <img src="/logo.png" alt="MUNDIAL 2026" className="w-10 md:w-12 h-auto drop-shadow-2xl group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute -inset-2 bg-mundial-gold opacity-0 blur-xl rounded-full group-hover:opacity-20 transition" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg sm:text-xl md:text-2xl text-white leading-none tracking-tight">QUIÉN <span className="text-mundial-gold">GANA</span></span>
              <span className="hidden sm:block text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1">World Cup 2026</span>
            </div>
          </NavLink>

          {/* Nav unificado — nav links + acciones de grupo en un solo pill */}
          {filteredNav.length > 0 && (
            <div className="hidden md:flex items-center">
              <nav className="flex items-center gap-0.5 p-1 rounded-2xl bg-white/5 border border-white/10">
                {filteredNav.map(({ to, label, icon: Icon }) => {
                  const resolvedTo = (to === '/matches' && currentGroupId) ? `/groups/${currentGroupId}`
                    : (to === '/rules' && currentGroupId) ? `/groups/${currentGroupId}?tab=reglas`
                    : to
                  return (
                    <NavLink key={to} to={resolvedTo}
                      className={({ isActive }) => {
                        let active = isActive
                        if (currentGroupId) {
                          const tabParam = new URLSearchParams(search).get('tab')
                          const anyGroupActionActive = effectiveHeaderActions.some(a => a.isActive)
                          if (to === '/matches') {
                            // PARTIDOS activo solo si no hay acción de grupo activa y tab es resultados o sin tab
                            active = !anyGroupActionActive && (!tabParam || tabParam === 'resultados')
                          } else if (to === '/rules') {
                            // REGLAS amarillo solo cuando tab=reglas y ningún botón de grupo activo
                            active = !anyGroupActionActive && tabParam === 'reglas'
                          }
                        }
                        return `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          active
                            ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20'
                            : 'text-zinc-400 hover:text-white hover:bg-white/10'
                        }`
                      }}
                    >
                      <Icon size={13} /> {label}
                    </NavLink>
                  )
                })}
                {/* Botones de grupo (Mensajes, Ajustes) pegados al mismo pill */}
                {effectiveHeaderActions.map(({ id, icon: Icon, label, onClick, isActive, badge }) => (
                  <button
                    key={id}
                    onClick={onClick}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                      ${isActive
                        ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20'
                        : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                  >
                    <Icon size={13} /> {label}
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-mundial-red rounded-full text-[9px] font-black text-white flex items-center justify-center leading-none">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Usuario / Logout (Desktop) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Botón upgrade — solo plan FREE, no admin */}
            {user?.plan === 'FREE' && !isSuperAdmin && (
              <button
                onClick={openUpgradeFlow}
                title="Actualizar a Plan Elite"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#FFD700]/40 bg-[#FFD700]/8 text-[#FFD700] text-[9px] font-black uppercase tracking-widest hover:bg-[#FFD700]/15 hover:border-[#FFD700]/60 transition-all"
              >
                <Crown size={11} />
                Plan Free · Subir
              </button>
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
                {user?.plan === 'DT' && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-mundial-navy" />
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
              <button
                onClick={openAdminPanel}
                className={`hidden md:flex w-10 h-10 items-center justify-center rounded-full transition-all border
                  ${isAdminPanelActive ? 'bg-mundial-gold text-mundial-navy border-mundial-gold' : 'text-zinc-500 hover:text-mundial-gold hover:bg-mundial-gold/10 border-transparent hover:border-mundial-gold/20'}`}
                title={currentGroupId ? 'Ajustes y centro de mando' : 'Centro de mando'}
              >
                <Settings size={20} />
              </button>
            )}

            {/* Botón recordatorios */}
            <button
              onClick={async () => {
                if (notifPerm === 'denied') {
                  import('react-hot-toast').then(({ default: toast }) =>
                    toast.error('Notificaciones bloqueadas. Actívalas en la configuración de tu navegador.', { duration: 4000 })
                  )
                } else if (notifPerm === 'granted') {
                  import('react-hot-toast').then(({ default: toast }) =>
                    toast.success(`Recordatorios activos para ${activeCount} partido${activeCount !== 1 ? 's' : ''} próximo${activeCount !== 1 ? 's' : ''}.`, { duration: 3000 })
                  )
                } else {
                  const perm = await requestPermission()
                  import('react-hot-toast').then(({ default: toast }) => {
                    if (perm === 'granted') toast.success('¡Recordatorios activados! Te avisamos 60 y 15 min antes de cada partido.', { duration: 4000 })
                    else toast.error('Permiso denegado. No podrás recibir recordatorios.', { duration: 3000 })
                  })
                }
              }}
              title={notifPerm === 'granted' ? `Recordatorios activos (${activeCount} partidos)` : notifPerm === 'denied' ? 'Notificaciones bloqueadas' : 'Activar recordatorios de partidos'}
              className={`relative flex w-9 h-9 md:w-10 md:h-10 items-center justify-center rounded-full transition-all border
                ${notifPerm === 'granted'
                  ? 'text-mundial-gold border-mundial-gold/20 bg-mundial-gold/8 hover:bg-mundial-gold/15'
                  : notifPerm === 'denied'
                  ? 'text-zinc-700 border-transparent cursor-not-allowed'
                  : 'text-zinc-500 hover:text-mundial-gold hover:bg-mundial-gold/10 border-transparent hover:border-mundial-gold/20'}`}
            >
              {notifPerm === 'granted'
                ? <BellRing size={18} />
                : notifPerm === 'denied'
                ? <BellOff size={18} />
                : <Bell size={18} />
              }
              {notifPerm === 'granted' && activeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-mundial-gold text-mundial-navy text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                  {activeCount > 9 ? '9+' : activeCount}
                </span>
              )}
            </button>

            <button
              onClick={logout}
              className="flex w-9 h-9 md:w-10 md:h-10 items-center justify-center rounded-full text-zinc-500 hover:text-mundial-red hover:bg-mundial-red/10 transition-all border border-transparent hover:border-mundial-red/20"
              title="Cerrar sesión"
            >
              <LogOut size={18} className="md:hidden" />
              <LogOut size={20} className="hidden md:block" />
            </button>
          </div>
        </div>
      </header>

      {/* Cold-start banner */}
      <AnimatePresence>
        {serverStatus === 'waking' && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-40 bg-amber-900/80 border-b border-amber-600/30 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2"
          >
            <Wifi size={13} className="text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
              Conectando con el servidor — puede tardar unos segundos…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className={`relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 pb-32 md:pb-12 ${isGroupDetail ? 'pt-0' : 'pt-6 md:pt-12'}`}>
        
        {/* Banner — hero grande en /groups, compacto en el resto, ninguno en /admin */}
        {isGroupDetail ? null : pathname.startsWith('/admin') ? null : isGroupsListing ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8 rounded-[1.5rem] bg-white/4 border border-white/5 backdrop-blur-3xl shadow-xl relative overflow-hidden px-6 md:px-8 py-5 md:py-6"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-mundial-gold/5 blur-[80px] -mr-24 -mt-24 pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Texto izquierda — más compacto */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 bg-mundial-gold rounded-full animate-pulse" />
                    <p className="text-[9px] font-black text-mundial-gold uppercase tracking-[0.35em]">
                      Mundial FIFA 2026 · {user?.username}
                    </p>
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl text-white uppercase leading-none tracking-tight">
                    GESTOR DE <span className="text-mundial-gold">GRUPOS</span>
                  </h1>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <PlanBadge plan={user?.plan || 'FREE'} size="sm" />
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                      {user?.plan === 'FREE'    && '1 grupo · 5 miembros'}
                      {user?.plan === 'CLASICO' && '1 grupo · 15 miembros'}
                      {user?.plan === 'DT'      && '3 grupos · 50 miembros'}
                      {user?.plan === 'PRO'     && 'Grupos ilimitados · 150 miembros'}
                    </span>
                    {user?.plan === 'FREE' && !isSuperAdmin && (
                      <NavLink
                        to="/"
                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-mundial-gold hover:text-white transition-colors border border-mundial-gold/30 rounded-full px-2 py-0.5 bg-mundial-gold/5"
                      >
                        <ArrowUp size={8} /> Subir
                      </NavLink>
                    )}
                  </div>
                </div>
              </div>
              {/* Reloj derecha */}
              <div className="shrink-0">
                <CountdownTimer variant="mini" />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-12 flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-mundial-gold/5 blur-[80px] -mr-32 -mt-32" />
            <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
              <div className="w-16 h-16 bg-mundial-navy border border-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:border-mundial-gold/50 transition-colors">
                {pathname === '/leaderboard' ? <Trophy className="text-mundial-gold" /> :
                 pathname === '/tournament'  ? <Star className="text-mundial-gold" /> :
                 <Calendar className="text-mundial-gold" />}
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl text-white leading-tight uppercase tracking-tight">
                  {pathname === '/leaderboard'        ? 'RANKING MUNDIAL' :
                   pathname === '/tournament'         ? 'CUADRO DEL TORNEO' :
                   pathname === '/simulator'          ? 'SIMULADOR' :
                   pathname === '/rules'              ? 'REGLAS' :
                   pathname === '/settings'           ? 'AJUSTES' :
                   pathname.startsWith('/profile')   ? 'PERFIL' :
                   pathname === '/payment-success'    ? 'PAGO CONFIRMADO' :
                   'TUS PRONÓSTICOS'}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="w-2 h-2 bg-mundial-gold rounded-full animate-pulse" />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                    Mundial FIFA 2026 · {user?.username}
                  </p>
                  <PlanBadge plan={user?.plan || 'FREE'} size="md" />
                </div>
              </div>
            </div>
            <div className="relative z-10 w-full md:w-auto">
              <CountdownTimer variant="mini" />
            </div>
          </motion.div>
        )}

        {/* Page Content with Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <ErrorBoundary key={pathname}>
              <Outlet />
            </ErrorBoundary>
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

      {/* PWA install banner — solo móvil, solo cuando el navegador ofrece el prompt */}
      <AnimatePresence>
        {canInstall && !dismissedPWA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-20 md:bottom-6 left-4 right-4 z-[80] md:left-auto md:right-6 md:w-80"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-mundial-navyLight border border-mundial-gold/30 shadow-2xl backdrop-blur-xl">
              <img src="/logo.png" alt="" className="w-10 h-10 object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white leading-tight">Instalar Quién Gana</p>
                <p className="text-[9px] text-zinc-500 leading-tight mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
              </div>
              <button
                onClick={async () => { await install() }}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-mundial-gold text-mundial-navy text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                <Download size={11} /> Instalar
              </button>
              <button onClick={() => setDismissedPWA(true)} className="shrink-0 text-zinc-600 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation (Native-like) */}
      <BottomNav user={user} filteredNav={filteredNav} headerActions={effectiveHeaderActions} />
    </div>
  )
}
