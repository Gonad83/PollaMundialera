import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Calendar, Trophy, BarChart3, Users, BookOpen, Settings, Shuffle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BottomNav({ user, filteredNav, headerActions = [] }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const currentGroupId = pathname.match(/^\/groups\/([^/]+)/)?.[1]
  const hasItems = filteredNav.length > 0 || user?.role === 'SUPER_ADMIN' || headerActions.length > 0
  if (!hasItems) return null

  const openAdminPanel = () => {
    if (currentGroupId) {
      navigate(`/groups/${currentGroupId}?tab=config`)
      return
    }
    navigate('/admin', { state: { from: pathname } })
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-mundial-navy/80 backdrop-blur-2xl border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {filteredNav.map(({ to, label }) => {
          const Icon = getIcon(label)
          const isSim = to === '/simulator'
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 transition-all relative ${
                  isActive ? 'text-mundial-gold' : isSim ? 'text-mundial-gold/50' : 'text-zinc-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isSim && !isActive && (
                    <span className="absolute -top-1 -right-0.5 w-1.5 h-1.5 bg-mundial-gold rounded-full animate-pulse" />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2.5 : isSim ? 2 : 2} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomTab"
                      className="absolute -top-2 w-8 h-1 bg-mundial-gold rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}

        {/* Header Actions (Simular, Mensajes, Ajustes) — Mobile only */}
        {headerActions.map(({ id, icon: Icon, label, onClick, isActive, badge }) => (
          <button
            key={id}
            onClick={onClick}
            className={`relative flex flex-col items-center gap-1 p-2 transition-all ${
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

        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={openAdminPanel}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${
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
    case 'torneo':    return Trophy
    case 'ranking':   return BarChart3
    case 'grupos':    return Users
    case 'simulador': return Shuffle
    case 'reglas':    return BookOpen
    default:          return Calendar
  }
}
