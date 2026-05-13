import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Crown, ArrowRight, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('groupId')

  useEffect(() => {
    // 🔥 Efecto de celebración
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min, max) => Math.random() * (max - min) + min

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()
      if (timeLeft <= 0) return clearInterval(interval)

      const particleCount = 50 * (timeLeft / duration)
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full card p-10 text-center relative overflow-hidden border-mundial-gold/20"
      >
        {/* Background Sparkles */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-mundial-gold to-transparent" />
        
        <div className="mb-8 relative inline-block">
          <motion.div 
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="w-24 h-24 bg-mundial-gold rounded-[2.5rem] flex items-center justify-center text-mundial-navy shadow-2xl shadow-mundial-gold/40"
          >
            <Crown size={48} />
          </motion.div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -right-2 text-mundial-gold"
          >
            <Sparkles size={24} />
          </motion.div>
        </div>

        <h1 className="font-display text-4xl text-white uppercase tracking-tight mb-2">¡LIGA MEJORADA!</h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-8">Gracias por confiar en nuestra plataforma</p>

        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mb-8 text-left">
           <div className="flex items-start gap-4">
              <div className="mt-1 bg-green-500/20 p-1 rounded-full text-green-500">
                 <CheckCircle2 size={18} />
              </div>
              <div>
                 <p className="text-sm text-white font-bold mb-1">Pago Procesado con Éxito</p>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-relaxed">
                   Tu liga ahora tiene el nuevo límite de participantes activo. ¡Invita a todos tus amigos!
                 </p>
              </div>
           </div>
        </div>

        <Link 
          to={groupId ? `/groups/${groupId}` : '/groups'} 
          className="btn-gold w-full py-4 text-xs shadow-2xl flex items-center justify-center gap-3 group"
        >
          VOLVER A MI LIGA <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </div>
  )
}
