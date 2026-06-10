import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Minus } from 'lucide-react'
import { predictionApi } from '../lib/api'
import { teamEsp } from '../lib/teams'

// Determina el color de la celda según los puntos
function cellStyle(pred) {
  if (!pred) return { bg: 'bg-white/3', text: 'text-zinc-700', border: 'border-white/5' }
  if (pred.pointsExact >= 5) return { bg: 'bg-mundial-gold/15', text: 'text-mundial-gold', border: 'border-mundial-gold/30' }
  if (pred.pointsWinner > 0) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/25' }
  return { bg: 'bg-mundial-red/8', text: 'text-red-400/70', border: 'border-mundial-red/15' }
}

function PointsBadge({ pred }) {
  if (!pred) return <span className="text-zinc-700 text-[10px]">—</span>
  const { bg, text } = cellStyle(pred)
  return (
    <div className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border ${bg} ${cellStyle(pred).border} min-w-[46px]`}>
      <span className={`font-display text-sm leading-none ${text}`}>
        {pred.predHome}–{pred.predAway}
      </span>
      <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${pred.pointsTotal > 0 ? text : 'text-zinc-700'}`}>
        {pred.pointsTotal > 0 ? `+${pred.pointsTotal}` : '0'}
      </span>
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
  const { data: rawPreds = [], isLoading } = useQuery({
    queryKey: ['group-compare', groupId],
    queryFn: () => predictionApi.compare(groupId).then(r => r.data),
    staleTime: 60_000,
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

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-2xl bg-white/5" />)}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="card p-12 text-center bg-white/5 border border-white/5">
        <BarChart3 size={40} className="mx-auto text-zinc-800 mb-3" />
        <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Sin partidos finalizados aún</p>
        <p className="text-zinc-700 text-[10px] mt-2">La comparativa estará disponible cuando haya partidos terminados.</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Leyenda:</span>
        {[
          { bg: 'bg-mundial-gold/15', border: 'border-mundial-gold/30', text: 'text-mundial-gold', label: 'Exacto' },
          { bg: 'bg-green-500/10',    border: 'border-green-500/25',    text: 'text-green-400',   label: 'Ganador' },
          { bg: 'bg-mundial-red/8',   border: 'border-mundial-red/15',  text: 'text-red-400/70',  label: 'Fallo' },
        ].map(({ bg, border, text, label }) => (
          <span key={label} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${bg} ${border} text-[9px] font-black uppercase tracking-widest ${text}`}>
            {label}
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
                  const homeEsp = teamEsp(match.teamHome)
                  const awayEsp = teamEsp(match.teamAway)
                  const homeCode = match.teamHome?.code?.toUpperCase() || '?'
                  const awayCode = match.teamAway?.code?.toUpperCase() || '?'
                  return (
                    <th key={match.id} className="px-2 py-2 min-w-[70px] text-center border-r border-white/5 last:border-r-0">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <TeamFlag team={match.teamHome} />
                          <span className="text-[8px] font-black text-white/80">{homeCode}</span>
                        </div>
                        <span className="text-[10px] font-display text-mundial-gold leading-none">
                          {match.scoreHome}–{match.scoreAway}
                        </span>
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
                          <PointsBadge pred={userPreds[match.id]} />
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
        Solo se muestran partidos finalizados · Orden: puntos acumulados en partidos con resultado
      </p>
    </motion.div>
  )
}
