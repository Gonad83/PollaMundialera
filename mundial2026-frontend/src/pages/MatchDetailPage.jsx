import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchApi, predictionApi } from '../lib/api'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Minus, Lock, CheckCircle2, Trophy, Star } from 'lucide-react'

export default function MatchDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => matchApi.get(id).then(r => r.data),
  })

  const { data: myPred } = useQuery({
    queryKey: ['prediction', id],
    queryFn: () => predictionApi.forMatch(id).then(r => r.data).catch(() => null),
  })

  const { data: allPreds = [] } = useQuery({
    queryKey: ['all-preds', id],
    queryFn: () => predictionApi.allForMatch(id).then(r => r.data).catch(() => []),
    enabled: match?.status === 'FINISHED',
  })

  const mutation = useMutation({
    mutationFn: (data) => predictionApi.save(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prediction', id] })
      qc.invalidateQueries({ queryKey: ['my-predictions'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const [form, setForm] = useState({
    predHome: 0, predAway: 0,
    predBtts: null, predOverUnder: null, predPenalties: null,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (myPred) {
      setForm({
        predHome: myPred.predHome ?? 0,
        predAway: myPred.predAway ?? 0,
        predBtts: myPred.predBtts,
        predOverUnder: myPred.predOverUnder,
        predPenalties: myPred.predPenalties,
      })
    }
  }, [myPred])

  if (isLoading) return <Skeleton />
  if (!match) return <p className="text-zinc-500">Partido no encontrado</p>

  const { teamHome, teamAway, dateUtc, status, scoreHome, scoreAway, phase } = match
  const deadline = new Date(new Date(dateUtc).getTime() - 5 * 60 * 1000)
  const isLocked = isAfter(new Date(), deadline)
  const isFinished = status === 'FINISHED'
  const isElim = !['GROUP'].includes(phase)

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (isLocked) return
    mutation.mutate(form)
  }

  const setScore = (side, delta) => {
    if (isLocked) return
    const key = side === 'home' ? 'predHome' : 'predAway'
    setForm(f => ({ ...f, [key]: Math.max(0, Math.min(20, f[key] + delta)) }))
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto pb-32 px-4"
    >
      {/* Back Navigation */}
      <Link to="/matches" className="inline-flex items-center gap-2 text-zinc-500 hover:text-mundial-gold transition-colors mb-6 group">
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-mundial-gold/10">
          <ChevronLeft size={18} />
        </div>
        <span className="text-sm font-bold uppercase tracking-widest">Atrás</span>
      </Link>

      {/* Match Info Card */}
      <div className="card p-8 mb-6 relative overflow-hidden border-b-2 border-b-mundial-gold/20">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
            status === 'LIVE' 
              ? 'bg-mundial-red/10 text-mundial-red border-mundial-red/20' 
              : status === 'FINISHED' 
                ? 'bg-white/10 text-zinc-400 border-white/10' 
                : 'bg-mundial-gold/10 text-mundial-gold border-mundial-gold/20'
          }`}>
            {status === 'LIVE' && <span className="w-2 h-2 bg-mundial-red rounded-full inline-block animate-pulse mr-2" />}
            {status === 'LIVE' ? 'En Vivo' : status === 'FINISHED' ? 'Finalizado' : 'Próximo'}
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            {phase === 'GROUP' ? `Fase de Grupos • ${match.groupLetter}` : phase}
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-8 relative z-10">
          {/* Home */}
          <div className="flex-1 text-center">
            <motion.div whileHover={{ scale: 1.05 }} className="flex justify-center mb-4">
              <TeamFlag team={teamHome} size="lg" />
            </motion.div>
            <p className="font-display text-2xl text-white leading-tight">{teamHome?.name}</p>
          </div>

          {/* Results / Time */}
          <div className="space-y-2 text-center min-w-[120px]">
             {isFinished || status === 'LIVE' ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="score-box text-3xl w-16 h-16">{scoreHome}</div>
                  <div className="score-box text-3xl w-16 h-16">{scoreAway}</div>
                </div>
             ) : (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="font-display text-3xl text-white">{format(new Date(dateUtc), 'HH:mm')}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                    {format(new Date(dateUtc), "d MMM", { locale: es })}
                  </p>
                </div>
             )}
          </div>

          {/* Away */}
          <div className="flex-1 text-center">
            <motion.div whileHover={{ scale: 1.05 }} className="flex justify-center mb-4">
              <TeamFlag team={teamAway} size="lg" />
            </motion.div>
            <p className="font-display text-2xl text-white leading-tight">{teamAway?.name}</p>
          </div>
        </div>
      </div>

      {/* Betting Section */}
      {!isFinished && (
        <div className="card p-8 mb-6 border-t border-t-white/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl text-white flex items-center gap-3">
              <Trophy size={24} className="text-mundial-gold" />
              TU PRONÓSTICO
            </h2>
            <AnimatePresence>
              {isLocked ? (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="badge-red px-3 py-1 flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <Lock size={12} /> Mercado Cerrado
                </motion.span>
              ) : myPred ? (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="badge-green px-3 py-1 flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <CheckCircle2 size={12} /> Pronóstico Registrado
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          {isLocked ? (
            <div className="bg-white/5 rounded-2xl p-10 border border-white/5 text-center">
              {myPred ? (
                <div className="space-y-4">
                   <p className="text-zinc-500 text-xs uppercase tracking-widest">Tu apuesta final fue</p>
                   <p className="font-display text-6xl text-white">
                      {myPred.predHome} <span className="text-mundial-gold mx-2">–</span> {myPred.predAway}
                   </p>
                </div>
              ) : (
                <p className="text-zinc-500 font-medium">No se registró pronóstico para este encuentro.</p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Massive Score Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Home Control */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-widest">{teamHome?.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">GOLES</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setScore('home', -1)} className="btn-control"><Minus size={20}/></button>
                    <input 
                      type="number" 
                      className="score-input flex-1 h-16 text-3xl"
                      value={form.predHome}
                      readOnly
                    />
                    <button onClick={() => setScore('home', 1)} className="btn-control"><Plus size={20}/></button>
                  </div>
                </div>

                {/* Away Control */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-widest">{teamAway?.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">GOLES</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setScore('away', -1)} className="btn-control"><Minus size={20}/></button>
                    <input 
                      type="number" 
                      className="score-input flex-1 h-16 text-3xl"
                      value={form.predAway}
                      readOnly
                    />
                    <button onClick={() => setScore('away', 1)} className="btn-control"><Plus size={20}/></button>
                  </div>
                </div>
              </div>

              {/* Bonus Toggle Section */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                 <p className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-widest mb-2">Bonificadores Especiales</p>
                 <div className="grid gap-3">
                    <ToggleBet 
                      label="¿Marcan ambos?"
                      bonus="+1 pt"
                      value={form.predBtts}
                      onChange={v => setForm(f => ({ ...f, predBtts: v }))}
                      options={[{v:true, l:'Sí'}, {v:false, l:'No'}]}
                    />
                    <ToggleBet 
                      label="Total Goles (+2.5)"
                      bonus="+1 pt"
                      value={form.predOverUnder}
                      onChange={v => setForm(f => ({ ...f, predOverUnder: v }))}
                      options={[{v:'over', l:'Más'}, {v:'under', l:'Menos'}]}
                    />
                    {isElim && (
                      <ToggleBet 
                        label="¿Habrá Penales?"
                        bonus="+3 pts"
                        value={form.predPenalties}
                        onChange={v => setForm(f => ({ ...f, predPenalties: v }))}
                        options={[{v:true, l:'Sí'}, {v:false, l:'No'}]}
                      />
                    )}
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Action Bar (Functional) */}
      {!isLocked && !isFinished && (
        <div className="fixed bottom-20 md:bottom-0 left-0 right-0 p-4 bg-mundial-navy/80 backdrop-blur-xl border-t border-white/10 z-[60] flex justify-center">
           <div className="max-w-2xl w-full">
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit} 
              disabled={mutation.isPending}
              className={`btn-gold w-full py-4 text-lg justify-center shadow-2xl transition-all ${saved ? 'bg-field-500 text-white' : ''}`}
            >
              {saved ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={24} /> ¡GUARDADO CON ÉXITO!
                </span>
              ) : mutation.isPending ? (
                'PROCESANDO...'
              ) : (
                'CONFIRMAR PRONÓSTICO'
              )}
            </motion.button>
           </div>
        </div>
      )}

      {/* Post-Match Summary */}
      {isFinished && myPred && (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`card p-8 mb-6 border-2 ${myPred.pointsTotal > 0 ? 'border-mundial-gold/30 bg-mundial-gold/5' : 'border-white/5'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-white">TU RESULTADO</h2>
            {myPred.pointsTotal > 0 && <Star className="text-mundial-gold animate-pulse" />}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Apostaste</p>
                <p className="font-display text-3xl text-white">{myPred.predHome} – {myPred.predAway}</p>
             </div>
             <div className="bg-mundial-gold/10 rounded-2xl p-4 border border-mundial-gold/20 text-center relative overflow-hidden">
                <p className="text-[10px] text-mundial-gold uppercase tracking-widest mb-1 relative z-10">Puntos Ganados</p>
                <p className="font-display text-4xl text-white relative z-10">+{myPred.pointsTotal}</p>
                {myPred.pointsTotal >= 5 && <Trophy size={40} className="absolute -bottom-2 -right-2 text-mundial-gold/10 rotate-12" />}
             </div>
          </div>

          {myPred.pointsTotal > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
               {myPred.pointsExact > 0 && <span className="px-3 py-1 bg-mundial-gold text-mundial-navy rounded-full text-[10px] font-bold uppercase tracking-widest">🔥 Marcador Exacto</span>}
               {myPred.pointsWinner > 0 && <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">✓ Ganador Correcto</span>}
               {myPred.pointsBonus > 0 && <span className="px-3 py-1 bg-mundial-red text-white rounded-full text-[10px] font-bold uppercase tracking-widest">⭐ Bonus +{myPred.pointsBonus}</span>}
            </div>
          )}
        </motion.div>
      )}

      {/* Global Predictions Community */}
      {isFinished && allPreds.length > 0 && (
        <div className="card p-8">
          <h2 className="font-display text-xl text-white mb-6 uppercase tracking-widest">Comunidad ({allPreds.length})</h2>
          <div className="space-y-3">
            {allPreds.slice(0, 15).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-mundial-navyLight flex items-center justify-center text-xs font-bold text-mundial-gold border border-white/10">
                    {p.user?.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-zinc-300">{p.user?.username}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-lg text-white">{p.predHome}–{p.predAway}</span>
                  <span className={`w-12 text-right font-mono text-xs font-bold ${p.pointsTotal > 0 ? 'text-mundial-gold' : 'text-zinc-600'}`}>
                    +{p.pointsTotal} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function ToggleBet({ label, bonus, options, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-white">{label}</span>
        <span className="text-[10px] text-mundial-gold font-mono uppercase tracking-widest leading-none mt-0.5">{bonus}</span>
      </div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(value === opt.v ? null : opt.v)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
              value === opt.v
                ? 'bg-mundial-gold text-mundial-navy border-mundial-gold'
                : 'bg-white/5 text-zinc-500 border-transparent'
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse p-4">
      <div className="h-48 card bg-white/5" />
      <div className="h-64 card bg-white/5" />
    </div>
  )
}

function TeamFlag({ team, size = 'md' }) {
  const flag = team?.flagUrl
  const cls = size === 'lg' ? 'w-20 h-16' : size === 'sm' ? 'w-6 h-5' : 'w-10 h-8'
  if (flag && (flag.startsWith('http') || flag.startsWith('/'))) {
    return (
      <img
        src={flag}
        alt={team?.name || ''}
        className={`${cls} object-contain drop-shadow-2xl`}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return <span className={size === 'lg' ? 'text-5xl' : 'text-2xl'}>{flag || '🏴'}</span>
}
