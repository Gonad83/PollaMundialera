import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, CheckCircle2, Clock, Eye, LockKeyhole, Trophy, X } from 'lucide-react'
import { matchApi, predictionApi, tournamentApi } from '../lib/api'
import { teamEsp } from '../lib/teams'
import PointsChecklist from '../components/PointsChecklist'

// Mundial 2026: 104 partidos en total (72 grupos + 16avos + 8vos + 4tos + semis + 3°/4° + final)
const WORLD_CUP_TOTAL_MATCHES = 104
// Excluir amistosos / partidos de prueba de clubes (mismo criterio que la página de Partidos)
const isNonWorldCupMatch = (m) =>
  (m?.phase === 'GROUP' && !m?.groupLetter && m?.city !== 'World') ||
  ['PSG', 'ARS'].includes(m?.teamHome?.code) || ['PSG', 'ARS'].includes(m?.teamAway?.code)

// Determina el color de la celda según el estado del partido y los puntos
function cellStyle(pred, matchFinished) {
  if (!pred) return { bg: 'bg-white/3', text: 'text-zinc-700', border: 'border-white/5' }
  // Partido no finalizado → gris neutro (apuesta cerrada pero sin resultado)
  if (!matchFinished) return { bg: 'bg-white/5', text: 'text-zinc-400', border: 'border-white/10' }
  if (pred.pointsExact >= 5) return { bg: 'bg-mundial-gold/15', text: 'text-mundial-gold', border: 'border-mundial-gold/30' }
  if (pred.pointsWinner > 0) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/25' }
  return { bg: 'bg-mundial-red/8', text: 'text-red-400/70', border: 'border-mundial-red/15' }
}

// Partido ya debería tener resultado (la fecha pasó) pero aún no se ingresó
function isAwaitingResult(match) {
  return match.status !== 'FINISHED' && match.status !== 'LIVE' && new Date(match.dateUtc) < new Date()
}

function PointsBadge({ pred, match }) {
  const matchFinished = match.status === 'FINISHED'
  if (!pred) {
    // Partido finalizado sin pronóstico → +1 punto no-pick
    if (matchFinished) {
      return (
        <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border border-zinc-700/30 bg-zinc-800/30 min-w-[46px]">
          <span className="text-zinc-600 text-[10px]">—</span>
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">+1</span>
        </div>
      )
    }
    return <span className="text-zinc-700 text-[10px]">—</span>
  }
  const style = cellStyle(pred, matchFinished)
  const awaiting = isAwaitingResult(match)
  return (
    <div className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border ${style.bg} ${style.border} min-w-[46px]`}>
      <span className={`font-display text-sm leading-none ${style.text}`}>
        {pred.predHome}–{pred.predAway}
      </span>
      {matchFinished ? (
        <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${pred.pointsTotal > 0 ? style.text : 'text-zinc-700'}`}>
          {pred.pointsTotal > 0 ? `+${pred.pointsTotal}` : '0'}
        </span>
      ) : awaiting ? (
        <span className="text-[8px] text-amber-500/80 uppercase tracking-widest leading-none">
          s/res
        </span>
      ) : (
        <span className="text-[8px] text-zinc-600 uppercase tracking-widest leading-none flex items-center gap-0.5">
          <Clock size={7} /> pend.
        </span>
      )}
    </div>
  )
}

function TournamentPointsBadge({ picks, isLoading, round = 'round32', round16ScoringOpen, onClick }) {
  const label = round === 'round16' ? '8vos' : '16avos'

  if (isLoading) {
    return (
      <div className="flex min-w-[58px] flex-col items-center gap-0.5 rounded-lg border border-mundial-gold/10 bg-mundial-gold/5 px-2 py-1.5">
        <span className="text-[10px] font-black text-mundial-gold/40">...</span>
        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">{label}</span>
      </div>
    )
  }

  const round32Pts = picks?.ptsRound32 || 0
  const round16Pts = round16ScoringOpen ? (picks?.ptsRound16 || 0) : 0
  const points = round === 'round16' ? round16Pts : round32Pts
  const hasPts = points > 0
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={onClick ? 'Ver equipos que sumaron puntos' : undefined}
      className={`flex min-w-[58px] flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 transition-all ${
      hasPts ? 'border-mundial-gold/30 bg-mundial-gold/10' : 'border-white/8 bg-white/5'
    } ${onClick ? 'cursor-pointer hover:border-mundial-gold/60 hover:bg-mundial-gold/15 hover:shadow-[0_0_18px_rgba(255,215,0,0.10)]' : ''}`}
    >
      <span className={`font-display text-sm leading-none ${hasPts ? 'text-mundial-gold' : 'text-zinc-700'}`}>
        +{points}
      </span>
      <span className="text-[8px] font-black uppercase tracking-widest leading-none text-zinc-500">{label}</span>
      {hasPts && (
        <span className="text-[8px] font-black uppercase tracking-widest leading-none text-emerald-300">{label} +{points}</span>
      )}
    </Wrapper>
  )
}

function TeamFlag({ team, size = 'sm' }) {
  const cls = size === 'sm' ? 'w-5 h-3.5' : 'w-7 h-5'
  const flag = team?.flagUrl
  if (flag && (flag.startsWith('http') || flag.startsWith('/'))) {
    return <img src={flag} alt={team?.name || ''} className={`${cls} object-contain`} onError={e => { e.currentTarget.style.display = 'none' }} />
  }
  return null
}

export default function CompareView({ groupId, members = [] }) {
  const [mode, setMode] = useState('matches')
  const [breakdown, setBreakdown] = useState(null) // celda clickeada → modal de desglose de puntos
  const [tournamentBreakdown, setTournamentBreakdown] = useState(null)

  const { data: compareData, isLoading } = useQuery({
    queryKey: ['group-compare', groupId],
    queryFn: () => predictionApi.compare(groupId).then(r => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const rawPreds = compareData?.predictions ?? []
  const finishedMatchCount = compareData?.finishedMatchCount ?? 0

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => matchApi.teams().then(r => r.data),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  })

  // Todos los partidos del torneo (para mostrar cuántos quedan por jugar de verdad,
  // no solo los de la comparativa). Reusa la caché de la página de Partidos.
  const { data: allWcMatches = [] } = useQuery({
    queryKey: ['matches-all'],
    queryFn: () => matchApi.list({}).then(r => r.data),
    staleTime: 3 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
  const tournamentFinished = useMemo(
    () => allWcMatches.filter(m => m.status === 'FINISHED' && !isNonWorldCupMatch(m)).length,
    [allWcMatches]
  )
  const actualRound32TeamIds = useMemo(() => {
    const ids = allWcMatches
      .filter(m => m.phase === 'R32' && !isNonWorldCupMatch(m))
      .flatMap(m => [m.teamHomeId, m.teamAwayId])
      .filter(Boolean)
    return [...new Set(ids)]
  }, [allWcMatches])
  const actualRound16TeamIds = useMemo(() => {
    const ids = allWcMatches
      .filter(m => m.phase === 'R32' && m.status === 'FINISHED' && m.winnerId && !isNonWorldCupMatch(m))
      .map(m => m.winnerId)
      .filter(Boolean)
    return [...new Set(ids)]
  }, [allWcMatches])

  // Deduplicar partidos y ordenarlos por fecha
  const matches = useMemo(() => {
    const map = {}
    rawPreds.forEach(p => { if (!map[p.matchId]) map[p.matchId] = p.match })
    return Object.values(map).sort((a, b) => new Date(a.dateUtc) - new Date(b.dateUtc))
  }, [rawPreds])

  // Mapa { userId: { matchId: prediction } }
  const predMap = useMemo(() => {
    const map = {}
    rawPreds.forEach(p => {
      if (!map[p.userId]) map[p.userId] = {}
      map[p.userId][p.matchId] = p
    })
    return map
  }, [rawPreds])

  const finishedMatches = useMemo(() => matches.filter(m => m.status === 'FINISHED'), [matches])
  const pendingMatches  = useMemo(() => matches.filter(m => m.status !== 'FINISHED'), [matches])
  const round16ScoringOpen = useMemo(() => {
    const r32 = allWcMatches.filter(match => match.phase === 'R32' && !isNonWorldCupMatch(match))
    return r32.length >= 16 && r32.every(match => match.status === 'FINISHED' && match.winnerId)
  }, [allWcMatches])

  // Filtrar SUPER_ADMIN y ordenar por puntos totales en el comparativo
  const visibleMembers = useMemo(() => {
    const filtered = members.filter(m => m.user?.role !== 'SUPER_ADMIN')
    return filtered.map(m => {
      const predPts = matches.reduce((acc, match) => acc + (predMap[m.userId]?.[match.id]?.pointsTotal ?? 0), 0)
      // 1 punto por cada partido finalizado sin pronóstico en este grupo
      const finishedPredCount = finishedMatches.filter(match => predMap[m.userId]?.[match.id]).length
      const noPickPts = Math.max(finishedMatchCount - finishedPredCount, 0)
      return {
        ...m,
        matchCompPts: predPts + noPickPts,
        totalCompPts: predPts + noPickPts,
        noPickPts,
        pendingPredCount: pendingMatches.filter(match => predMap[m.userId]?.[match.id]).length,
      }
    }).sort((a, b) => b.totalCompPts - a.totalCompPts)
  }, [members, matches, predMap, finishedMatches, finishedMatchCount])

  const teamById = useMemo(() => {
    const map = new Map()
    teams.forEach(team => map.set(team.id, team))
    return map
  }, [teams])

  // Scroll al extremo derecho (partidos más recientes) al cargar o cuando llegan los datos
  const tableScrollRef = useRef(null)
  useEffect(() => {
    if (isLoading || matches.length === 0 || mode !== 'matches') return
    // 400ms para que Framer Motion y el render de la tabla terminen
    const t = setTimeout(() => {
      const el = tableScrollRef.current
      if (el) el.scrollLeft = el.scrollWidth
    }, 400)
    return () => clearTimeout(t)
  }, [isLoading, matches.length, mode])

  const tournamentCompare = useQuery({
    queryKey: ['tournament-compare', groupId, visibleMembers.map(m => m.userId).join('|')],
    enabled: !!groupId && visibleMembers.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.allSettled(
        visibleMembers.map(member =>
          tournamentApi.userPicks(member.userId, { groupId }).then(r => ({ member, picks: r.data }))
        )
      )

      return results.map((result, idx) => {
        if (result.status === 'fulfilled') return result.value
        return {
          member: visibleMembers[idx],
          error: result.reason?.response?.data?.error || 'Pronóstico no disponible',
        }
      })
    },
  })

  const tournamentByUser = useMemo(() => {
    const map = new Map()
    ;(tournamentCompare.data || []).forEach(row => {
      if (row.member?.userId && row.picks) map.set(row.member.userId, row.picks)
    })
    return map
  }, [tournamentCompare.data])

  const displayMembers = useMemo(() => (
    visibleMembers.map(member => {
      const picks = tournamentByUser.get(member.userId)
      const blockedRound16Pts = round16ScoringOpen ? 0 : (picks?.ptsRound16 || 0)
      const tournamentPts = Math.max((picks?.pointsTotal || 0) - blockedRound16Pts, 0)
      return {
        ...member,
        tournamentPts,
        round32Pts: picks?.ptsRound32 || 0,
        round16Pts: picks?.ptsRound16 || 0,
        totalCompPts: member.matchCompPts + tournamentPts,
      }
    }).sort((a, b) => b.totalCompPts - a.totalCompPts)
  ), [visibleMembers, tournamentByUser, round16ScoringOpen])

  const tournamentRows = useMemo(() => (
    (tournamentCompare.data || [])
      .slice()
      .sort((a, b) => {
        const aBlocked = round16ScoringOpen ? 0 : (a.picks?.ptsRound16 || 0)
        const bBlocked = round16ScoringOpen ? 0 : (b.picks?.ptsRound16 || 0)
        return Math.max((b.picks?.pointsTotal || 0) - bBlocked, 0) - Math.max((a.picks?.pointsTotal || 0) - aBlocked, 0)
      })
  ), [tournamentCompare.data, round16ScoringOpen])

  const tableColumns = useMemo(() => {
    const columns = []
    let insertedRound32 = false
    let insertedRound16 = false

    matches.forEach(match => {
      if (!insertedRound32 && match.phase === 'R32') {
        columns.push({ type: 'tournament', id: 'tournament-round32', round: 'round32', label: '16avos' })
        insertedRound32 = true
      }
      if (!insertedRound16 && match.phase === 'R16') {
        columns.push({ type: 'tournament', id: 'tournament-round16', round: 'round16', label: '8vos' })
        insertedRound16 = true
      }
      columns.push({ type: 'match', id: match.id, match })
    })

    return columns
  }, [matches])

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-2xl bg-white/5" />)}
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl uppercase text-white">Comparativa</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Compara tus pronósticos con los de los demás apostadores</p>
        </div>
        {/* Filtro de contenido (secundario) — no es navegación principal, por eso un estilo más liviano */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="hidden text-[9px] font-black uppercase tracking-widest text-zinc-600 sm:inline">Ver:</span>
          <div className="inline-flex rounded-xl border border-white/8 bg-white/[0.03] p-0.5">
            {[
              { id: 'matches', label: 'Partidos', icon: BarChart3 },
              { id: 'tournament', label: 'Torneo', icon: Trophy },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setMode(item.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  mode === item.id
                    ? 'bg-mundial-gold/15 text-mundial-gold ring-1 ring-mundial-gold/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <item.icon size={13} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'tournament' && (
        <TournamentCompare rows={tournamentRows} isLoading={tournamentCompare.isLoading} teamById={teamById} round16ScoringOpen={round16ScoringOpen} />
      )}

      {mode === 'matches' && matches.length === 0 && (
        <div className="card p-12 text-center bg-white/5 border border-white/5">
          <LockKeyhole size={40} className="mx-auto text-zinc-800 mb-3" />
          <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Sin apuestas cerradas aún</p>
          <p className="text-zinc-700 text-[10px] mt-2">Los pronósticos aparecen aquí cuando la apuesta de un partido cierra (5 min antes del pitazo).</p>
        </div>
      )}

      {mode === 'matches' && matches.length > 0 && (
        <>
      {/* Resumen jugados vs por jugar */}
      <MatchProgressSummary
        finished={finishedMatches.length}
        pending={pendingMatches.length}
        total={matches.length}
        members={displayMembers}
        tournamentFinished={tournamentFinished}
        tournamentTotal={WORLD_CUP_TOTAL_MATCHES}
      />

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Leyenda:</span>
        {[
          { bg: 'bg-mundial-gold/15', border: 'border-mundial-gold/30', text: 'text-mundial-gold',    label: 'Exacto',      icon: null },
          { bg: 'bg-green-500/10',    border: 'border-green-500/25',    text: 'text-green-400',       label: 'Ganador',     icon: null },
          { bg: 'bg-mundial-red/8',   border: 'border-mundial-red/15',  text: 'text-red-400/70',      label: 'Fallo',       icon: null },
          { bg: 'bg-white/5',         border: 'border-white/10',        text: 'text-zinc-400',        label: 'Pendiente',   icon: <Clock size={9} /> },
          { bg: 'bg-amber-500/8',     border: 'border-amber-500/20',    text: 'text-amber-500/80',    label: 'Sin resultado', icon: null },
          { bg: 'bg-mundial-gold/10', border: 'border-mundial-gold/30', text: 'text-mundial-gold',    label: 'Torneo', icon: <Trophy size={9} /> },
        ].map(({ bg, border, text, label, icon }) => (
          <span key={label} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${bg} ${border} text-[9px] font-black uppercase tracking-widest ${text}`}>
            {icon}{label}
          </span>
        ))}
      </div>

      {/* Tabla scrollable */}
      <div className="card overflow-hidden bg-white/5 border border-white/5">
        <div className="overflow-x-auto" ref={tableScrollRef}>
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/8">
                {/* Col fija: jugador */}
                <th className="sticky left-0 z-10 bg-mundial-navyLight px-2 py-3 text-left min-w-[104px] border-r border-white/8 sm:min-w-[130px] sm:px-4">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Jugador</span>
                </th>
                {/* Una col por partido */}
                {tableColumns.map(column => {
                  if (column.type === 'tournament') {
                    return (
                      <th key={column.id} className="px-1.5 py-2 min-w-[72px] text-center border-r border-mundial-gold/15 bg-mundial-gold/6 sm:min-w-[82px] sm:px-2">
                        <div className="flex flex-col items-center gap-1">
                          <Trophy size={13} className="text-mundial-gold" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-mundial-gold">Torneo</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{column.label}</span>
                        </div>
                      </th>
                    )
                  }
                  const match = column.match
                  const homeCode = match.teamHome?.code?.toUpperCase() || '?'
                  const awayCode = match.teamAway?.code?.toUpperCase() || '?'
                  const isFinished = match.status === 'FINISHED'
                  const awaiting = isAwaitingResult(match)
                  return (
                    <th key={match.id} className="px-1.5 py-2.5 min-w-[74px] text-center border-r border-white/5 last:border-r-0 sm:min-w-[84px] sm:px-2">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <TeamFlag team={match.teamHome} />
                          <span className="text-[8px] font-black text-white/80">{homeCode}</span>
                        </div>
                        {isFinished ? (
                          <span className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[11px] font-display text-mundial-gold">
                              {match.scoreHome}–{match.scoreAway}
                            </span>
                            {match.extraTimeHome != null && match.extraTimeAway != null && (
                              <span className="text-[7px] font-black uppercase tracking-wide text-amber-300 whitespace-nowrap">
                                pro {match.extraTimeHome}-{match.extraTimeAway}
                              </span>
                            )}
                            {match.wentToPenalties && match.penaltyHome != null && match.penaltyAway != null && (
                              <span className="text-[7px] font-black uppercase tracking-wide text-amber-300 whitespace-nowrap">
                                pen {match.penaltyHome}-{match.penaltyAway}
                              </span>
                            )}
                          </span>
                        ) : awaiting ? (
                          <span className="text-[9px] text-amber-500/80 flex items-center gap-0.5 leading-none font-black">
                            S/RES
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-500 flex items-center gap-0.5 leading-none">
                            {match.status === 'LIVE'
                              ? <span className="text-mundial-red font-black">EN VIVO</span>
                              : <><Clock size={8} /><span className="font-black">PEND.</span></>
                            }
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-white/80">{awayCode}</span>
                          <TeamFlag team={match.teamAway} />
                        </div>
                      </div>
                    </th>
                  )
                })}
                {/* Total */}
                <th className="sticky right-0 z-10 bg-mundial-navyLight px-2 py-3 text-center min-w-[52px] border-l border-white/8 sm:min-w-[60px] sm:px-3">
                  <span className="text-[9px] font-black text-mundial-gold uppercase tracking-widest">PTS</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayMembers.map((member, idx) => {
                const userPreds = predMap[member.userId] || {}
                const picks = tournamentByUser.get(member.userId)
                return (
                  <motion.tr
                    key={member.userId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors"
                  >
                    {/* Nombre */}
                    <td className="sticky left-0 z-10 bg-mundial-navy px-2 py-2.5 border-r border-white/8 sm:px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-mundial-gold shrink-0">
                          {member.user?.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-[11px] font-bold text-zinc-300 truncate max-w-[80px]">
                          {member.user?.username}
                        </span>
                      </div>
                    </td>
                    {/* Predicciones */}
                    {tableColumns.map(column => {
                      if (column.type === 'tournament') {
                        return (
                          <td key={column.id} className="px-1.5 py-2 text-center border-r border-mundial-gold/15 bg-mundial-gold/[0.025]">
                            <div className="flex justify-center">
                              <TournamentPointsBadge
                                picks={picks}
                                isLoading={tournamentCompare.isLoading}
                                round={column.round}
                                round16ScoringOpen={round16ScoringOpen}
                                onClick={() => setTournamentBreakdown({ member, picks, round: column.round })}
                              />
                            </div>
                          </td>
                        )
                      }
                      const match = column.match
                      const cellPred = userPreds[match.id]
                      const canBreakdown = match.status === 'FINISHED' && cellPred
                      return (
                        <td key={match.id} className="px-1.5 py-2 text-center border-r border-white/5 last:border-r-0">
                          <div className="flex justify-center">
                            {canBreakdown ? (
                              <button
                                type="button"
                                onClick={() => setBreakdown({ member, pred: cellPred, match })}
                                title="Ver desglose de puntos"
                                className="rounded-lg transition-transform hover:scale-105 focus:outline-none focus:ring-1 focus:ring-mundial-gold/40"
                              >
                                <PointsBadge pred={cellPred} match={match} />
                              </button>
                            ) : (
                              <PointsBadge pred={cellPred} match={match} />
                            )}
                          </div>
                        </td>
                      )
                    })}
                    {/* Total */}
                    <td className="sticky right-0 z-10 bg-mundial-navy px-2 py-2 text-center border-l border-white/8 sm:px-3">
                      <span className="font-display text-base text-mundial-gold">{member.totalCompPts}</span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[9px] text-zinc-700 font-mono text-center px-2">
        Se muestran pronosticos de partidos con apuesta cerrada · El puntaje usa marcador de 90 min; alargue no suma · Torneo 16avos se suma al total antes de CAN-RSA · "Pend." = partido sin resultado aun
      </p>
        </>
      )}

      <AnimatePresence>
        {breakdown && <BreakdownModal data={breakdown} onClose={() => setBreakdown(null)} />}
        {tournamentBreakdown && (
          <TournamentBreakdownModal
            data={tournamentBreakdown}
            actualRound32TeamIds={actualRound32TeamIds}
            actualRound16TeamIds={actualRound16TeamIds}
            teamById={teamById}
            round16ScoringOpen={round16ScoringOpen}
            onClose={() => setTournamentBreakdown(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Modal de desglose de puntos de un pronóstico (clic en una celda de la Comparativa).
function BreakdownModal({ data, onClose }) {
  const { member, pred, match } = data
  const sh = match.scoreHome, sa = match.scoreAway
  const homeCode = match.teamHome?.code?.toUpperCase() || '?'
  const awayCode = match.teamAway?.code?.toUpperCase() || '?'
  const total = pred.pointsTotal || 0

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-mundial-navyLight p-4 shadow-2xl"
      >
        {/* Encabezado del partido */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{homeCode}</span>
            <span className="font-display text-lg text-white">{sh}–{sa}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{awayCode}</span>
            {match.wentToPenalties && match.penaltyHome != null && match.penaltyAway != null && (
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-300">pen {match.penaltyHome}-{match.penaltyAway}</span>
            )}
            {match.extraTimeHome != null && match.extraTimeAway != null && (
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-300">pro {match.extraTimeHome}-{match.extraTimeAway}</span>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-white"><X size={16} /></button>
        </div>

        {/* Participante + total */}
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mundial-gold/15 text-[11px] font-black text-mundial-gold">
              {member.user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] font-black leading-none text-white">{member.user?.username}</p>
              <p className="mt-0.5 text-[9px] font-bold text-zinc-500">apostó {pred.predHome}-{pred.predAway}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">ganó</span>
            <span className={`font-display text-xl leading-none ${total > 0 ? 'text-mundial-gold' : 'text-zinc-600'}`}>
              {total > 0 ? `+${total}` : '0'}
            </span>
          </div>
        </div>

        {/* Checklist */}
        <PointsChecklist pred={pred} match={match} />

        {/* Total */}
        <div className="flex items-center justify-between border-t border-white/8 pt-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total</span>
          <span className={`font-display text-lg ${total > 0 ? 'text-mundial-gold' : 'text-zinc-600'}`}>
            {total > 0 ? `+${total}` : '0'} pts
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TournamentBreakdownModal({ data, actualRound32TeamIds, actualRound16TeamIds, teamById, round16ScoringOpen, onClose }) {
  const { member, picks } = data
  const focusRound = data.round || 'round32'
  const focusLabel = focusRound === 'round16' ? '8vos' : '16avos'
  const actualRound32Set = new Set(actualRound32TeamIds || [])
  const actualRound16Set = new Set(actualRound16TeamIds || [])
  const pickedRound32 = picks?.round32Teams || []
  const pickedRound16 = picks?.round16Teams || []
  const hitIds = pickedRound32.filter(id => actualRound32Set.has(id))
  const missIds = pickedRound32.filter(id => !actualRound32Set.has(id))
  const round16HitIds = round16ScoringOpen ? pickedRound16.filter(id => actualRound16Set.has(id)) : []
  const round16MissIds = round16ScoringOpen ? pickedRound16.filter(id => !actualRound16Set.has(id)) : []
  const round32Pts = picks?.ptsRound32 || hitIds.length
  const effectiveRound16Pts = round16ScoringOpen ? (picks?.ptsRound16 || 0) : 0
  const focusHits = focusRound === 'round16' ? round16HitIds.length : hitIds.length
  const focusPts = focusRound === 'round16' ? effectiveRound16Pts : round32Pts
  const visibleMissIds = missIds.slice(0, 12)
  const visibleRound16MissIds = round16MissIds.slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-mundial-gold/20 bg-mundial-navyLight p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-mundial-gold">Detalle torneo</p>
            <h3 className="mt-1 font-display text-2xl uppercase leading-none text-white">Torneo {focusLabel}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-white"><X size={16} /></button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mundial-gold/15 text-[11px] font-black text-mundial-gold">
              {member.user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] font-black leading-none text-white">{member.user?.username}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                {focusHits} equipos acertados en {focusLabel}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">sumo</span>
            <span className="font-display text-xl leading-none text-mundial-gold">+{focusPts}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">16avos que generaron puntos</span>
            <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-200">+1 c/u</span>
          </div>
          {hitIds.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {hitIds.map(id => <TournamentTeamChip key={id} team={teamById.get(id)} tone="hit" />)}
            </div>
          ) : (
            <p className="rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Sin equipos acertados cargados todavia
            </p>
          )}
        </div>

        {missIds.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pronosticados sin punto</span>
              <span className="text-[9px] font-black text-zinc-600">{missIds.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleMissIds.map(id => <TournamentTeamChip key={id} team={teamById.get(id)} tone="miss" />)}
            </div>
            {missIds.length > visibleMissIds.length && (
              <p className="mt-2 text-center text-[9px] font-black uppercase tracking-widest text-zinc-600">
                +{missIds.length - visibleMissIds.length} mas
              </p>
            )}
          </div>
        )}

        {!round16ScoringOpen && (picks?.ptsRound16 || 0) > 0 && (
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-amber-200">
            8vos bloqueado hasta que terminen todos los 16avos
          </p>
        )}
        {effectiveRound16Pts > 0 && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">8vos que generaron puntos</span>
              <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-200">+{effectiveRound16Pts}</span>
            </div>
            {round16HitIds.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {round16HitIds.map(id => <TournamentTeamChip key={id} team={teamById.get(id)} tone="hit" />)}
              </div>
            ) : (
              <p className="rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Sin equipos acertados en 8vos
              </p>
            )}
          </div>
        )}
        {round16ScoringOpen && visibleRound16MissIds.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">8vos pronosticados sin punto</span>
              <span className="text-[9px] font-black text-zinc-600">{round16MissIds.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleRound16MissIds.map(id => <TournamentTeamChip key={id} team={teamById.get(id)} tone="miss" />)}
            </div>
            {round16MissIds.length > visibleRound16MissIds.length && (
              <p className="mt-2 text-center text-[9px] font-black uppercase tracking-widest text-zinc-600">
                +{round16MissIds.length - visibleRound16MissIds.length} mas
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function TournamentTeamChip({ team, tone }) {
  const isHit = tone === 'hit'
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-2 ${
      isHit
        ? 'border-emerald-400/20 bg-emerald-400/10'
        : 'border-white/8 bg-white/5 opacity-75'
    }`}>
      <TeamFlag team={team} />
      <span className={`truncate text-[10px] font-black uppercase tracking-tight ${
        isHit ? 'text-emerald-100' : 'text-zinc-500'
      }`}>
        {team?.code || team?.name || '-'}
      </span>
      {isHit && <span className="ml-auto shrink-0 text-[9px] font-black text-emerald-300">+1</span>}
    </div>
  )
}

function MatchProgressSummary({ finished, pending, total, members, tournamentFinished = 0, tournamentTotal = 0 }) {
  // Usa el total real del torneo si está disponible; si no, cae a los datos de la comparativa.
  const played    = tournamentTotal ? tournamentFinished : finished
  const totalAll  = tournamentTotal || total
  const remaining = Math.max(totalAll - played, 0)
  const pct = totalAll > 0 ? Math.round((played / totalAll) * 100) : 0
  const leader = members[0]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
      {/* Fila de stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-mundial-gold/25 bg-mundial-gold/10 px-3 py-2.5">
          <CheckCircle2 size={14} className="text-mundial-gold" />
          <span className="font-display text-2xl leading-none text-mundial-gold">{played}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Jugados</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
          <Clock size={14} className="text-amber-300" />
          <span className="font-display text-2xl leading-none text-amber-300">{remaining}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Por jugar</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5">
          <BarChart3 size={14} className="text-zinc-300" />
          <span className="font-display text-2xl leading-none text-white">{totalAll}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Total partidos</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Progreso del torneo</span>
          <span className="text-[10px] font-black text-mundial-gold">{pct}% · faltan {remaining}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-mundial-gold"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Líder actual */}
      {played > 0 && leader && (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Va ganando</span>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-mundial-gold/20 flex items-center justify-center text-[9px] font-black text-mundial-gold">
                {leader.user?.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-[11px] font-black text-white">{leader.user?.username}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block">pts actuales</span>
              <span className="font-display text-base text-mundial-gold leading-none">{leader.totalCompPts}</span>
              {leader.tournamentPts > 0 && (
                <span className="mt-0.5 block text-[8px] font-black uppercase tracking-widest text-zinc-400">
                  {leader.matchCompPts} partidos + {leader.tournamentPts} torneo
                </span>
              )}
            </div>
            {leader.pendingPredCount > 0 && (
              <div className="text-right">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block">apuestas abiertas</span>
                <span className="font-display text-base text-amber-300 leading-none">{leader.pendingPredCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TournamentCompare({ rows, isLoading, teamById, round16ScoringOpen }) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-3xl bg-white/5" />)}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="card p-12 text-center bg-white/5 border border-white/5">
        <Trophy size={40} className="mx-auto text-zinc-800 mb-3" />
        <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Sin participantes para comparar</p>
      </div>
    )
  }

  const lockedError = rows.find(row => row.error)?.error || ''
  const allLocked = rows.every(row => row.error && String(row.error).toLowerCase().includes('revelan'))

  if (allLocked) {
    return (
      <div className="card p-10 text-center bg-white/5 border border-white/5">
        <LockKeyhole size={42} className="mx-auto text-mundial-gold mb-4" />
        <h3 className="font-display text-2xl uppercase text-white">Pronósticos bloqueados</h3>
        <p className="mx-auto mt-2 max-w-md text-xs font-bold uppercase tracking-widest text-zinc-500">
          {lockedError || 'Los pronósticos del torneo se revelan cuando cierre el plazo.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-mundial-gold/20 bg-mundial-gold/8 p-4 flex items-center gap-3">
        <Eye size={18} className="text-mundial-gold shrink-0" />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Estos son los pronósticos de torneo que registró cada participante.
        </p>
      </div>

      {rows.map(({ member, picks, error }) => (
        <TournamentOpponentCard
          key={member.userId}
          member={member}
          picks={picks}
          error={error}
          teamById={teamById}
          round16ScoringOpen={round16ScoringOpen}
        />
      ))}
    </div>
  )
}

function TournamentOpponentCard({ member, picks, error, teamById, round16ScoringOpen }) {
  const byId = (id) => teamById.get(id)
  const list = (ids = []) => ids.map(byId).filter(Boolean)
  const blockedRound16Pts = round16ScoringOpen ? 0 : (picks?.ptsRound16 || 0)
  const effectiveTournamentPts = Math.max((picks?.pointsTotal || 0) - blockedRound16Pts, 0)

  return (
    <article className="card overflow-hidden bg-white/5 border border-white/5">
      <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mundial-gold/10 text-mundial-gold font-black">
            {member.user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl uppercase text-white">{member.user?.username || 'Participante'}</h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Pronóstico torneo</p>
          </div>
        </div>
        {effectiveTournamentPts > 0 && (
          <span className="w-fit rounded-xl border border-mundial-gold/25 bg-mundial-gold/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-mundial-gold">
            {effectiveTournamentPts} pts
          </span>
        )}
      </div>

      {error || !picks ? (
        <div className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-600">{error || 'Sin pronóstico registrado'}</div>
      ) : (
        <div className="space-y-4 p-4">
          <TournamentScoreSummary picks={picks} round16ScoringOpen={round16ScoringOpen} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CompareBlock title="Copa y final">
            <CompareLine label="Campeón" team={byId(picks.champion)} highlight />
            <CompareLine label="Finalista 1" team={byId(picks.finalist1)} />
            <CompareLine label="Finalista 2" team={byId(picks.finalist2)} />
          </CompareBlock>

          <CompareBlock title="Especiales">
            <CompareLine label="Anfitrión" team={byId(picks.hostFurthest)} />
            <CompareLine label="Más goleadora" team={byId(picks.mostGoalsTeamId)} />
            <CompareLine label="Valla invicta" team={byId(picks.leastGoalsTeamId)} />
            <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Goles totales</p>
              <p className="font-display text-2xl text-mundial-gold">{picks.totalGoals || '-'}</p>
            </div>
          </CompareBlock>

          <CompareBlock title="Premios">
            <CompareLine label="Bota de Oro" team={byId(picks.topScorerId)} />
            <CompareLine label="Balón de Oro" team={byId(picks.bestPlayerId)} />
            <CompareLine label="Guante de Oro" team={byId(picks.bestKeeperId)} />
            <CompareLine label="Mejor joven" team={byId(picks.bestYoungId)} />
          </CompareBlock>

          <CompareBlock title="Camino al título">
            <CompareChips label="Semis" teams={list(picks.semifinalists)} />
            <CompareChips label="4tos" teams={list(picks.quarterfinalists)} />
            <CompareChips label="8vos" teams={list(picks.round16Teams)} />
            <CompareChips label="16avos" teams={list(picks.round32Teams)} />
          </CompareBlock>
        </div>
        </div>
      )}
    </article>
  )
}

function TournamentScoreSummary({ picks, round16ScoringOpen }) {
  const effectiveRound16Pts = round16ScoringOpen ? (picks.ptsRound16 || 0) : 0
  const blockedRound16Pts = round16ScoringOpen ? 0 : (picks.ptsRound16 || 0)
  const effectiveTotal = Math.max((picks.pointsTotal || 0) - blockedRound16Pts, 0)
  const rows = [
    { label: 'Total torneo', value: effectiveTotal, strong: true },
    { label: '16avos', value: picks.ptsRound32 || 0 },
    { label: '8vos', value: effectiveRound16Pts },
    { label: '4tos', value: picks.ptsQuarters || 0 },
    { label: 'Semis', value: picks.ptsSemifinals || 0 },
    { label: 'Finalistas', value: picks.ptsFinalists || 0 },
    { label: 'Campeon', value: picks.ptsChampion || 0 },
  ]

  return (
    <div className="rounded-2xl border border-mundial-gold/20 bg-mundial-gold/[0.06] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-mundial-gold">Puntaje calculado</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Aciertos reales cargados hasta ahora</p>
        </div>
        <span className="rounded-xl border border-mundial-gold/30 bg-mundial-gold/10 px-3 py-1.5 font-display text-xl text-mundial-gold">
          {effectiveTotal}
        </span>
      </div>
      {!round16ScoringOpen && blockedRound16Pts > 0 && (
        <p className="mb-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-amber-200">
          8vos bloqueado hasta que terminen todos los 16avos
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {rows.map(row => (
          <div key={row.label} className={`rounded-xl border px-2 py-2 text-center ${
            row.strong
              ? 'border-mundial-gold/30 bg-mundial-gold/10'
              : row.value > 0
                ? 'border-emerald-400/20 bg-emerald-400/10'
                : 'border-white/8 bg-white/5'
          }`}>
            <span className={`block font-display text-lg leading-none ${row.value > 0 || row.strong ? 'text-mundial-gold' : 'text-zinc-700'}`}>
              {row.value}
            </span>
            <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-zinc-600">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompareBlock({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-mundial-navy/45 p-4">
      <h4 className="mb-3 font-display text-lg uppercase text-mundial-gold">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function CompareLine({ label, team, highlight = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${highlight ? 'border-mundial-gold/25 bg-mundial-gold/10' : 'border-white/8 bg-white/5'}`}>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
      {team ? (
        <span className="flex min-w-0 items-center gap-2">
          <TeamFlag team={team} />
          <span className={`truncate text-right text-[11px] font-black uppercase ${highlight ? 'text-mundial-gold' : 'text-zinc-300'}`}>
            {teamEsp(team)}
          </span>
        </span>
      ) : (
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">-</span>
      )}
    </div>
  )
}

function CompareChips({ label, teams }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-mundial-gold">{teams.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {teams.map(team => (
          <div key={team.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
            <TeamFlag team={team} />
            <span className="truncate text-[9px] font-black uppercase text-zinc-400">{teamEsp(team)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
