import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Clock, LockKeyhole, Trophy } from 'lucide-react'
import { matchApi, predictionApi, tournamentApi } from '../lib/api'
import { teamEsp } from '../lib/teams'

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
  if (!pred) return <span className="text-zinc-700 text-[10px]">—</span>
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

  const { data: rawPreds = [], isLoading } = useQuery({
    queryKey: ['group-compare', groupId],
    queryFn: () => predictionApi.compare(groupId).then(r => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => matchApi.teams().then(r => r.data),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  })

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

  // Filtrar SUPER_ADMIN y ordenar por puntos totales en el comparativo
  const visibleMembers = useMemo(() => {
    const filtered = members.filter(m => m.user?.role !== 'SUPER_ADMIN')
    return filtered.map(m => ({
      ...m,
      totalCompPts: matches.reduce((acc, match) => acc + (predMap[m.userId]?.[match.id]?.pointsTotal ?? 0), 0),
    })).sort((a, b) => b.totalCompPts - a.totalCompPts)
  }, [members, matches, predMap])

  const teamById = useMemo(() => {
    const map = new Map()
    teams.forEach(team => map.set(team.id, team))
    return map
  }, [teams])

  const tournamentCompare = useQuery({
    queryKey: ['tournament-compare', groupId, visibleMembers.map(m => m.userId).join('|')],
    enabled: mode === 'tournament' && !!groupId && visibleMembers.length > 0,
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
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Revisa partidos y pronósticos del torneo</p>
        </div>
        <div className="flex rounded-2xl border border-white/8 bg-white/5 p-1">
          {[
            { id: 'matches', label: 'Partidos', icon: BarChart3 },
            { id: 'tournament', label: 'Torneo', icon: Trophy },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`flex min-w-[110px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === item.id ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/15' : 'text-zinc-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'tournament' && (
        <TournamentCompare rows={tournamentCompare.data || []} isLoading={tournamentCompare.isLoading} teamById={teamById} />
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
      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Leyenda:</span>
        {[
          { bg: 'bg-mundial-gold/15', border: 'border-mundial-gold/30', text: 'text-mundial-gold',    label: 'Exacto',      icon: null },
          { bg: 'bg-green-500/10',    border: 'border-green-500/25',    text: 'text-green-400',       label: 'Ganador',     icon: null },
          { bg: 'bg-mundial-red/8',   border: 'border-mundial-red/15',  text: 'text-red-400/70',      label: 'Fallo',       icon: null },
          { bg: 'bg-white/5',         border: 'border-white/10',        text: 'text-zinc-400',        label: 'Pendiente',   icon: <Clock size={9} /> },
          { bg: 'bg-amber-500/8',     border: 'border-amber-500/20',    text: 'text-amber-500/80',    label: 'Sin resultado', icon: null },
        ].map(({ bg, border, text, label, icon }) => (
          <span key={label} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${bg} ${border} text-[9px] font-black uppercase tracking-widest ${text}`}>
            {icon}{label}
          </span>
        ))}
      </div>

      {/* Tabla scrollable */}
      <div className="card overflow-hidden bg-white/5 border border-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/8">
                {/* Col fija: jugador */}
                <th className="sticky left-0 z-10 bg-mundial-navyLight px-4 py-3 text-left min-w-[130px] border-r border-white/8">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Jugador</span>
                </th>
                {/* Una col por partido */}
                {matches.map(match => {
                  const homeCode = match.teamHome?.code?.toUpperCase() || '?'
                  const awayCode = match.teamAway?.code?.toUpperCase() || '?'
                  const isFinished = match.status === 'FINISHED'
                  const awaiting = isAwaitingResult(match)
                  return (
                    <th key={match.id} className="px-2 py-2 min-w-[70px] text-center border-r border-white/5 last:border-r-0">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <TeamFlag team={match.teamHome} />
                          <span className="text-[8px] font-black text-white/80">{homeCode}</span>
                        </div>
                        {isFinished ? (
                          <span className="text-[10px] font-display text-mundial-gold leading-none">
                            {match.scoreHome}–{match.scoreAway}
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
                <th className="sticky right-0 z-10 bg-mundial-navyLight px-3 py-3 text-center min-w-[60px] border-l border-white/8">
                  <span className="text-[9px] font-black text-mundial-gold uppercase tracking-widest">PTS</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member, idx) => {
                const userPreds = predMap[member.userId] || {}
                return (
                  <motion.tr
                    key={member.userId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors"
                  >
                    {/* Nombre */}
                    <td className="sticky left-0 z-10 bg-mundial-navy px-4 py-2.5 border-r border-white/8">
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
                    {matches.map(match => (
                      <td key={match.id} className="px-1.5 py-2 text-center border-r border-white/5 last:border-r-0">
                        <div className="flex justify-center">
                          <PointsBadge
                            pred={userPreds[match.id]}
                            match={match}
                          />
                        </div>
                      </td>
                    ))}
                    {/* Total */}
                    <td className="sticky right-0 z-10 bg-mundial-navy px-3 py-2 text-center border-l border-white/8">
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
        Se muestran pronósticos de partidos con apuesta cerrada · "Pend." = partido sin resultado aún · Los puntos se calculan cuando el admin ingresa el resultado final
      </p>
        </>
      )}
    </motion.div>
  )
}

function TournamentCompare({ rows, isLoading, teamById }) {
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
        />
      ))}
    </div>
  )
}

function TournamentOpponentCard({ member, picks, error, teamById }) {
  const byId = (id) => teamById.get(id)
  const list = (ids = []) => ids.map(byId).filter(Boolean)

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
        {picks?.pointsTotal > 0 && (
          <span className="w-fit rounded-xl border border-mundial-gold/25 bg-mundial-gold/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-mundial-gold">
            {picks.pointsTotal} pts
          </span>
        )}
      </div>

      {error ? (
        <div className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
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
      )}
    </article>
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
        {teams.slice(0, 12).map(team => (
          <div key={team.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
            <TeamFlag team={team} />
            <span className="truncate text-[9px] font-black uppercase text-zinc-400">{teamEsp(team)}</span>
          </div>
        ))}
      </div>
      {teams.length > 12 && (
        <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">+{teams.length - 12} más</p>
      )}
    </div>
  )
}
