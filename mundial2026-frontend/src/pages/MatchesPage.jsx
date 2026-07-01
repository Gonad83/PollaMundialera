import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import MatchDetailPage from './MatchDetailPage'
import { teamEsp, teamFlagUrl } from '../lib/teams'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { matchApi, predictionApi } from '../lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TZ = 'America/Santiago'
const fmtChileTime = (d) => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: TZ, hour12: false })
const fmtChileDay  = (d) => new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ }).format(new Date(d))
import { motion } from 'framer-motion'
import { Calendar, Trophy, Filter, CheckCircle2, Target, Star, Flame, Check, X, Wifi } from 'lucide-react'

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

const isFriendlyMatch = (match) =>
  match?.phase === 'GROUP' && !match?.groupLetter && match?.city !== 'World'

const isClubTestMatch = (match) => {
  const codes = [match?.teamHome?.code, match?.teamAway?.code]
  return codes.some(code => ['PSG', 'ARS'].includes(code))
}

const isNonWorldCupMatch = (match) => isFriendlyMatch(match) || isClubTestMatch(match)

const REAL_R32_FIXTURE_ORDER = [
  ['GER', 'PAR'], ['FRA', 'SWE'], ['RSA', 'CAN'], ['NED', 'MAR'],
  ['POR', 'CRO'], ['ESP', 'AUT'], ['USA', 'BIH'], ['BEL', 'SEN'],
  ['BRA', 'JPN'], ['CIV', 'NOR'], ['MEX', 'ECU'], ['ENG', 'COD'],
  ['ARG', 'CPV'], ['AUS', 'EGY'], ['SUI', 'ALG'], ['COL', 'GHA'],
]

const r32PairKey = (codes) => codes.filter(Boolean).map(code => code.toUpperCase()).sort().join('-')
const REAL_R32_FIXTURE_INDEX = new Map(
  REAL_R32_FIXTURE_ORDER.map((pair, index) => [r32PairKey(pair), index])
)

const STATUS_ORDER = { LIVE: 0, SCHEDULED: 1, FINISHED: 2 }

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

export default function MatchesPage({ groupId, initialViewMode = 'apostado', hideViewModeSwitcher = false }) {
  const [searchParams] = useSearchParams()
  const matchParam = searchParams.get('match')
  const [phase, setPhase] = useState('')
  const [viewMode, setViewMode] = useState(initialViewMode) // 'apostado' | 'fixture'

  const qc = useQueryClient()

  // Cuando el servidor despierta del cold start → refetch inmediato de queries fallidas
  useEffect(() => {
    const handler = () => {
      qc.refetchQueries({ queryKey: ['matches-all'] })
      qc.refetchQueries({ queryKey: ['my-predictions-all', groupId ?? 'global'] })
    }
    window.addEventListener('server:awake', handler)
    return () => window.removeEventListener('server:awake', handler)
  }, [qc, groupId])

  useEffect(() => {
    setViewMode(initialViewMode)
  }, [initialViewMode])

  const { data: allMatches = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['matches-all'],
    queryFn: () => matchApi.list({}).then(r => r.data),
    staleTime: 3 * 60 * 1000,   // 3 min: visitas repetidas ven datos en caché al instante
    gcTime: 60 * 60 * 1000,     // 1h: datos sobreviven navegación entre tabs
    // Auto-refresh cada 30 segundos cuando hay al menos un partido EN VIVO
    refetchInterval: (query) =>
      query.state.data?.some(m => m.status === 'LIVE') ? 30_000 : false,
  })

  const worldCupMatches = useMemo(() => allMatches.filter(m => !isNonWorldCupMatch(m)), [allMatches])
  const worldCupMatchIds = useMemo(() => new Set(worldCupMatches.map(m => m.id)), [worldCupMatches])
  const hasLive = worldCupMatches.some(m => m.status === 'LIVE')

  // Predicciones del usuario — filtradas por grupo si hay groupId
  // Esto evita que se muestre el pronóstico de otro grupo para el mismo partido
  const { data: allMyPreds = [] } = useQuery({
    queryKey: ['my-predictions-all', groupId ?? 'global'],
    queryFn: () => predictionApi.my(groupId ? { groupId } : {}).then(r => r.data),
    staleTime: 2 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  // Map: matchId → prediction del grupo actual (o global si no hay grupo)
  const allPredMap = useMemo(() => {
    const map = {}
    // Primero indexar todas las predicciones
    allMyPreds.forEach(p => { if (!map[p.matchId]) map[p.matchId] = p })
    // Si hay groupId, priorizar las del grupo actual sobre las de otros grupos
    if (groupId) {
      allMyPreds.forEach(p => {
        if (p.groupId === groupId) map[p.matchId] = p
      })
    }
    return map
  }, [allMyPreds, groupId])

  // List view always uses raw match data; predictions shown via pred prop in MatchRow
  const listMatches = phase
    ? worldCupMatches.filter(m => m.phase === phase)
    : worldCupMatches

  // Fase actual del Mundial: la primera (en orden) que todavía tiene partidos por jugar.
  const currentPhase = useMemo(() => {
    const order = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'FINAL']
    const real = worldCupMatches.filter(m => !isFriendlyMatch(m))
    for (const ph of order) {
      const inPhase = real.filter(m => m.phase === ph)
      if (inPhase.length && inPhase.some(m => m.status !== 'FINISHED')) return ph
    }
    for (let i = order.length - 1; i >= 0; i--) {
      if (real.some(m => m.phase === order[i])) return order[i]
    }
    return ''
  }, [worldCupMatches])

  // Al entrar a Pronóstico Partidos, arrancar en la fase actual del torneo (no en "Todos").
  const didInitPhase = useRef(false)
  useEffect(() => {
    if (!didInitPhase.current && worldCupMatches.length && currentPhase) {
      didInitPhase.current = true
      setPhase(currentPhase)
    }
  }, [worldCupMatches, currentPhase])

  const grouped = listMatches.reduce((acc, m) => {
    const day = fmtChileDay(m.dateUtc)
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})

  // Primer partido por jugar (en vivo o próximo). Es el ancla donde se posiciona la vista
  // al entrar: así siempre se ven los partidos que vienen, y para ver los pasados se sube el scroll.
  const anchorMatchId = useMemo(() => {
    if (!listMatches.length) return null
    const live = listMatches.find(m => m.status === 'LIVE')
    if (live) return live.id
    const now = Date.now()
    // El próximo por jugarse: primer partido no finalizado cuya fecha aún no pasó.
    const upcoming =
      listMatches.find(m => m.status !== 'FINISHED' && new Date(m.dateUtc).getTime() >= now)
      ?? listMatches.find(m => m.status !== 'FINISHED')
    return (upcoming ?? listMatches[listMatches.length - 1]).id
  }, [listMatches])

  // Posicionar la vista en el próximo partido al cargar. Reintenta hasta encontrar el
  // elemento (espera a que termine la animación de entrada) y solo lo hace una vez,
  // para no pelear con el scroll manual del usuario.
  const didAutoScroll = useRef(false)
  useEffect(() => { didAutoScroll.current = false }, [groupId])
  useEffect(() => {
    if (didAutoScroll.current || isLoading || !anchorMatchId) return
    let cancelled = false
    let tries = 0
    const tryScroll = () => {
      if (cancelled || didAutoScroll.current) return
      const el = document.getElementById(`match-card-${anchorMatchId}`)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        didAutoScroll.current = true
        return
      }
      if (++tries < 20) setTimeout(tryScroll, 100)
    }
    const t = setTimeout(tryScroll, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [isLoading, anchorMatchId, groupId])

  // Real standings: only counts FINISHED matches with actual scores
  const realStandings = useMemo(() =>
    buildStandings(worldCupMatches.filter(m => m.phase === 'GROUP')),
    [worldCupMatches])

  // Apostado standings: overlays user predictions on group matches
  const predStandings = useMemo(() =>
    buildStandings(
      worldCupMatches.filter(m => m.phase === 'GROUP').map(m => {
        const pred = allPredMap[m.id]
        if (!pred) return m
        return { ...m, scoreHome: pred.predHome, scoreAway: pred.predAway, status: 'FINISHED' }
      })
    ), [worldCupMatches, allPredMap])

  // All unique group letters from either source, sorted
  const groupLetters = useMemo(() => {
    const set = new Set([
      ...realStandings.map(g => g.letter),
      ...predStandings.map(g => g.letter),
    ])
    return [...set].sort()
  }, [realStandings, predStandings])

  const apostadoCount = Object.values(allPredMap).filter(p => worldCupMatchIds.has(p.matchId)).length
  const showToolbar = !hideViewModeSwitcher || viewMode !== 'fixture'

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
        <div className="flex items-center gap-2 flex-wrap">
          {hasLive && (
            <div className="px-3 py-2 bg-mundial-red/10 border border-mundial-red/25 rounded-2xl flex items-center gap-2">
              <span className={`w-1.5 h-1.5 bg-mundial-red rounded-full ${isFetching ? 'animate-ping' : 'animate-pulse'}`} />
              <span className="text-[9px] text-mundial-red font-black uppercase tracking-widest">
                {isFetching ? 'Actualizando…' : `Vivo · ${new Date(dataUpdatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
              </span>
            </div>
          )}
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <Calendar size={14} className="text-mundial-gold" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{worldCupMatches.length} PARTIDOS</span>
          </div>
        </div>
      </motion.div>

      {/* Toolbar unificado: modo de vista + filtros de fase en una sola fila */}
      {showToolbar && (
      <motion.div variants={itemVariants} className="mb-8 border-b border-white/5 pb-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Modo de vista */}
          {!hideViewModeSwitcher && (
          <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('apostado')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'apostado'
                  ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Target size={12} /> Pronósticos
            </button>
            <button
              onClick={() => setViewMode('fixture')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'fixture'
                  ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Trophy size={12} /> Fixture
            </button>
          </div>
          )}

          {/* En modo Fixture no aplican los filtros de fase (el bracket muestra todas) */}
          {viewMode !== 'fixture' && (
            <>
          {/* Separador en desktop */}
          {!hideViewModeSwitcher && <span className="hidden sm:block w-px h-7 bg-white/10 shrink-0" aria-hidden="true" />}

          {/* Filtros de fase */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/5 text-zinc-500">
              <Filter size={15} />
            </div>
            {PHASES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPhase(value)}
                className={`px-4 py-2 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition-all uppercase tracking-widest border shrink-0 ${
                  phase === value
                    ? 'bg-mundial-gold text-mundial-navy border-mundial-gold shadow-2xl shadow-mundial-gold/20'
                    : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
            </>
          )}
        </div>

        {/* Hint de pronósticos registrados */}
        {viewMode === 'apostado' && (
          <p className="text-[10px] text-mundial-gold/70 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Target size={10} />
            {apostadoCount} pronóstico{apostadoCount !== 1 ? 's' : ''} registrado{apostadoCount !== 1 ? 's' : ''}
          </p>
        )}
      </motion.div>
      )}

      {isLoading ? (
        <MatchesSkeleton />
      ) : viewMode === 'fixture' ? (
        <FixtureBracketSports matches={worldCupMatches} />
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
                  <motion.div key={match.id} id={`match-card-${match.id}`} style={match.id === anchorMatchId ? { scrollMarginTop: '170px' } : undefined} variants={itemVariants} whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
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
                      {teamEsp(row.team)}
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

function predResult(pred) {
  if (!pred) return null
  const pts = pred.pointsTotal || 0
  if ((pred.pointsExact || 0) >= 5) return { icon: Flame,     label: 'Exacto',     cls: 'text-mundial-gold', pts }
  if ((pred.pointsWinner || 0) > 0) return { icon: Check,     label: 'Ganador',    cls: 'text-green-400',    pts }
  return                                    { icon: X,         label: 'Fallo',      cls: 'text-zinc-600',     pts }
}

function MatchesSkeleton() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="grid gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card h-28 animate-pulse bg-white/5 border-white/5" />
      ))}
      {slow && (
        <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <p className="text-[11px] text-amber-400 font-black uppercase tracking-widest">Despertando el servidor…</p>
          <p className="text-[10px] text-zinc-500 font-bold">Railway tarda ~30-60s en el primer acceso. Ya casi.</p>
        </div>
      )}
    </div>
  )
}

function MatchRow({ match, pred, groupId, apostado = false }) {
  const { teamHome, teamAway, scoreHome, scoreAway, status, dateUtc, wentToPenalties, penaltyHome, penaltyAway } = match
  const isLive     = status === 'LIVE'
  const isFinished = status === 'FINISHED'
  const isFriendly = isFriendlyMatch(match)
  const hasPred    = !!pred
  // Bonus chips y score verde solo en APOSTADO mode
  const showPred   = apostado && hasPred && !isFinished && !isLive
  const showResult = apostado && hasPred && isFinished
  const result     = showResult ? predResult(pred) : null
  const hasBonus   = showPred && (pred.predBtts !== null || pred.predOverUnder !== null)

  // En REAL mode el card no es clickeable — solo se puede apostar desde APOSTADO
  const Wrapper = apostado
    ? ({ children }) => <Link to={groupId ? `/groups/${groupId}?tab=resultados&match=${match.id}` : `/matches/${match.id}`} className="group block">{children}</Link>
    : ({ children }) => <div className="block">{children}</div>

  return (
    <Wrapper>
      <div className={`${apostado ? 'card-hover' : 'card'} flex flex-col relative overflow-hidden
        ${isFriendly ? 'border-sky-400/25' : isLive ? 'border-mundial-red/30' : showPred ? 'border-green-500/20' :
          showResult && result ? (
            result.pts >= 5 ? 'border-mundial-gold/20' :
            result.pts >= 3 ? 'border-blue-500/20' :
            result.pts >= 1 ? 'border-green-500/15' : ''
          ) : ''}`}>

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
                {fmtChileTime(dateUtc)}
              </p>
            )}
            {isFriendly && (
              <span className="px-2 py-0.5 rounded-full bg-sky-400/10 border border-sky-400/20 text-[8px] font-black uppercase tracking-widest text-sky-300">
                Amistoso
              </span>
            )}
          </div>

          {/* Teams + Score */}
          <div className="flex-1 w-full flex items-center justify-between gap-2 sm:gap-6">
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 text-center sm:text-right">
              <span className="order-2 sm:order-1 text-sm font-extrabold text-zinc-100 uppercase tracking-tight line-clamp-1">{teamHome?.name}</span>
              <div className="order-1 sm:order-2"><TeamFlag team={teamHome} size="md" /></div>
            </div>

            {/* Center: marcador real / pronóstico verde (solo apostado) / VS */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              {isFinished || isLive ? (
                /* Partido terminado o en vivo: marcador real + apuesta */
                <div className="flex flex-col items-center gap-1.5">
                  {/* Resultado real */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-display text-lg text-white">{scoreHome ?? 0}</div>
                    <span className="text-zinc-600 font-bold text-sm">:</span>
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-display text-lg text-white">{scoreAway ?? 0}</div>
                  </div>
                  {wentToPenalties && penaltyHome != null && penaltyAway != null && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">pen {penaltyHome}-{penaltyAway}</span>
                  )}
                  {/* Apuesta del usuario */}
                  {showResult && pred && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">apostaste:</span>
                      <span className="text-[10px] font-display text-zinc-300 font-bold">{pred.predHome}–{pred.predAway}</span>
                    </div>
                  )}
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
            {showResult && result ? (
              <div className="flex flex-col items-center gap-1">
                <span className={`font-display text-2xl leading-none ${result.pts > 0 ? result.cls : 'text-zinc-600'}`}>
                  {result.pts > 0 ? `+${result.pts}` : '0'}
                </span>
                <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest ${result.cls}`}>
                  <result.icon size={9} /> {result.label}
                </span>
              </div>
            ) : showPred ? (
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

function teamWinner(match) {
  if (!match || match.status !== 'FINISHED' || !match.winnerId) return null
  return match.winnerId === match.teamHomeId ? match.teamHome
    : match.winnerId === match.teamAwayId ? match.teamAway : null
}

// Fixture real del Mundial: cuadro oficial de dos lados (Dieciseisavos → Final → Dieciseisavos).
// Se arma emparejando los partidos consecutivos por su id externo (= orden del bracket FIFA):
// los primeros 8 de 16avos son el lado izquierdo, los últimos 8 el derecho; cada par consecutivo
// alimenta el siguiente cruce. El que avanza queda resaltado; lo que falta, "—". Se llena solo.
function FixtureBracketSports({ matches }) {
  const real = matches.filter(m => !isFriendlyMatch(m))
  const findMatch = (round, a, b) =>
    (a && b)
      ? (real.find(m => m.phase === round &&
          ((m.teamHomeId === a.id && m.teamAwayId === b.id) || (m.teamHomeId === b.id && m.teamAwayId === a.id))) || null)
      : null

  const fixtureOrder = (m) => {
    const officialIndex = REAL_R32_FIXTURE_INDEX.get(r32PairKey([m.teamHome?.code, m.teamAway?.code]))
    if (officialIndex >= 0) return officialIndex
    return new Date(m.dateUtc).getTime() || 0
  }
  const leaf = (m) => {
    if (!m) return { teamA: null, teamB: null, match: null, winner: null }

    const officialIndex = REAL_R32_FIXTURE_INDEX.get(r32PairKey([m.teamHome?.code, m.teamAway?.code]))
    const [firstCode, secondCode] = REAL_R32_FIXTURE_ORDER[officialIndex] || []
    const homeCode = m.teamHome?.code?.toUpperCase()
    const awayCode = m.teamAway?.code?.toUpperCase()
    const teamA = homeCode === firstCode ? m.teamHome : awayCode === firstCode ? m.teamAway : m.teamHome
    const teamB = homeCode === secondCode ? m.teamHome : awayCode === secondCode ? m.teamAway : m.teamAway

    return { teamA, teamB, match: m, winner: teamWinner(m) }
  }
  const node = (round, a, b) => {
    const teamA = a?.winner || null
    const teamB = b?.winner || null
    const match = findMatch(round, teamA, teamB)
    return { teamA, teamB, match, winner: teamWinner(match) }
  }

  const r32 = real
    .filter(m => m.phase === 'R32')
    .sort((a, b) => fixtureOrder(a) - fixtureOrder(b))
    .map(leaf)
  while (r32.length < 16) r32.push(leaf(null))

  const buildSide = (side) => {
    const r16 = [node('R16', side[0], side[1]), node('R16', side[2], side[3]), node('R16', side[4], side[5]), node('R16', side[6], side[7])]
    const qf = [node('QF', r16[0], r16[1]), node('QF', r16[2], r16[3])]
    const sf = [node('SF', qf[0], qf[1])]
    return { r32: side, r16, qf, sf }
  }

  const left = buildSide(r32.slice(0, 8))
  const right = buildSide(r32.slice(8, 16))
  const final = node('FINAL', left.sf[0], right.sf[0])
  const champion = final.winner
  const semifinalLoser = (n) => {
    const match = n.match
    if (!match || match.status !== 'FINISHED' || !match.winnerId) return null
    return match.winnerId === match.teamHomeId ? match.teamAway : match.teamHome
  }
  const third = { teamA: semifinalLoser(left.sf[0]), teamB: semifinalLoser(right.sf[0]), match: null, winner: null }

  const H = 620
  const SLOT_W = 154
  const CONN_W = 36
  const CENTER_W = 172
  const line = 'rgba(34,197,94,0.46)'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="-mx-4 overflow-x-auto no-scrollbar px-4 pb-4">
      <div className="relative min-w-max overflow-hidden rounded-2xl border border-white/10 bg-[#07171f] p-4 shadow-2xl shadow-black/30">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.12),transparent_34%),linear-gradient(90deg,rgba(34,197,94,0.07),transparent_22%,transparent_78%,rgba(34,197,94,0.07))]" />
        <div className="relative mb-3 flex items-center text-center">
          <BracketHead label="16vos" width={SLOT_W} />
          <Spacer width={CONN_W} />
          <BracketHead label="8vos" width={SLOT_W} />
          <Spacer width={CONN_W} />
          <BracketHead label="4tos" width={SLOT_W} />
          <Spacer width={CONN_W} />
          <BracketHead label="Semis" width={SLOT_W} />
          <Spacer width={CONN_W} />
          <BracketHead label="Final" width={CENTER_W} final />
          <Spacer width={CONN_W} />
          <BracketHead label="Semis" width={SLOT_W} />
          <Spacer width={CONN_W} />
          <BracketHead label="4tos" width={SLOT_W} />
          <Spacer width={CONN_W} />
          <BracketHead label="8vos" width={SLOT_W} />
          <Spacer width={CONN_W} />
          <BracketHead label="16vos" width={SLOT_W} />
        </div>
        <div className="relative flex items-stretch">
          <BracketRoundColumn nodes={left.r32} count={8} height={H} width={SLOT_W} />
          <BracketConnector fromCount={8} toCount={4} height={H} width={CONN_W} dir="ltr" stroke={line} />
          <BracketRoundColumn nodes={left.r16} count={4} height={H} width={SLOT_W} />
          <BracketConnector fromCount={4} toCount={2} height={H} width={CONN_W} dir="ltr" stroke={line} />
          <BracketRoundColumn nodes={left.qf} count={2} height={H} width={SLOT_W} />
          <BracketConnector fromCount={2} toCount={1} height={H} width={CONN_W} dir="ltr" stroke={line} />
          <BracketRoundColumn nodes={left.sf} count={1} height={H} width={SLOT_W} />
          <CenterLine height={H} width={CONN_W} stroke={line} />
          <BracketCenter final={final} third={third} champion={champion} height={H} width={CENTER_W} />
          <CenterLine height={H} width={CONN_W} stroke={line} />
          <BracketRoundColumn nodes={right.sf} count={1} height={H} width={SLOT_W} />
          <BracketConnector fromCount={2} toCount={1} height={H} width={CONN_W} dir="rtl" stroke={line} />
          <BracketRoundColumn nodes={right.qf} count={2} height={H} width={SLOT_W} />
          <BracketConnector fromCount={4} toCount={2} height={H} width={CONN_W} dir="rtl" stroke={line} />
          <BracketRoundColumn nodes={right.r16} count={4} height={H} width={SLOT_W} />
          <BracketConnector fromCount={8} toCount={4} height={H} width={CONN_W} dir="rtl" stroke={line} />
          <BracketRoundColumn nodes={right.r32} count={8} height={H} width={SLOT_W} />
        </div>
      </div>
    </motion.div>
  )
}

function Spacer({ width }) {
  return <div className="shrink-0" style={{ width }} />
}

function BracketHead({ label, width, final = false }) {
  return (
    <div className={`shrink-0 text-[10px] font-black uppercase tracking-[0.22em] ${final ? 'text-mundial-gold' : 'text-green-300'}`} style={{ width }}>
      {label}
    </div>
  )
}

function BracketRoundColumn({ nodes, count, height, width }) {
  const slotH = height / count
  return (
    <div className="relative shrink-0" style={{ height, width }}>
      {Array(count).fill(null).map((_, i) => (
        <div key={i} className="absolute flex items-center justify-center" style={{ top: i * slotH, height: slotH, width }}>
          <BracketSlotSports node={nodes[i]} />
        </div>
      ))}
    </div>
  )
}

function BracketConnector({ fromCount, toCount, height, width, dir, stroke }) {
  const fH = height / fromCount
  const tH = height / toCount
  const mid = width / 2
  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible">
      {Array(toCount).fill(null).map((_, ti) => {
        const y1 = (ti * 2 + 0.5) * fH
        const y2 = (ti * 2 + 1.5) * fH
        const ty = (ti + 0.5) * tH
        return dir === 'ltr' ? (
          <g key={ti}>
            <line x1={0} y1={y1} x2={mid} y2={y1} stroke={stroke} strokeWidth={1.5} />
            <line x1={0} y1={y2} x2={mid} y2={y2} stroke={stroke} strokeWidth={1.5} />
            <line x1={mid} y1={y1} x2={mid} y2={y2} stroke={stroke} strokeWidth={1.5} />
            <line x1={mid} y1={ty} x2={width} y2={ty} stroke={stroke} strokeWidth={1.5} />
          </g>
        ) : (
          <g key={ti}>
            <line x1={width} y1={y1} x2={mid} y2={y1} stroke={stroke} strokeWidth={1.5} />
            <line x1={width} y1={y2} x2={mid} y2={y2} stroke={stroke} strokeWidth={1.5} />
            <line x1={mid} y1={y1} x2={mid} y2={y2} stroke={stroke} strokeWidth={1.5} />
            <line x1={mid} y1={ty} x2={0} y2={ty} stroke={stroke} strokeWidth={1.5} />
          </g>
        )
      })}
    </svg>
  )
}

function CenterLine({ height, width, stroke }) {
  return (
    <svg width={width} height={height} className="shrink-0">
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={stroke} strokeWidth={1.5} />
    </svg>
  )
}

function BracketCenter({ final, third, champion, height, width }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-5" style={{ height, width }}>
      <div className="w-full">
        <p className="mb-1.5 text-center text-[8px] font-black uppercase tracking-widest text-mundial-gold">Gran final</p>
        <BracketSlotSports node={final} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-mundial-gold/30 bg-mundial-gold/10 shadow-[0_0_35px_rgba(255,215,0,0.16)]">
          <Trophy size={36} className="text-mundial-gold" />
        </div>
        <span className="font-display text-2xl leading-none text-white">2026</span>
        {champion ? (
          <div className="mt-1 flex items-center gap-1.5 rounded-full border border-mundial-gold/25 bg-mundial-gold/10 px-2.5 py-1">
            <TeamFlag team={champion} size="sm" />
            <span className="text-[10px] font-black uppercase tracking-widest text-mundial-gold">{champion.code}</span>
          </div>
        ) : (
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Campeón</span>
        )}
      </div>
      <div className="w-full">
        <p className="mb-1.5 text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">Tercer puesto</p>
        <BracketSlotSports node={third} />
      </div>
    </div>
  )
}

function BracketSlotSports({ node }) {
  const safeNode = node || { teamA: null, teamB: null, match: null, winner: null }
  const m = safeNode.match
  const finished = m && m.status === 'FINISHED'
  const wentToPenalties = m && m.wentToPenalties
  const hTeam = m ? m.teamHome : safeNode.teamA
  const aTeam = m ? m.teamAway : safeNode.teamB
  const active = hTeam && aTeam
  const shortName = (team) => team ? teamEsp(team).replace(/^Estados Unidos$/i, 'EE.UU.') : 'Por definir'
  const row = (team, score, pen, won) => (
    <div className={`flex h-7 items-center justify-between gap-1.5 px-2 ${won ? 'bg-mundial-gold/10' : ''}`}>
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {team && <TeamFlag team={team} size="sm" />}
        <span className={`truncate text-[9px] font-black uppercase ${won ? 'text-mundial-gold' : team ? (finished ? 'text-zinc-400' : 'text-zinc-100') : 'text-zinc-600'}`}>
          {team ? `${team.code?.toUpperCase()} · ${shortName(team)}` : 'Por definir'}
        </span>
      </div>
      {m && (
        <span className={`shrink-0 font-display text-[11px] ${won ? 'text-mundial-gold' : 'text-zinc-500'}`}>
          {finished ? (score ?? 0) : '-'}{finished && wentToPenalties && pen != null && <span className="text-[8px]"> ({pen})</span>}
        </span>
      )}
    </div>
  )
  return (
    <div className={`w-full overflow-hidden rounded-lg border bg-zinc-950/75 shadow-lg shadow-black/20 ${active ? 'border-white/15' : 'border-dashed border-white/10 opacity-70'} ${finished ? 'border-mundial-gold/20' : ''}`}>
      {row(hTeam, m ? m.scoreHome : null, m ? m.penaltyHome : null, finished && m.winnerId === m.teamHomeId)}
      <div className="h-px bg-white/5" />
      {row(aTeam, m ? m.scoreAway : null, m ? m.penaltyAway : null, finished && m.winnerId === m.teamAwayId)}
    </div>
  )
}

function FixtureBracket({ matches }) {
  const NAME = { R32: 'Dieciseisavos de final', R16: 'Octavos de final', QF: 'Cuartos de final', SF: 'Semifinal' }
  const real = matches.filter(m => !isFriendlyMatch(m))
  const findMatch = (round, a, b) =>
    (a && b)
      ? (real.find(m => m.phase === round &&
          ((m.teamHomeId === a.id && m.teamAwayId === b.id) || (m.teamHomeId === b.id && m.teamAwayId === a.id))) || null)
      : null

  const r32node = (m) => ({ teamA: m?.teamHome || null, teamB: m?.teamAway || null, match: m || null, winner: teamWinner(m) })
  const mkNode = (round, fA, fB) => {
    const teamA = fA?.winner || null, teamB = fB?.winner || null
    const m = findMatch(round, teamA, teamB)
    return { teamA, teamB, match: m, winner: teamWinner(m) }
  }

  const r32 = real
    .filter(m => m.phase === 'R32')
    .sort((a, b) => (Number(a.venue) || 0) - (Number(b.venue) || 0))
    .map(r32node)
  while (r32.length < 16) r32.push(r32node(null))
  const L = r32.slice(0, 8), R = r32.slice(8, 16)

  const buildSide = (s) => {
    const r16 = [mkNode('R16', s[0], s[1]), mkNode('R16', s[2], s[3]), mkNode('R16', s[4], s[5]), mkNode('R16', s[6], s[7])]
    const qf = [mkNode('QF', r16[0], r16[1]), mkNode('QF', r16[2], r16[3])]
    const sf = [mkNode('SF', qf[0], qf[1])]
    return { r32: s, r16, qf, sf }
  }
  const Ls = buildSide(L), Rs = buildSide(R)
  const final = mkNode('FINAL', Ls.sf[0], Rs.sf[0])
  const champion = final.winner

  const sfLoser = (n) => {
    const m = n.match
    if (!m || m.status !== 'FINISHED' || !m.winnerId) return null
    return m.winnerId === m.teamHomeId ? m.teamAway : m.teamHome
  }
  const third = { teamA: sfLoser(Ls.sf[0]), teamB: sfLoser(Rs.sf[0]), match: null, winner: null }

  // ── Líneas conectoras (estilo árbol). Cada llave va en un wrapper flex-1: como todas las
  // rondas reparten parejo en la misma altura, cada cruce queda exactamente centrado entre sus
  // dos alimentadores, y los pseudo-elementos dibujan los codos que calzan con el siguiente.
  const feeder = (side, i) => {
    const horiz = side === 'L' ? 'after:left-full after:border-r-2' : 'after:right-full after:border-l-2'
    const elbow = i % 2 === 0
      ? 'after:top-1/2 after:h-1/2 after:border-t-2'   // arriba del par → la línea baja
      : 'after:top-0 after:h-1/2 after:border-b-2'      // abajo del par → la línea sube
    return `after:content-[''] after:absolute after:w-2 after:border-mundial-gold/30 ${horiz} ${elbow}`
  }
  const horizFeeder = (side) => // semifinal → final (1 vs 1): solo línea horizontal
    `after:content-[''] after:absolute after:top-1/2 after:h-0 after:w-2 after:border-t-2 after:border-mundial-gold/30 ${side === 'L' ? 'after:left-full' : 'after:right-full'}`
  const entry = (side) =>       // línea horizontal de entrada al cruce
    `before:content-[''] before:absolute before:top-1/2 before:w-2 before:border-t-2 before:border-mundial-gold/30 ${side === 'L' ? 'before:right-full' : 'before:left-full'}`

  const col = (label, nodes, side, kind) => (
    <div className="flex h-[600px] w-[140px] shrink-0 flex-col">
      <div className="mb-1 flex h-9 shrink-0 items-center justify-center rounded-lg border border-mundial-gold/20 bg-mundial-gold/10 px-1 text-center text-[9px] font-black uppercase leading-tight tracking-widest text-mundial-gold">
        {label}
      </div>
      <div className="flex flex-1 flex-col">
        {nodes.map((n, i) => {
          const conn = `${kind !== 'R32' ? entry(side) : ''} ${kind === 'SF' ? horizFeeder(side) : feeder(side, i)}`
          return (
            <div key={i} className={`relative flex flex-1 items-center ${conn}`}>
              <div className="w-full"><BracketSlot node={n} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto no-scrollbar -mx-4 px-4 pb-3">
      <div className="flex min-w-max items-stretch gap-3">
        {col(NAME.R32, Ls.r32, 'L', 'R32')}
        {col(NAME.R16, Ls.r16, 'L', 'R16')}
        {col(NAME.QF, Ls.qf, 'L', 'QF')}
        {col(NAME.SF, Ls.sf, 'L', 'SF')}

        {/* Centro: Final + emblema + Tercer puesto */}
        <div className="flex h-[600px] w-[160px] shrink-0 flex-col">
          <div className="mb-1 flex h-9 shrink-0 items-center justify-center rounded-lg border border-mundial-gold/40 bg-mundial-gold/15 text-center text-[10px] font-black uppercase tracking-widest text-mundial-gold">
            Final
          </div>
          <div className="flex flex-1 flex-col px-1">
            <div className="flex-1" />
            <div className="relative w-full before:absolute before:right-full before:top-1/2 before:w-2 before:border-t-2 before:border-mundial-gold/30 before:content-[''] after:absolute after:left-full after:top-1/2 after:w-2 after:border-t-2 after:border-mundial-gold/30 after:content-['']">
              <BracketSlot node={final} />
            </div>
            <div className="flex flex-1 flex-col items-center justify-start gap-0.5 pt-3">
              <Trophy size={34} className="text-mundial-gold" />
              <span className="font-display text-base leading-none text-mundial-gold">26</span>
              {champion
                ? <div className="mt-1 flex items-center gap-1.5"><TeamFlag team={champion} size="sm" /><span className="text-[11px] font-black text-mundial-gold">{champion.code?.toUpperCase()}</span></div>
                : <span className="mt-0.5 text-[8px] font-black uppercase tracking-widest text-zinc-600">Campeón</span>}
              <div className="mt-3 w-full">
                <p className="mb-1 text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">Tercer puesto</p>
                <BracketSlot node={third} />
              </div>
            </div>
          </div>
        </div>

        {col(NAME.SF, Rs.sf, 'R', 'SF')}
        {col(NAME.QF, Rs.qf, 'R', 'QF')}
        {col(NAME.R16, Rs.r16, 'R', 'R16')}
        {col(NAME.R32, Rs.r32, 'R', 'R32')}
      </div>
    </motion.div>
  )
}

function BracketSlot({ node }) {
  const m = node.match
  const finished = m && m.status === 'FINISHED'
  const wtp = m && m.wentToPenalties
  const hTeam = m ? m.teamHome : node.teamA
  const aTeam = m ? m.teamAway : node.teamB
  const slotRow = (team, score, pen, won) => (
    <div className={`flex items-center justify-between gap-1.5 px-2 py-1.5 ${won ? 'bg-mundial-gold/10' : ''}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        {team && <TeamFlag team={team} size="sm" />}
        <span className={`text-[10px] font-black ${won ? 'text-mundial-gold' : team ? (finished ? 'text-zinc-500' : 'text-zinc-200') : 'text-zinc-600'}`}>
          {team?.code?.toUpperCase() || '—'}
        </span>
      </div>
      {m && (
        <span className={`font-display text-[10px] ${won ? 'text-mundial-gold' : 'text-zinc-500'}`}>
          {finished ? (score ?? 0) : '–'}{finished && wtp && pen != null && <span className="text-[8px]"> ({pen})</span>}
        </span>
      )}
    </div>
  )
  return (
    <div className={`overflow-hidden rounded-lg border ${m ? 'border-white/10' : 'border-dashed border-white/10'} bg-white/[0.02]`}>
      {slotRow(hTeam, m ? m.scoreHome : null, m ? m.penaltyHome : null, finished && m.winnerId === m.teamHomeId)}
      <div className="h-px bg-white/5" />
      {slotRow(aTeam, m ? m.scoreAway : null, m ? m.penaltyAway : null, finished && m.winnerId === m.teamAwayId)}
    </div>
  )
}

function TeamFlag({ team, size = 'md' }) {
  const flag = teamFlagUrl(team)
  const cls = size === 'sm' ? 'w-6 h-5' : 'w-10 h-8'
  if (flag) {
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
