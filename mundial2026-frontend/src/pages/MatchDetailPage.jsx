import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchApi, predictionApi, groupApi } from '../lib/api'
import { teamFlagUrl } from '../lib/teams'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

const TZ = 'America/Santiago'
const fmtChileTime = (d) => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: TZ, hour12: false })
const fmtChileDate = (d) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', timeZone: TZ })
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Minus, Lock, CheckCircle2, Trophy, Star, Clock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const isFriendlyMatch = (match) =>
  match?.phase === 'GROUP' && !match?.groupLetter && match?.city !== 'World'

function buildPointBreakdown(pred, match) {
  if (!pred || !match) return []

  const rows = []
  const multiplier = match.phase === 'GROUP' ? 1 : 1.5
  const baseBeforeMultiplier = (pred.pointsExact || 0) + (pred.pointsWinner || 0)
  const baseAfterMultiplier = Math.round(baseBeforeMultiplier * multiplier)

  if ((pred.pointsExact || 0) >= 5) {
    rows.push({
      title: 'Marcador exacto',
      detail: `Tu pronostico fue ${pred.predHome}-${pred.predAway} y el resultado real fue el mismo.`,
      points: pred.pointsExact,
      tone: 'gold',
    })
  } else if ((pred.pointsExact || 0) >= 3) {
    rows.push({
      title: 'Diferencia exacta',
      detail: `No fue el marcador exacto, pero acertaste el ganador y la diferencia de goles.`,
      points: pred.pointsExact,
      tone: 'blue',
    })
  } else if ((pred.pointsWinner || 0) > 0) {
    rows.push({
      title: 'Ganador correcto',
      detail: `Acertaste quien ganaba o que el partido terminaba empatado.`,
      points: pred.pointsWinner,
      tone: 'green',
    })
  } else {
    rows.push({
      title: 'Marcador y ganador',
      detail: `Tu pronostico fue ${pred.predHome}-${pred.predAway}; el resultado real fue ${match.scoreHome}-${match.scoreAway}.`,
      points: 0,
      tone: 'muted',
    })
  }

  if (multiplier > 1 && baseBeforeMultiplier > 0) {
    rows.push({
      title: 'Multiplicador de eliminatoria',
      detail: `Los puntos base (${baseBeforeMultiplier}) se multiplican por ${multiplier}.`,
      points: baseAfterMultiplier - baseBeforeMultiplier,
      tone: 'gold',
    })
  }

  const bonusDetails = []
  if (pred.predBtts !== null && pred.predBtts !== undefined) {
    const realBtts = match.scoreHome > 0 && match.scoreAway > 0
    const correct = pred.predBtts === realBtts
    bonusDetails.push(`${correct ? '+1' : '0'} ambos marcan: elegiste ${pred.predBtts ? 'si' : 'no'}, real ${realBtts ? 'si' : 'no'}`)
  }
  if (pred.predOverUnder) {
    const realOverUnder = (match.scoreHome + match.scoreAway) > 2.5 ? 'over' : 'under'
    const correct = pred.predOverUnder === realOverUnder
    bonusDetails.push(`${correct ? '+1' : '0'} total +2.5: elegiste ${pred.predOverUnder === 'over' ? 'mas' : 'menos'}, real ${realOverUnder === 'over' ? 'mas' : 'menos'}`)
  }
  if (pred.predPenalties !== null && pred.predPenalties !== undefined) {
    const correct = pred.predPenalties === !!match.wentToPenalties
    bonusDetails.push(`${correct ? '+3' : '0'} penales: elegiste ${pred.predPenalties ? 'si' : 'no'}, real ${match.wentToPenalties ? 'si' : 'no'}`)
  }
  if (pred.predWinnerId && match.winnerId) {
    const correct = pred.predWinnerId === match.winnerId
    bonusDetails.push(`${correct ? '+30' : '0'} clasificado/campeon correcto`)
  }

  if ((pred.pointsBonus || 0) > 0 || bonusDetails.length > 0) {
    rows.push({
      title: 'Bonus opcionales',
      detail: bonusDetails.length ? bonusDetails.join(' | ') : 'Bonus acumulados por opciones especiales.',
      points: pred.pointsBonus || 0,
      tone: (pred.pointsBonus || 0) > 0 ? 'red' : 'muted',
    })
  }

  rows.push({
    title: 'Total',
    detail: `Base ${baseAfterMultiplier} + bonus ${pred.pointsBonus || 0}.`,
    points: pred.pointsTotal || 0,
    tone: 'total',
  })

  return rows
}

export default function MatchDetailPage({ matchId: matchIdProp, groupId: groupIdProp } = {}) {
  const { id: routeId } = useParams()
  const id = matchIdProp || routeId
  const [searchParams] = useSearchParams()
  const rawGroupId = groupIdProp || searchParams.get('groupId')
  const groupId = (rawGroupId && rawGroupId !== 'undefined' && rawGroupId !== 'null') ? rawGroupId : null
  const qc = useQueryClient()

  // Si no hay groupId en la URL, usar el primer grupo del usuario como fallback
  const { data: myGroups = [] } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupApi.my().then(r => r.data),
    enabled: !groupId,
  })
  const effectiveGroupId = groupId || myGroups[0]?.id || null

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => matchApi.get(id).then(r => r.data),
  })

  const { data: myPred } = useQuery({
    queryKey: ['prediction', id, effectiveGroupId],
    queryFn: () => predictionApi.forMatch(id, { groupId: effectiveGroupId }).then(r => r.data).catch(() => null),
    enabled: !!effectiveGroupId,
  })

  const { data: allPreds = [] } = useQuery({
    queryKey: ['all-preds', id, effectiveGroupId],
    queryFn: () => predictionApi.allForMatch(id, { groupId: effectiveGroupId }).then(r => r.data).catch(() => []),
    enabled: match?.status === 'FINISHED' && !!effectiveGroupId,
  })

  const mutation = useMutation({
    mutationFn: (data) => predictionApi.save(id, { ...data, groupId: effectiveGroupId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prediction', id] })
      qc.invalidateQueries({ queryKey: ['my-predictions'] })
      qc.invalidateQueries({ queryKey: ['my-predictions-all'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Error al guardar el pronóstico'
      toast.error(msg)
    },
  })

  // Derivar valores de match (seguros aunque match sea null todavía)
  const teamHome   = match?.teamHome ?? null
  const teamAway   = match?.teamAway ?? null
  const deadline   = match ? new Date(new Date(match.dateUtc).getTime() - 5 * 60 * 1000) : new Date(0)
  const isLocked   = match ? isAfter(new Date(), deadline) : true
  const isFinished = match?.status === 'FINISHED'
  const isElim     = !['GROUP'].includes(match?.phase || 'GROUP')

  // ── Todos los hooks van ANTES de cualquier early return ──
  const [form, setForm] = useState({
    predHome: 0, predAway: 0,
    predBtts: null, predOverUnder: null, predPenalties: null,
    predWinnerId: null,
  })
  const [saved, setSaved] = useState(false)
  const [msLeft, setMsLeft] = useState(0)

  useEffect(() => {
    if (myPred) {
      setForm({
        predHome: myPred.predHome ?? 0,
        predAway: myPred.predAway ?? 0,
        predBtts: myPred.predBtts,
        predOverUnder: myPred.predOverUnder,
        predPenalties: myPred.predPenalties,
        predWinnerId: myPred.predWinnerId ?? null,
      })
    }
  }, [myPred])

  // Auto-calcular campeón/ganador de eliminatorias según marcadores
  useEffect(() => {
    if (!isElim) return
    const diff = form.predHome - form.predAway
    if (diff > 0) {
      setForm(f => ({ ...f, predWinnerId: teamHome?.id || null }))
    } else if (diff < 0) {
      setForm(f => ({ ...f, predWinnerId: teamAway?.id || null }))
    } else {
      // Si es empate, mantener selección sólo si ya corresponde a uno de los dos equipos
      setForm(f => {
        if (f.predWinnerId !== teamHome?.id && f.predWinnerId !== teamAway?.id) {
          return { ...f, predWinnerId: null }
        }
        return f
      })
    }
  }, [form.predHome, form.predAway, teamHome, teamAway, isElim])

  useEffect(() => {
    if (!match || isLocked || isFinished) return
    setMsLeft(deadline.getTime() - Date.now())
    const timer = setInterval(() => setMsLeft(deadline.getTime() - Date.now()), 1000)
    return () => clearInterval(timer)
  }, [match, deadline, isLocked, isFinished])

  // Comunidad: agrupar predicciones por marcador
  const predGroups = useMemo(() => {
    const map = {}
    allPreds.forEach(p => {
      const key = `${p.predHome}-${p.predAway}`
      if (!map[key]) map[key] = { score: key, predHome: p.predHome, predAway: p.predAway, count: 0, pts: p.pointsTotal }
      map[key].count++
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [allPreds])

  // ── Early returns DESPUÉS de todos los hooks ──
  if (isLoading) return <Skeleton />
  if (!match) return <p className="text-zinc-500">Partido no encontrado</p>

  const { dateUtc, status, scoreHome, scoreAway, phase } = match
  const isFriendly = isFriendlyMatch(match)
  const pointBreakdown = buildPointBreakdown(myPred, match)

  const hoursLeft   = Math.max(0, Math.floor(msLeft / 3_600_000))
  const minutesLeft = Math.max(0, Math.floor((msLeft % 3_600_000) / 60_000))
  const secondsLeft = Math.max(0, Math.floor((msLeft % 60_000) / 1_000))
  const isUrgent    = msLeft < 30 * 60_000
  const isWarning   = msLeft < 2 * 3_600_000
  const showCountdown = !isLocked && !isFinished && msLeft > 0

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (isLocked) return
    if (!effectiveGroupId) {
      toast.error('Únete a un grupo para guardar pronósticos')
      return
    }
    if (isElim && form.predHome === form.predAway && !form.predWinnerId) {
      toast.error('Selecciona qué equipo clasifica / levanta la Copa')
      return
    }
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
      <Link to={groupId ? `/groups/${groupId}?tab=resultados` : "/matches"} className="inline-flex items-center gap-2 text-zinc-500 hover:text-mundial-gold transition-colors mb-6 group" >
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
            {status === 'LIVE' ? 'En Vivo' : status === 'FINISHED' ? 'Finalizado' : 'Proximo'}
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            {isFriendly ? 'Amistoso internacional' : phase === 'GROUP' ? `Fase de Grupos - ${match.groupLetter}` : phase}
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
                  <p className="font-display text-3xl text-white">{fmtChileTime(dateUtc)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                    {fmtChileDate(dateUtc)}
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
          <div className="flex items-center justify-between mb-4">
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

          {/* Countdown al cierre */}
          <AnimatePresence>
            {showCountdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className={`mb-6 px-4 py-3 rounded-2xl flex items-center gap-3 border ${
                  isUrgent   ? 'bg-mundial-red/10 border-mundial-red/30' :
                  isWarning  ? 'bg-amber-500/10 border-amber-500/30' :
                               'bg-white/5 border-white/5'
                }`}
              >
                {isUrgent ? <AlertTriangle size={14} className="text-mundial-red shrink-0" /> : <Clock size={14} className={`shrink-0 ${isWarning ? 'text-amber-400' : 'text-zinc-500'}`} />}
                <div className="flex-1">
                  <p className={`text-[9px] font-black uppercase tracking-widest ${isUrgent ? 'text-mundial-red' : isWarning ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {isUrgent ? '¡Cierra pronto!' : 'Tiempo para apostar'}
                  </p>
                  <p className={`font-display text-xl leading-none mt-0.5 tabular-nums ${isUrgent ? 'text-mundial-red' : isWarning ? 'text-amber-300' : 'text-white'}`}>
                    {hoursLeft > 0 && `${hoursLeft}h `}{String(minutesLeft).padStart(2,'0')}m {String(secondsLeft).padStart(2,'0')}s
                  </p>
                </div>
                <p className="text-[9px] text-zinc-600 font-bold text-right hidden sm:block">
                  Cierra a las<br />{fmtChileTime(deadline)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {isLocked ? (
            <div className="bg-white/5 rounded-2xl p-10 border border-white/5 text-center">
               {myPred ? (
                 <div className="space-y-4 flex flex-col items-center">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest">Tu apuesta final fue</p>
                    <p className="font-display text-6xl text-white">
                       {myPred.predHome} <span className="text-mundial-gold mx-2">–</span> {myPred.predAway}
                    </p>
                    {isElim && myPred.predWinner && (
                      <div className="inline-flex items-center gap-2 bg-mundial-gold/10 border border-mundial-gold/20 px-4 py-2 rounded-full mt-2">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Campeón Pronosticado:</span>
                        <TeamFlag team={myPred.predWinner} size="sm" />
                        <span className="text-[10px] text-mundial-gold font-black uppercase tracking-widest">
                          {myPred.predWinner.name}
                        </span>
                      </div>
                    )}
                 </div>
               ) : (
                <p className="text-zinc-500 font-medium">No se registró pronóstico para este encuentro.</p>
              )}
            </div>
          ) : (
            <div id="tour-score-inputs" className="space-y-8">
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
                    
                    {isElim && form.predHome === form.predAway && (
                      <div className="flex flex-col p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all space-y-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">¿Quién clasifica / es Campeón?</span>
                          <span className="text-[10px] text-mundial-gold font-mono uppercase tracking-widest leading-none mt-0.5">+30 pts de bonus</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, predWinnerId: teamHome?.id }))}
                            className={`py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2
                              ${form.predWinnerId === teamHome?.id
                                ? 'bg-mundial-gold text-mundial-navy border-mundial-gold shadow-lg shadow-mundial-gold/20'
                                : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'}`}
                          >
                            <TeamFlag team={teamHome} size="sm" />
                            {teamHome?.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, predWinnerId: teamAway?.id }))}
                            className={`py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2
                              ${form.predWinnerId === teamAway?.id
                                ? 'bg-mundial-gold text-mundial-navy border-mundial-gold shadow-lg shadow-mundial-gold/20'
                                : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'}`}
                          >
                            <TeamFlag team={teamAway} size="sm" />
                            {teamAway?.name}
                          </button>
                        </div>
                      </div>
                    )}

                    {isElim && form.predHome !== form.predAway && (
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 transition-all">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-400">Campeón / Clasificado Pronosticado</span>
                          <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest leading-none mt-0.5">Determinado por el marcador</span>
                        </div>
                        <div className="flex items-center gap-2 bg-mundial-gold/10 border border-mundial-gold/20 px-4 py-2 rounded-xl">
                          <TeamFlag team={form.predHome > form.predAway ? teamHome : teamAway} size="sm" />
                          <span className="text-[10px] font-black text-mundial-gold uppercase tracking-widest">
                            {form.predHome > form.predAway ? teamHome?.name : teamAway?.name}
                          </span>
                        </div>
                      </div>
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
              id="tour-save-prediction"
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

          <div className="grid grid-cols-2 gap-4 mb-6">
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

          {/* Desglose detallado de puntos */}
          <div className="mt-8 space-y-3 border-t border-white/5 pt-6">
            <div className="mb-4">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">DESGLOSE DE PUNTOS</p>
              <p className="text-xs text-zinc-500 mt-1">
                Marcador: 5 exacto, 3 por diferencia exacta, 1 por ganador/empate correcto. Los bonus se suman aparte.
              </p>
            </div>

            {pointBreakdown.map((row) => {
              const tones = {
                gold: 'bg-mundial-gold/10 border-mundial-gold/30 text-mundial-gold',
                blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
                green: 'bg-green-500/10 border-green-500/25 text-green-400',
                red: 'bg-mundial-red/10 border-mundial-red/30 text-mundial-red',
                muted: 'bg-white/5 border-white/10 text-zinc-500',
                total: 'bg-gradient-to-r from-mundial-gold/20 to-white/5 border-mundial-gold/40 text-mundial-gold',
              }
              const cls = tones[row.tone] || tones.muted
              return (
                <div key={row.title} className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${cls}`}>
                  <div>
                    <p className="text-sm font-bold text-white">{row.title}</p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{row.detail}</p>
                  </div>
                  <span className={`font-display ${row.tone === 'total' ? 'text-3xl' : 'text-2xl'} font-bold shrink-0`}>
                    {row.points > 0 ? `+${row.points}` : row.points}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Comunidad: distribución de pronósticos */}
      {isFinished && allPreds.length > 0 && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white uppercase tracking-widest">Comunidad</h2>
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{allPreds.length} pronósticos</span>
          </div>

          {/* Marcadores más populares */}
          <div className="space-y-2">
            {predGroups.slice(0, 8).map((g, i) => {
              const pct = Math.round((g.count / allPreds.length) * 100)
              const isWinner = g.pts > 0
              return (
                <div key={g.score} className="flex items-center gap-3">
                  <span className={`font-display text-base w-12 text-right tabular-nums shrink-0 ${i === 0 ? 'text-mundial-gold' : 'text-zinc-300'}`}>
                    {g.predHome}–{g.predAway}
                  </span>
                  <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                      className={`h-full rounded-lg ${isWinner ? 'bg-mundial-gold/50' : 'bg-white/10'}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-20 justify-end">
                    <span className="text-[10px] text-zinc-500 font-bold tabular-nums">{pct}%</span>
                    <span className="text-[9px] text-zinc-700">({g.count})</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lista individual */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            {allPreds.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-mundial-navyLight flex items-center justify-center text-[10px] font-black text-mundial-gold border border-white/10">
                    {p.user?.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-zinc-400">{p.user?.username}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm text-white tabular-nums">{p.predHome}–{p.predAway}</span>
                  <span className={`text-[9px] font-black tabular-nums w-10 text-right ${p.pointsTotal > 0 ? 'text-mundial-gold' : 'text-zinc-700'}`}>
                    +{p.pointsTotal}
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
  const flag = teamFlagUrl(team)
  const cls = size === 'lg' ? 'w-20 h-16' : size === 'sm' ? 'w-6 h-5' : 'w-10 h-8'
  if (flag) {
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
