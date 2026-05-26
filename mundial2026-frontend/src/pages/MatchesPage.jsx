import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import MatchDetailPage from './MatchDetailPage'
import { useQuery } from '@tanstack/react-query'
import { matchApi, predictionApi } from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { Calendar, Trophy, Filter, CheckCircle2, Target, Wifi, Star } from 'lucide-react'

// --- Constants & Utils ---

const PHASES = [
  { value: '', label: 'TODOS' },
  { value: 'GROUP', label: 'GRUPOS' },
  { value: 'R32', label: '16vos' },
  { value: 'R16', label: '8vos' },
  { value: 'QF', label: '4tos' },
  { value: 'SF', label: 'Semis' },
  { value: 'FINAL', label: 'Final' },
]

const STATUS_COLORS = {
  SCHEDULED: 'text-zinc-500 bg-white/5 border-white/5',
  LIVE: 'text-mundial-red bg-mundial-red/10 border-mundial-red/20',
  FINISHED: 'text-zinc-400 bg-white/5 border-white/5',
}

const STATUS_LABELS = {
  SCHEDULED: 'PRÓXIMO',
  LIVE: 'EN VIVO',
  FINISHED: 'FINALIZADO',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

export default function MatchesPage({ groupId }) {
  const [searchParams] = useSearchParams()
  const matchParam = searchParams.get('match')
  const [phase, setPhase] = useState('')
  const [viewMode, setViewMode] = useState('apostado') // 'apostado' | 'real'

  const { data: allMatches = [], isLoading } = useQuery({
    queryKey: ['matches-all'],
    queryFn: () => matchApi.list({}).then(r => r.data),
  })

  // All user predictions (always fetched — needed for list display and standings)
  const { data: allMyPreds = [] } = useQuery({
    queryKey: ['my-predictions-all'],
    queryFn: () => predictionApi.my({}).then(r => r.data),
  })

  // Map: matchId → prediction (all groups, first found wins)
  const allPredMap = useMemo(() => allMyPreds.reduce((acc, p) => {
    if (!acc[p.matchId]) acc[p.matchId] = p; return acc
  }, {}), [allMyPreds])

  // List view always uses raw match data; predictions shown via pred prop in MatchRow
  const listMatches = phase ? allMatches.filter(m => m.phase === phase) : allMatches

  const grouped = listMatches.reduce((acc, m) => {
    const day = format(new Date(m.dateUtc), 'EEEE d MMM', { locale: es })
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})

  // Real standings: only counts FINISHED matches with actual scores
  const realStandings = useMemo(() =>
    buildStandings(allMatches.filter(m => m.phase === 'GROUP')),
    [allMatches])

  // Apostado standings: overlays user predictions on group matches
  const predStandings = useMemo(() =>
    buildStandings(
      allMatches.filter(m => m.phase === 'GROUP').map(m => {
        const pred = allPredMap[m.id]
        if (!pred) return m
        return { ...m, scoreHome: pred.predHome, scoreAway: pred.predAway, status: 'FINISHED' }
      })
    ), [allMatches, allPredMap])

  // All unique group letters from either source, sorted
  const groupLetters = useMemo(() => {
    const set = new Set([
      ...realStandings.map(g => g.letter),
      ...predStandings.map(g => g.letter),
    ])
    return [...set].sort()
  }, [realStandings, predStandings])

  const apostadoCount = Object.keys(allPredMap).length

  // Detalle de partido inline (mantiene GroupDetailPage montado → MENSAJES/AJUSTES visibles)
  if (matchParam && groupId) {
    return <MatchDetailPage matchId={matchParam} groupId={groupId} />
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="pb-24 max-w-4xl mx-auto px-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pt-4">
        <div>
          <h1 className="font-display text-5xl text-white tracking-tight">ENCUENTROS</h1>
          <p className="text-[10px] text-mundial-gold font-extrabold uppercase tracking-[0.4em] mt-2 opacity-80">
            United 2026 • Road to the Final
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <Calendar size={14} className="text-mundial-gold" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{allMatches.length} PARTIDOS</span>
          </div>
        </div>
      </motion.div>

      {/* Real vs Apostado toggle */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10 max-w-xs">
          <button
            onClick={() => setViewMode('apostado')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'apostado'
                ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Target size={12} /> Pronósticos
          </button>
          <button
            onClick={() => setViewMode('real')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'real'
                ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Wifi size={12} /> Real
          </button>
        </div>
        {viewMode === 'apostado' && (
          <p className="mt-2 text-[10px] text-mundial-gold/70 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Target size={10} />
            {apostadoCount} pronóstico{apostadoCount !== 1 ? 's' : ''} registrado{apostadoCount !== 1 ? 's' : ''}
          </p>
        )}
      </motion.div>

      {/* Phase filters */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-6 no-scrollbar mb-8 border-b border-white/5">
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-zinc-500 mr-2">
          <Filter size={16} />
        </div>
        {PHASES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPhase(value)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition-all uppercase tracking-widest border ${
              phase === value
                ? 'bg-mundial-gold text-mundial-navy border-mundial-gold shadow-2xl shadow-mundial-gold/20'
                : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-white/5 border-white/5" />
          ))}
        </div>
      ) : phase === 'GROUP' ? (
        /* ── GROUP STANDINGS VIEW ─────────────────────────────── */
        <div className="space-y-16">
          {groupLetters.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
              <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Cargando grupos...</p>
            </div>
          ) : groupLetters.map(letter => {
            const realRows = realStandings.find(g => g.letter === letter)?.rows || []
            const predRows = predStandings.find(g => g.letter === letter)?.rows || realRows
            return (
              <motion.div key={letter} variants={itemVariants}>
                {/* Group header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-mundial-gold to-mundial-gold/70 text-mundial-navy flex items-center justify-center text-2xl font-black shadow-xl shadow-mundial-gold/10">
                    {letter}
                  </div>
                  <h2 className="font-display text-2xl text-white uppercase tracking-tighter">
                    GRUPO <span className="text-mundial-gold">{letter}</span>
                  </h2>
                </div>

                {/* Two tables side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Real standings */}
                  <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Wifi size={10} /> Real
                    </p>
                    <StandingsTable rows={realRows} gold={false} />
                  </div>

                  {/* Prediction standings */}
                  <div>
                    <p className="text-[9px] font-black text-mundial-gold/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Target size={10} /> Según tus apuestas
                    </p>
                    <StandingsTable rows={predRows} gold={true} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* ── MATCH LIST VIEW ──────────────────────────────────── */
        <div className="space-y-12">
          {Object.entries(grouped).map(([day, dayMatches]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/5" />
                <h2 className="font-mono text-[10px] text-mundial-gold uppercase tracking-[0.3em] font-black whitespace-nowrap">{day}</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/5" />
              </div>
              <div className="grid gap-4">
                {dayMatches.map(match => (
                  <motion.div key={match.id} variants={itemVariants} whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <MatchRow
                      match={match}
                      pred={allPredMap[match.id]}
                      groupId={groupId}
                      apostado={viewMode === 'apostado'}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          {listMatches.length === 0 && (
            <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-white/5">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy size={40} className="text-zinc-700" />
              </div>
              <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold font-mono">No hay jornadas programadas</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

function StandingsTable({ rows, gold }) {
  const th = 'text-center px-1.5 py-2.5'
  const td = 'text-center px-1.5 py-3 font-mono text-[11px] text-zinc-400'
  return (
    <div className={`card overflow-hidden border-b-4 ${gold ? 'border-b-mundial-gold/40' : 'border-b-white/10'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b border-white/5 text-[9px] text-zinc-500 uppercase tracking-widest ${gold ? 'bg-mundial-gold/5' : 'bg-white/5'}`}>
              <th className="text-left px-3 py-2.5 w-6">#</th>
              <th className="text-left px-2 py-2.5">Selección</th>
              <th className={th}>PJ</th>
              <th className={th}>G</th>
              <th className={th}>E</th>
              <th className={th}>P</th>
              <th className={th}>GA</th>
              <th className={th}>GC</th>
              <th className={th}>DG</th>
              <th className={`${th} font-bold ${gold ? 'text-mundial-gold' : 'text-white'}`}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.team.id} className={`border-b border-white/5 last:border-0 ${idx < 2 ? 'bg-mundial-gold/[0.03]' : ''}`}>
                <td className="px-3 py-3 font-mono text-zinc-500 text-[11px]">
                  {idx < 2 ? <Star size={9} className="text-mundial-gold" /> : idx + 1}
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <TeamFlag team={row.team} size="sm" />
                    <span className={`text-[11px] font-bold truncate max-w-[90px] ${idx < 2 ? 'text-white' : 'text-zinc-400'}`}>
                      {row.team.name}
                    </span>
                  </div>
                </td>
                <td className={td}>{row.pj}</td>
                <td className={td}>{row.w}</td>
                <td className={td}>{row.d}</td>
                <td className={td}>{row.l}</td>
                <td className={td}>{row.gf}</td>
                <td className={td}>{row.gc}</td>
                <td className={`${td} ${row.gf-row.gc>0?'text-green-500':row.gf-row.gc<0?'text-red-400':''}`}>
                  {row.gf-row.gc>0?'+':''}{row.gf-row.gc}
                </td>
                <td className={`text-center px-1.5 py-3 font-display text-base font-bold ${gold ? 'text-mundial-gold' : 'text-white'}`}>{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MatchRow({ match, pred, groupId, apostado = false }) {
  const { teamHome, teamAway, scoreHome, scoreAway, status, dateUtc } = match
  const isLive     = status === 'LIVE'
  const isFinished = status === 'FINISHED'
  const hasPred    = !!pred
  // Bonus chips y score verde solo en APOSTADO mode
  const showPred   = apostado && hasPred && !isFinished && !isLive
  const hasBonus   = showPred && (pred.predBtts !== null || pred.predOverUnder !== null)

  // En REAL mode el card no es clickeable — solo se puede apostar desde APOSTADO
  const Wrapper = apostado
    ? ({ children }) => <Link to={groupId ? `/groups/${groupId}?tab=resultados&match=${match.id}` : `/matches/${match.id}`} className="group block">{children}</Link>
    : ({ children }) => <div className="block">{children}</div>

  return (
    <Wrapper>
      <div className={`${apostado ? 'card-hover' : 'card'} flex flex-col relative overflow-hidden
        ${isLive ? 'border-mundial-red/30' : showPred ? 'border-green-500/20' : ''}`}>

        {/* Main row */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-6">

          {/* Time / Status */}
          <div className="w-full sm:w-24 shrink-0 flex sm:flex-col items-center justify-between sm:justify-center border-b sm:border-b-0 sm:border-r border-white/5 pb-4 sm:pb-0 sm:pr-4 gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter uppercase border ${STATUS_COLORS[status]}`}>
              {isLive && <span className="mr-1 inline-block w-1.5 h-1.5 bg-mundial-red rounded-full animate-pulse" />}
              {STATUS_LABELS[status]}
            </span>
            {!isFinished && (
              <p className={`text-lg font-display tracking-tight mt-1 ${isLive ? 'text-mundial-red' : 'text-white'}`}>
                {format(new Date(dateUtc), 'HH:mm')}
              </p>
            )}
          </div>

          {/* Teams + Score */}
          <div className="flex-1 w-full flex items-center justify-between gap-2 sm:gap-6">
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 text-center sm:text-right">
              <span className="order-2 sm:order-1 text-sm font-extrabold text-zinc-100 uppercase tracking-tight line-clamp-1">{teamHome?.name}</span>
              <div className="order-1 sm:order-2"><TeamFlag team={teamHome} size="md" /></div>
            </div>

            {/* Center: marcador real / pronóstico verde (solo apostado) / VS */}
            <div className="shrink-0">
              {isFinished || isLive ? (
                /* Partido terminado o en vivo: marcador real */
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-display text-lg text-white">{scoreHome ?? 0}</div>
                  <span className="text-zinc-600 font-bold text-sm">:</span>
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-display text-lg text-white">{scoreAway ?? 0}</div>
                </div>
              ) : showPred ? (
                /* APOSTADO + próximo + tiene apuesta: marcador verde */
                <div className="flex items-center gap-1">
                  <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center font-display text-lg text-green-400">{pred.predHome}</div>
                  <span className="text-green-700 font-black text-xs">–</span>
                  <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center font-display text-lg text-green-400">{pred.predAway}</div>
                </div>
              ) : (
                /* REAL mode o sin apuesta: VS */
                <div className="px-3 py-1.5 rounded-xl bg-white/5 text-[10px] font-black text-zinc-600 tracking-widest uppercase">VS</div>
              )}
            </div>

            <div className="flex-1 flex flex-col sm:flex-row items-center justify-start gap-2 sm:gap-3 text-center sm:text-left">
              <div className="order-1"><TeamFlag team={teamAway} size="md" /></div>
              <span className="order-2 text-sm font-extrabold text-zinc-100 uppercase tracking-tight line-clamp-1">{teamAway?.name}</span>
            </div>
          </div>

          {/* Action */}
          <div className="w-full sm:w-36 shrink-0 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-4 flex items-center justify-center">
            {showPred ? (
              <span className="flex items-center gap-1.5 text-[9px] font-black text-green-400 uppercase tracking-widest">
                <CheckCircle2 size={13} /> REGISTRADO
              </span>
            ) : apostado ? (
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">VER DETALLE</span>
            ) : null}
          </div>
        </div>

        {/* Bonus chips */}
        {hasBonus && (
          <div className="px-5 sm:px-6 pb-4 pt-3 flex flex-wrap gap-2 border-t border-white/5">
            {pred.predBtts !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold">
                <CheckCircle2 size={9} />
                ¿Marcan ambos? <strong>{pred.predBtts ? 'SÍ' : 'NO'}</strong>
              </span>
            )}
            {pred.predOverUnder !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold">
                <CheckCircle2 size={9} />
                Total Goles (+2.5): <strong>{pred.predOverUnder === 'over' ? 'MÁS' : 'MENOS'}</strong>
              </span>
            )}
          </div>
        )}

        {isLive && <div className="absolute top-0 right-0 w-32 h-32 bg-mundial-red/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />}
      </div>
    </Wrapper>
  )
}

function TeamFlag({ team, size = 'md' }) {
  const flag = team?.flagUrl
  const cls = size === 'sm' ? 'w-6 h-5' : 'w-10 h-8'
  if (flag && (flag.startsWith('http') || flag.startsWith('/'))) {
    return (
      <img
        src={flag}
        alt={team?.name || ''}
        className={`${cls} object-contain drop-shadow-lg`}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return <span className={size === 'sm' ? 'text-lg' : 'text-3xl'}>🏴</span>
}

function buildStandings(matches) {
  const groups = {}

  matches.forEach((m) => {
    const gl = m.groupLetter
    if (!gl) return
    if (!groups[gl]) groups[gl] = {}

    const update = (team, myG, opG) => {
      if (!team) return
      if (!groups[gl][team.id]) {
        groups[gl][team.id] = { team, pj: 0, pts: 0, gf: 0, gc: 0, w: 0, d: 0, l: 0 }
      }
      const st = groups[gl][team.id]
      if (m.status === 'FINISHED') {
        st.pj += 1
        st.gf += (myG || 0)
        st.gc += (opG || 0)
        if (myG > opG)       { st.pts += 3; st.w += 1 }
        else if (myG === opG) { st.pts += 1; st.d += 1 }
        else                  { st.l += 1 }
      }
    }

    update(m.teamHome, m.scoreHome, m.scoreAway)
    update(m.teamAway, m.scoreAway, m.scoreHome)
  })

  return Object.keys(groups).sort().map((letter) => ({
    letter,
    rows: Object.values(groups[letter]).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const dgA = a.gf - a.gc
      const dgB = b.gf - b.gc
      if (dgB !== dgA) return dgB - dgA
      return b.gf - a.gf
    })
  }))
}

