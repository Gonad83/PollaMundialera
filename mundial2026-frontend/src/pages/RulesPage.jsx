import { motion } from 'framer-motion'
import { Clock, Trophy, Star, Lock, CalendarDays, AlertTriangle, CheckCircle2, Zap, ShieldCheck, Target } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
}

export default function RulesPage() {
  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-8">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-mundial-navy to-mundial-navyLight border border-mundial-gold/20"
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-mundial-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[10px] font-black text-mundial-gold uppercase tracking-[0.3em] bg-mundial-gold/10 px-3 py-1 rounded-full border border-mundial-gold/20">
            📖 Guía completa
          </span>
          <h1 className="font-display text-4xl text-white uppercase tracking-tight mt-4 mb-2">
            CÓMO <span className="text-mundial-gold">JUGAR</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
            Acumula puntos pronosticando partidos y el desarrollo del Mundial. Aquí te explicamos
            <strong className="text-white"> qué pronosticar</strong> y
            <strong className="text-white"> hasta cuándo</strong> puedes hacerlo.
          </p>
        </div>
      </motion.div>

      {/* ── BLOQUE 1: CUÁNDO PRONOSTICAR ───────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <SectionTitle icon={<Clock size={18} />} label="CUÁNDO PRONOSTICAR" color="text-blue-400" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

          {/* Pronósticos del torneo */}
          <motion.div variants={fadeUp} custom={0}
            className="rounded-2xl p-5 bg-gradient-to-br from-mundial-gold/10 to-mundial-gold/5 border border-mundial-gold/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-mundial-gold/20 flex items-center justify-center">
                <Trophy size={16} className="text-mundial-gold" />
              </div>
              <span className="text-xs font-black text-mundial-gold uppercase tracking-widest">Pronósticos del Torneo</span>
            </div>
            <p className="text-white font-bold text-sm mb-2">Antes del primer partido</p>
            <p className="text-zinc-400 text-xs leading-relaxed mb-3">
              Tienes que elegir campeón, finalistas, semifinalistas y más
              <strong className="text-white"> antes de que comience el Mundial</strong>.
              Una vez pitado el primer partido, estos pronósticos se bloquean para siempre.
            </p>
            <div className="flex items-center gap-2 bg-mundial-gold/10 rounded-xl px-3 py-2 border border-mundial-gold/20">
              <AlertTriangle size={12} className="text-mundial-gold shrink-0" />
              <span className="text-[10px] font-black text-mundial-gold uppercase tracking-wider">
                ⏰ Fecha límite: 11 Sep 2026, antes del 1er partido
              </span>
            </div>
          </motion.div>

          {/* Pronósticos por partido */}
          <motion.div variants={fadeUp} custom={1}
            className="rounded-2xl p-5 bg-gradient-to-br from-white/5 to-white/3 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <CalendarDays size={16} className="text-zinc-300" />
              </div>
              <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">Pronósticos por Partido</span>
            </div>
            <p className="text-white font-bold text-sm mb-2">Hasta 5 minutos antes de cada partido</p>
            <p className="text-zinc-400 text-xs leading-relaxed mb-3">
              Para cada partido puedes ingresar o modificar tu pronóstico
              <strong className="text-white"> hasta 5 minutos antes del pitazo inicial</strong>.
              Pasado ese tiempo, el mercado se cierra automáticamente.
            </p>
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
              <Lock size={12} className="text-zinc-400 shrink-0" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                🔒 Se bloquea 5 min antes del pitazo
              </span>
            </div>
          </motion.div>
        </div>

        {/* Timeline visual */}
        <motion.div variants={fadeUp} custom={2}
          className="mt-4 rounded-2xl p-5 bg-white/3 border border-white/8"
        >
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">📅 Línea de tiempo</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
            {[
              { icon: '🎯', label: 'Pronosticas el torneo', sub: 'Campeón, finalistas...', color: 'bg-mundial-gold', active: true },
              { icon: '⚽', label: 'Inicio del Mundial', sub: '11 Sep 2026', color: 'bg-mundial-red', active: true },
              { icon: '🔒', label: 'Cierre por partido', sub: '5 min antes c/partido', color: 'bg-zinc-600', active: false },
              { icon: '🏆', label: 'Final del Mundial', sub: 'Resultados definitivos', color: 'bg-green-600', active: false },
            ].map((item, i, arr) => (
              <div key={i} className="flex sm:flex-col items-start sm:items-center flex-1 relative">
                <div className="flex sm:flex-col items-center gap-2 sm:gap-1 w-full">
                  <div className={`w-9 h-9 rounded-full ${item.color} flex items-center justify-center text-base shrink-0 shadow-lg`}>
                    {item.icon}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex-1 h-0.5 sm:hidden bg-white/10 mx-1" />
                  )}
                </div>
                <div className="sm:text-center mt-1 ml-3 sm:ml-0 sm:mt-2 pb-4 sm:pb-0">
                  <p className="text-xs font-black text-white">{item.label}</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{item.sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden sm:block absolute top-4 left-1/2 w-full h-0.5 bg-white/10" style={{ transform: 'translateX(50%)' }} />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* ── BLOQUE 2: QUÉ PRONOSTICAR ANTES DEL MUNDIAL ───────── */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <SectionTitle icon={<Trophy size={18} />} label="PRONÓSTICOS DEL TORNEO (antes del 1er partido)" color="text-mundial-gold" />

        <div className="mt-4 rounded-2xl border border-mundial-gold/20 overflow-hidden">
          <div className="bg-mundial-gold/10 px-5 py-3 border-b border-mundial-gold/20 flex items-center gap-2">
            <AlertTriangle size={14} className="text-mundial-gold" />
            <p className="text-[10px] font-black text-mundial-gold uppercase tracking-widest">
              Solo puedes modificarlos hasta que empiece el primer partido del Mundial
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { icon: '🥇', label: 'Campeón del mundo',           pts: 30, hot: true },
              { icon: '🥈', label: 'Finalista (cada uno)',        pts: 15 },
              { icon: '⬆️', label: 'Semifinalista (cada uno)',    pts: 8  },
              { icon: '📋', label: 'Cuartofinalista (cada uno)',  pts: 4  },
              { icon: '🗂️', label: 'Clasificado 2da ronda (c/u)', pts: 1  },
              { icon: '👟', label: 'Goleador del torneo',         pts: 20, hot: true },
              { icon: '⭐', label: 'Balón de Oro (mejor jugador)',pts: 15 },
              { icon: '🧤', label: 'Guante de Oro (mejor portero)',pts: 12 },
              { icon: '🌟', label: 'Mejor joven del torneo',      pts: 10 },
              { icon: '⚽', label: 'Total de goles (exacto)',     pts: 8  },
              { icon: '💥', label: 'Equipo más goleador',         pts: 6  },
              { icon: '🛡️', label: 'Equipo menos goleado',        pts: 6  },
            ].map((row, i) => (
              <motion.div key={i} variants={fadeUp} custom={i * 0.5}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                  ${row.hot ? 'bg-mundial-gold/8 border-mundial-gold/20' : 'bg-white/3 border-white/5'}`}
              >
                <span className="text-sm text-zinc-300 flex items-center gap-2">
                  <span>{row.icon}</span>
                  <span>{row.label}</span>
                  {row.hot && <Zap size={10} className="text-mundial-gold" fill="currentColor" />}
                </span>
                <span className={`font-display text-base shrink-0 ml-3 ${row.hot ? 'text-mundial-gold' : 'text-zinc-400'}`}>
                  {row.pts} pts
                </span>
              </motion.div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-white/5 bg-white/2">
            <p className="text-[10px] text-zinc-600">
              * Si aciertas el equipo del goleador/Balón de Oro/Guante de Oro pero no el jugador exacto, obtienes 3–4 pts.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── BLOQUE 3: PUNTOS POR PARTIDO ──────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <SectionTitle icon={<Target size={18} />} label="PUNTOS POR CADA PARTIDO" color="text-zinc-200" />
        <p className="text-zinc-500 text-xs mt-1 mb-4">
          Para cada partido puedes pronosticar el marcador y opciones bonus. Puedes cambiarlos
          <strong className="text-white"> hasta 5 minutos antes del pitazo</strong>.
        </p>
        <p className="text-[10px] text-mundial-gold font-black uppercase tracking-widest mb-4">
          El marcador que suma puntos es solo el de los 90 min. Alargue no cuenta; penales van como bonus aparte.
        </p>
        <div className="space-y-3">
          <ScoreRow pts={5} color="gold"  icon="🔥" title="Resultado Exacto"         desc="Aciertas el marcador exacto · ej: Argentina 2–1 Brasil" />
          <ScoreRow pts={2} color="green" icon="✓"  title="Ganador o Empate"         desc="Aciertas quién gana o si empata, pero no el marcador exacto" />
          <ScoreRow pts={1} color="blue"  icon="⚽" title="Ambos Anotan (BTTS)"      desc="Aciertas si ambos equipos marcan al menos un gol" />
          <ScoreRow pts={1} color="blue"  icon="📊" title="Over/Under 2.5 goles"     desc="Aciertas si habrá más o menos de 2.5 goles en el partido" />
          <ScoreRow pts={1} color="blue"  icon="🥅" title="Penales (Eliminatoria)"   desc="Aciertas si el partido se definirá en tanda de penales; no cambia el marcador de 90 min" />
        </div>
      </motion.section>

      {/* ── BLOQUE 4: BONIFICACIONES ──────────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <SectionTitle icon={<Zap size={18} />} label="BONIFICACIONES ESPECIALES" color="text-orange-400" />
        <div className="mt-4 space-y-3">
          <ScoreRow pts={5} color="orange" icon="🔥" title="Racha de 3 Exactos"
            desc="¡Bonus si aciertas el marcador exacto en 3 partidos consecutivos!" />
        </div>
      </motion.section>

      {/* ── BLOQUE 5: RESUMEN RÁPIDO ──────────────────────────── */}
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="rounded-2xl p-6 bg-white/3 border border-white/8"
      >
        <h3 className="font-display text-lg text-white uppercase tracking-tight mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-mundial-gold" /> RESUMEN RÁPIDO
        </h3>
        <ul className="space-y-3">
          {[
            { icon: CheckCircle2, color: 'text-mundial-gold', text: 'Los pronósticos del torneo (campeón, goleador, etc.) debes hacerlos ANTES del primer partido del Mundial (11 Sep 2026).' },
            { icon: CheckCircle2, color: 'text-green-400',     text: 'Para cada partido, puedes registrar o cambiar tu pronóstico hasta 5 minutos antes del pitazo inicial.' },
            { icon: CheckCircle2, color: 'text-mundial-gold',  text: 'Para puntuar partidos se usa el marcador de los 90 minutos. Si hay alargue o penales, eso no modifica el resultado base.' },
            { icon: CheckCircle2, color: 'text-blue-400',      text: 'Si no marcas un pronóstico antes del cierre, ese partido contará 0 puntos para ti.' },
            { icon: Lock,         color: 'text-zinc-500',      text: 'Una vez cerrado el mercado, no se puede modificar nada. ¡No te quedes sin pronosticar!' },
          ].map(({ icon: Icon, color, text }, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
              <Icon size={16} className={`${color} shrink-0 mt-0.5`} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </motion.div>

    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SectionTitle({ icon, label, color }) {
  return (
    <div className={`flex items-center gap-2 mb-1 ${color}`}>
      {icon}
      <h2 className="font-display text-xl uppercase tracking-tight">{label}</h2>
    </div>
  )
}

function ScoreRow({ pts, color, icon, title, desc }) {
  const styles = {
    gold:   { wrap: 'bg-mundial-gold/8  border-mundial-gold/25',  pts: 'text-mundial-gold',  badge: 'bg-mundial-gold/15  text-mundial-gold' },
    green:  { wrap: 'bg-green-900/20    border-green-700/30',     pts: 'text-green-400',     badge: 'bg-green-900/30    text-green-400' },
    blue:   { wrap: 'bg-blue-900/20     border-blue-700/30',      pts: 'text-blue-400',      badge: 'bg-blue-900/30     text-blue-400' },
    orange: { wrap: 'bg-orange-900/20   border-orange-700/30',    pts: 'text-orange-400',    badge: 'bg-orange-900/30   text-orange-400' },
  }
  const s = styles[color] || styles.blue
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${s.wrap}`}>
      <div className={`shrink-0 w-14 h-12 rounded-xl flex flex-col items-center justify-center ${s.badge}`}>
        <span className={`font-display text-xl leading-none ${s.pts}`}>{pts}</span>
        <span className={`text-[9px] font-black uppercase tracking-widest ${s.pts} opacity-70`}>pts</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-white flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
