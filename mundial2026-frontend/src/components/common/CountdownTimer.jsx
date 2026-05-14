import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const WORLD_CUP_DATE = new Date('2026-06-11T15:00:00Z')

const getTimeLeft = () => {
  const diff = WORLD_CUP_DATE - new Date()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s }
}

export default function CountdownTimer({ variant = 'full' }) {
  const [time, setTime] = useState(getTimeLeft())

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!time) return null

  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-4 px-5 py-3 bg-mundial-navyLight/50 border border-white/10 rounded-2xl backdrop-blur-md group hover:border-mundial-gold/30 transition-colors shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] font-extrabold text-mundial-gold tracking-[0.2em] uppercase leading-none mb-1">Mundial en:</span>
          <div className="flex items-center gap-1 font-display text-xl text-white tabular-nums">
            <Digit value={time.d} label="d" />
            <span className="text-zinc-600 font-sans">:</span>
            <Digit value={time.h} label="h" />
            <span className="text-zinc-600 font-sans">:</span>
            <Digit value={time.m} label="m" />
            <span className="text-zinc-600 font-sans">:</span>
            <Digit value={time.s} label="s" color="text-mundial-gold" />
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'hero') {
    const units = [
      { v: time.d, l: 'Días' },
      { v: time.h, l: 'Horas' },
      { v: time.m, l: 'Mins' },
      { v: time.s, l: 'Segs' },
    ]
    return (
      <div className="flex items-end gap-3 md:gap-5">
        {units.map(({ v, l }, i) => (
          <div key={l} className="flex items-end gap-3 md:gap-5">
            <div className="flex flex-col items-center">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={v}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  className="font-display text-5xl md:text-6xl text-white tabular-nums leading-none"
                >
                  {String(v).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
              <span className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black mt-1">{l}</span>
            </div>
            {i < 3 && <span className="font-display text-4xl md:text-5xl text-mundial-gold/40 leading-none pb-5">:</span>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex justify-center gap-4 md:gap-8">
      {[
        { v: time.d, l: 'Días' },
        { v: time.h, l: 'Horas' },
        { v: time.m, l: 'Minutos' },
        { v: time.s, l: 'Segundos' }
      ].map(t => (
        <div key={t.l} className="flex flex-col items-center">
          <div className="w-16 h-20 md:w-24 md:h-28 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-2 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-mundial-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <AnimatePresence mode="popLayout">
              <motion.span
                key={t.v}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="text-4xl md:text-6xl font-display text-white tabular-nums relative z-10"
              >
                {String(t.v).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-[10px] md:text-xs uppercase text-zinc-500 font-bold tracking-[0.3em]">{t.l}</span>
        </div>
      ))}
    </div>
  )
}

function Digit({ value, label, color = 'text-white' }) {
  return (
    <span className={color}>
      {String(value).padStart(2, '0')}
      <span className="text-[10px] text-zinc-500 ml-0.5 lowercase font-sans">{label}</span>
    </span>
  )
}
