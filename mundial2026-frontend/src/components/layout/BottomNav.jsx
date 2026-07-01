import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Calendar, Trophy, BarChart3, Users, BookOpen, Settings, Shuffle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BottomNav({ user, filteredNav, headerActions = [] }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const routeGroupId = pathname.match(/^\/groups\/([^/]+)/)?.[1]
  const storedGroupId = sessionStorage.getItem('lastGroupId') || localStorage.getItem('lastGroupId')
  const currentGroupId = routeGroupId || (pathname.startsWith('/profile') ? storedGroupId : null)
  const primaryNav = routeGroupId
    ? filteredNav.filter(({ to }) => to === '/rules')
    : filteredNav
  const showTournamentPick = !!currentGroupId && !routeGroupId
  const visibleHeaderActions = routeGroupId
    ? headerActions.filter(action => action.id !== 'compare')
    : headerActions
  const groupBottomActions = routeGroupId
    ? [
        { id: 'simulador', label: 'Simular', tab: 'simulador', icon: Shuffle },
        { id: 'liga', label: 'Liga', tab: 'liga', icon: Users },
      ]
    : []
  const hasItems = primaryNav.length > 0 || showTournamentPick || groupBottomActions.length > 0 || user?.role === 'SUPER_ADMIN' || visibleHeaderActions.length > 0
  if (!hasItems) return null
  const showGlobalAdmin = user?.role === 'SUPER_ADMIN' && !visibleHeaderActions.some(a => a.id === 'config')
  const tabParam = new URLSearchParams(search).get('tab')
  const anyGroupActionActive = visibleHeaderActions.some(a => a.isActive)

  const openAdminPanel = () => {
    if (currentGroupId) {
      navigate(`/groups/${currentGroupId}?tab=config`)
      return
    }
    navigate('/admin', { state: { from: pathname } })
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-6 pt-2 bg-mundial-navy/80 backdrop-blur-2xl border-t border-white/10 safe-area-bottom">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-lg mx-auto">
        {primaryNav.map(({ to, label }) => {
          const Icon = getIcon(label)
          const isSim = to === '/simulator'
          const resolvedTo = (to === '/matches' && currentGroupId) ? `/groups/${currentGroupId}`
            : (to === '/rules' && currentGroupId) ? `/groups/${currentGroupId}?tab=reglas`
            : to
          const itemActive = currentGroupId
            ? (to === '/matches'
                ? !anyGroupActionActive && (!tabParam || tabParam === 'resultados')
                : to === '/rules'
                  ? !anyGroupActionActive && tabParam === 'reglas'
                  : pathname.startsWith(to))
            : pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={resolvedTo}
              className={`min-w-[72px] flex flex-col items-center gap-1 px-2 py-2 transition-all relative ${
                itemActive ? 'text-mundial-gold' : isSim ? 'text-mundial-gold/50' : 'text-zinc-500'
              }`}
            >
              {isSim && !itemActive && (
                <span className="absolute -top-1 -right-0.5 w-1.5 h-1.5 bg-mundial-gold rounded-full animate-pulse" />
              )}
              <Icon size={20} strokeWidth={itemActive ? 2.5 : isSim ? 2 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
              {itemActive && (
                <motion.div
                  layoutId="bottomTab"
                  className="absolute -top-2 w-8 h-1 bg-mundial-gold rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                />
              )}
            </NavLink>
          )
        })}

        {/* Header Actions (Simular, Mensajes, Ajustes) — Mobile only */}
        {showTournamentPick && (
          <button
            onClick={() => navigate(`/groups/${currentGroupId}?tab=premios`)}
            className={`relative min-w-[72px] flex flex-col items-center gap-1 px-2 py-2 transition-all shrink-0 ${
              tabParam === 'premios' ? 'text-mundial-gold' : 'text-zinc-500'
            }`}
          >
            <Trophy size={20} strokeWidth={tabParam === 'premios' ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Torneo</span>
            {tabParam === 'premios' && (
              <motion.div
                layoutId="bottomTab"
                className="absolute -top-2 w-8 h-1 bg-mundial-gold rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]"
              />
            )}
          </button>
        )}

        {/* Divisor: separa navegación principal de las herramientas del grupo */}
        {groupBottomActions.map(({ id, label, tab, icon: Icon }) => {
          const isActive = tabParam === tab
          return (
            <button
              key={id}
              onClick={() => navigate(`/groups/${routeGroupId}?tab=${tab}`)}
              className={`relative min-w-[72px] flex flex-col items-center gap-1 px-2 py-2 transition-all shrink-0 ${
                isActive ? 'text-mundial-gold' : 'text-zinc-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomTab"
                  className="absolute -top-2 w-8 h-1 bg-mundial-gold rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                />
              )}
            </button>
          )
        })}

        {visibleHeaderActions.length > 0 && (
          <span className="self-center h-7 w-px bg-white/10 shrink-0 mx-0.5" aria-hidden="true" />
        )}

        {visibleHeaderActions.map(({ id, icon: Icon, label, onClick, isActive, badge }) => (
          <button
            key={id}
            onClick={onClick}
            className={`relative min-w-[72px] flex flex-col items-center gap-1 px-2 py-2 transition-all shrink-0 ${
              isActive ? 'text-mundial-gold' : 'text-zinc-500'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-0.5 bg-mundial-red rounded-full text-[8px] font-black text-white flex items-center justify-center leading-none">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="bottomTab"
                className="absolute -top-2 w-8 h-1 bg-mundial-gold rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]"
              />
            )}
          </button>
        ))}

        {showGlobalAdmin && (
          <button
            onClick={openAdminPanel}
            className={`min-w-[72px] flex flex-col items-center gap-1 px-2 py-2 transition-all shrink-0 ${
              pathname.startsWith('/admin') || new URLSearchParams(search).get('tab') === 'config'
                ? 'text-mundial-gold'
                : 'text-zinc-500'
            }`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Admin</span>
          </button>
        )}
      </div>
    </nav>
  )
}

function getIcon(label) {
  switch (label.toLowerCase()) {
    case 'partidos':  return Calendar
    case 'pronósticos':
    case 'pronosticos': return Calendar
    case 'torneo':    return Trophy
    case 'ranking':   return BarChart3
    case 'grupos':    return Users
    case 'simulador': return Shuffle
    case 'reglas':    return BookOpen
    default:          return Calendar
  }
}
