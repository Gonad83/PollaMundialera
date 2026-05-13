import { NavLink } from 'react-router-dom'
import { Calendar, Trophy, BarChart3, Users, BookOpen, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BottomNav({ user, filteredNav }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-mundial-navy/80 backdrop-blur-2xl border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {filteredNav.map(({ to, label }) => {
          const Icon = getIcon(label)
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => 
                `flex flex-col items-center gap-1 p-2 transition-all relative ${
                  isActive ? 'text-mundial-gold' : 'text-zinc-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
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
        {user?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 p-2 transition-all ${
                isActive ? 'text-mundial-gold' : 'text-zinc-500'
              }`
            }
          >
            <Settings size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Admin</span>
          </NavLink>
        )}
      </div>
    </nav>
  )
}

function getIcon(label) {
  switch (label.toLowerCase()) {
    case 'partidos': return Calendar
    case 'torneo': return Trophy
    case 'ranking': return BarChart3
    case 'grupos': return Users
    case 'reglas': return BookOpen
    default: return Calendar
  }
}
