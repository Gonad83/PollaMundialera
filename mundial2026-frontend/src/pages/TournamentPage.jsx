import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { tournamentApi, matchApi } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Award, BarChart3, Save, Star, Search, Shield, ChevronRight, Zap, Target, Crown, Users, LockKeyhole } from 'lucide-react'
import { teamEsp } from '../lib/teams'

// Helper: muestra bandera como img si es URL, o emoji/icono si no
const Flag = ({ url, name = '', className = 'w-8 h-6' }) => {
  if (url && (url.startsWith('http') || url.startsWith('/'))) {
    return <img src={url} alt={name} className={`${className} object-contain`} onError={e => { e.target.style.display = 'none' }} />
  }
  return <span>🏴</span>
}

const SECTIONS = [
  { key: 'clasificacion', label: 'CAMINO AL TÍTULO', icon: Trophy },
  { key: 'premios',       label: 'PREMIOS INDIV.',   icon: Award },
  { key: 'estadisticas',  label: 'DATOS MAESTROS',   icon: BarChart3 },
]

// CUR es alias duplicado de Curazao (CUW) — excluir del selector para evitar bandera repetida
// NGA, CRC, BOL son equipos amistosos que no juegan el Mundial
const EXCLUDED_TOURNAMENT_TEAM_CODES = new Set(['NGA', 'CRC', 'BOL', 'CUR'])

const formatDeadlineLabel = (isoStr) => {
  const d = new Date(isoStr)
  const parts = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/Santiago',
  }).formatToParts(d)
  const get = (t) => parts.find(p => p.type === t)?.value ?? ''
  const wd = get('weekday').toUpperCase()
  const day = get('day')
  const mon = get('month').replace('.', '').toUpperCase()
  const yr = new Intl.DateTimeFormat('es-CL', { year: 'numeric', timeZone: 'America/Santiago' }).format(d)
  return `${wd} ${day} ${mon} ${yr} · ${get('hour')}:${get('minute')} HRS CHILE`
}

export default function TournamentPage({ groupId, members = [] }) {
  const qc = useQueryClient()
  const [viewMode, setViewMode] = useState('own') // 'own' | 'compare'
  const [section, setSection] = useState('clasificacion')
  const [saved, setSaved] = useState(false)

  const { data: deadlineData } = useQuery({
    queryKey: ['tournament-deadline'],
    queryFn: () => tournamentApi.deadline().then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const isTournamentLocked = deadlineData?.locked ?? (Date.now() > new Date('2026-06-15T19:00:00.000Z').getTime())
  const TOURNAMENT_DEADLINE_LABEL = deadlineData?.deadline
    ? formatDeadlineLabel(deadlineData.deadline)
    : 'DOMINGO 15 JUN 2026 · 15:00 HRS CHILE'

  // Reapertura ACOTADA de cruces: con el torneo cerrado, el admin puede habilitar
  // editar SOLO 4tos/semis/finalistas. El resto (campeón, premios, etc.) sigue bloqueado.
  const bracketReopen = !!deadlineData?.bracketReopen
  const REOPEN_FIELDS = ['finalist1', 'finalist2', 'semifinalists', 'quarterfinalists']
  // ¿Bloqueado este campo? Abierto → nada bloqueado; cerrado → todo salvo cruces si hay reapertura.
  const lockedField = (key) => isTournamentLocked && !(bracketReopen && REOPEN_FIELDS.includes(key))
  // ¿Puede guardar? (torneo abierto, o reapertura activa)
  const canSubmit = !isTournamentLocked || bracketReopen
  const [form, setForm] = useState({
    champion: null, finalist1: null, finalist2: null,
    round32Teams: [], round16Teams: [], semifinalists: [], quarterfinalists: [], groupQualifiers: [],
    topScorerId: null, bestPlayerId: null, bestKeeperId: null, bestYoungId: null,
    totalGoals: '', mostGoalsTeamId: null, leastGoalsTeamId: null, hostFurthest: null,
  })
  const lockedFinalistIds = bracketReopen && form.champion && [form.finalist1, form.finalist2].includes(form.champion)
    ? [form.champion]
    : []

  const { data: myPicks, isLoading: loadingPicks, isFetched: picksFetched } = useQuery({
    queryKey: ['my-tournament-picks', groupId],
    queryFn: () => tournamentApi.myPicks({ groupId }).then(r => r.data),
    enabled: !!groupId,
    staleTime: 60_000,
    placeholderData: () => {
      try { const c = localStorage.getItem(`tp_${groupId}`); return c ? JSON.parse(c) : undefined } catch { return undefined }
    },
  })

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => matchApi.teams().then(r => r.data),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const tournamentTeams = useMemo(() => {
    // Normaliza quitando tildes/diacríticos para comparar nombres sin importar acentos
    const normalize = (str) =>
      str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

    const preferredCodes = { curazao: 'CUW' }
    const byName = new Map()

    for (const team of teams) {
      if (EXCLUDED_TOURNAMENT_TEAM_CODES.has(team.code?.toUpperCase())) continue

      const displayName = normalize(teamEsp(team))
      if (!displayName) continue

      const current = byName.get(displayName)
      const preferredCode = preferredCodes[displayName]
      const isPreferred = preferredCode && team.code?.toUpperCase() === preferredCode
      const currentIsPreferred = preferredCode && current?.code?.toUpperCase() === preferredCode

      if (!current || (isPreferred && !currentIsPreferred)) {
        byName.set(displayName, team)
      }
    }

    return Array.from(byName.values())
  }, [teams])

  // Listo para guardar: picks confirmados desde el servidor + lista de equipos cargada
  const picksReady = picksFetched && tournamentTeams.length > 0

  useEffect(() => {
    if (myPicks) {
      setForm(f => ({ ...f, ...myPicks }))
      try { localStorage.setItem(`tp_${groupId}`, JSON.stringify(myPicks)) } catch {}
    }
  }, [myPicks, groupId])

  useEffect(() => {
    // Sólo corre cuando la lista de equipos está lista (no depende de myPicks)
    if (!tournamentTeams.length) return

    const validIds = new Set(tournamentTeams.map(t => t.id))
    const keepId = (id) => validIds.has(id) ? id : null
    const keepList = (items = []) => items.filter(id => validIds.has(id))

    setForm(f => ({
      ...f,
      champion: keepId(f.champion),
      finalist1: keepId(f.finalist1),
      finalist2: keepId(f.finalist2),
      round32Teams: keepList(f.round32Teams),
      round16Teams: keepList(f.round16Teams),
      semifinalists: keepList(f.semifinalists),
      quarterfinalists: keepList(f.quarterfinalists),
      groupQualifiers: keepList(f.groupQualifiers),
      hostFurthest: keepId(f.hostFurthest),
      topScorerId: keepId(f.topScorerId),
      bestPlayerId: keepId(f.bestPlayerId),
      bestKeeperId: keepId(f.bestKeeperId),
      bestYoungId: keepId(f.bestYoungId),
      mostGoalsTeamId: keepId(f.mostGoalsTeamId),
      leastGoalsTeamId: keepId(f.leastGoalsTeamId),
    }))
  }, [tournamentTeams])

  const mutation = useMutation({
    mutationFn: (data) => {
      if (!picksReady) throw new Error('Los datos aún no están listos para guardar')
      // El input numérico entrega string — el backend espera número o null
      const rawGoals = data.totalGoals
      const totalGoals = rawGoals === '' || rawGoals == null ? null : Number(rawGoals)
      return tournamentApi.savePicks({
        ...data,
        totalGoals: Number.isFinite(totalGoals) ? totalGoals : null,
        groupId,
      })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-tournament-picks'] })
      try { localStorage.setItem(`tp_${groupId}`, JSON.stringify(res.data ?? res)) } catch {}
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || 'No se pudo guardar el pronóstico. Intenta de nuevo.')
    },
  })

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const toggleArray = (key, id, max) => {
    setForm(f => {
      const arr = f[key] || []
      if (arr.includes(id)) return { ...f, [key]: arr.filter(x => x !== id) }
      if (arr.length >= max) return f
      return { ...f, [key]: [...arr, id] }
    })
  }

  const hosts = tournamentTeams.filter(t => ['USA', 'MEX', 'CAN'].includes(t.code))
  const teamById = useMemo(() => {
    const map = new Map()
    tournamentTeams.forEach(team => map.set(team.id, team))
    return map
  }, [tournamentTeams])

  const visibleMembers = useMemo(() =>
    members.filter(m => m.user?.role !== 'SUPER_ADMIN'),
    [members]
  )

  const { data: compareRows = [], isLoading: loadingCompare } = useQuery({
    queryKey: ['tournament-compare-tab', groupId, visibleMembers.map(m => m.userId).join('|')],
    enabled: viewMode === 'compare' && !!groupId && visibleMembers.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.allSettled(
        visibleMembers.map(m =>
          tournamentApi.userPicks(m.userId, { groupId }).then(r => ({ member: m, picks: r.data }))
        )
      )
      return results.map((r, i) =>
        r.status === 'fulfilled'
          ? r.value
          : { member: visibleMembers[i], error: r.reason?.response?.data?.error || 'No disponible' }
      )
    },
  })

  const { completedCount, totalCount, completionPct } = useMemo(() => {
    const checks = [
      !!form.champion,
      !!form.finalist1,
      !!form.finalist2,
      (form.round32Teams?.length || 0) > 0,
      (form.round16Teams?.length || 0) > 0,
      (form.semifinalists?.length || 0) > 0,
      (form.quarterfinalists?.length || 0) > 0,
      !!form.hostFurthest,
      !!form.topScorerId,
      !!form.bestPlayerId,
      !!form.bestKeeperId,
      !!form.bestYoungId,
      !!form.totalGoals,
      !!form.mostGoalsTeamId,
      !!form.leastGoalsTeamId,
    ]
    const done = checks.filter(Boolean).length
    return { completedCount: done, totalCount: checks.length, completionPct: Math.round((done / checks.length) * 100) }
  }, [form])

  const isTournamentSummaryComplete = useMemo(() => {
    return [
      !!form.champion,
      !!form.finalist1,
      !!form.finalist2,
      (form.round32Teams?.length || 0) === 32,
      (form.round16Teams?.length || 0) === 16,
      (form.quarterfinalists?.length || 0) === 8,
      (form.semifinalists?.length || 0) === 4,
      !!form.hostFurthest,
      !!form.topScorerId,
      !!form.bestPlayerId,
      !!form.bestKeeperId,
      !!form.bestYoungId,
      !!form.totalGoals,
      !!form.mostGoalsTeamId,
      !!form.leastGoalsTeamId,
    ].every(Boolean)
  }, [form])

  if (loadingPicks) return <LoadingSkeleton />

  return (
    <div className="max-w-4xl mx-auto pb-32 px-4">

      {/* Toggle MI PREDICCIÓN / VER GRUPO */}
      <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5 mb-8">
        <button
          onClick={() => setViewMode('own')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
            ${viewMode === 'own' ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20' : 'text-zinc-500 hover:text-white'}`}
        >
          <Trophy size={13} /> Mi Predicción
        </button>
        <button
          onClick={() => setViewMode('compare')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
            ${viewMode === 'compare' ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20' : 'text-zinc-500 hover:text-white'}`}
        >
          <Users size={13} /> Ver Grupo
        </button>
      </div>

      {/* ── VISTA COMPARATIVA DEL GRUPO ── */}
      {viewMode === 'compare' && (
        <TournamentGroupCompare
          rows={compareRows}
          isLoading={loadingCompare}
          teamById={teamById}
        />
      )}

      {/* ── MI PREDICCIÓN ── */}
      {viewMode === 'own' && (<>

      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="flex flex-col flex-1">
          <h1 className="font-display text-4xl text-white tracking-tight uppercase">Predicción Maestra</h1>
          <div className="flex items-center gap-2 mt-1 mb-4">
            <span className="w-2 h-2 bg-mundial-red rounded-full animate-pulse" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Cierre: {TOURNAMENT_DEADLINE_LABEL}</p>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2 max-w-sm">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
              <span className={completionPct === 100 ? 'text-green-400' : completionPct >= 50 ? 'text-amber-400' : 'text-zinc-500'}>
                {completedCount} de {totalCount} pronósticos completados
              </span>
              <span className={`tabular-nums ${completionPct === 100 ? 'text-green-400' : completionPct >= 50 ? 'text-amber-400' : 'text-zinc-600'}`}>
                {completionPct}%
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={`h-full rounded-full ${completionPct === 100 ? 'bg-green-500' : completionPct >= 50 ? 'bg-amber-500' : 'bg-mundial-gold/60'}`}
              />
            </div>
          </div>
        </div>

        <div className="hidden md:block">
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !canSubmit || !picksReady}
              className={`btn-gold px-8 py-4 rounded-2xl flex items-center gap-3 transition-all ${!canSubmit ? 'opacity-60 cursor-not-allowed grayscale' : !picksReady ? 'opacity-50 cursor-not-allowed' : saved ? 'bg-green-500 border-green-400 text-white shadow-green-500/20' : 'shadow-mundial-gold/20'}`}
            >
              {saved ? <Zap size={20} fill="currentColor" /> : <Save size={20} />}
              <span className="font-black tracking-widest text-xs">{!canSubmit ? 'PRONÓSTICO CERRADO' : !picksReady ? 'CARGANDO...' : saved ? '¡GUARDADO!' : mutation.isPending ? 'GUARDANDO...' : bracketReopen ? 'GUARDAR CRUCES' : 'GUARDAR CAMBIOS'}</span>
            </button>
        </div>
      </div>

      {/* Aviso de reapertura acotada de cruces */}
      {bracketReopen && (
        <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="text-sm font-black text-amber-300 uppercase tracking-wide">🔓 Rectificación de cruces abierta</p>
          <p className="text-[11px] text-amber-100/80 font-bold mt-1 leading-relaxed">
            Solo puedes corregir <strong>Finalistas, Semifinales y Cuartos</strong> (lo que el simulador mostró mal).
            El campeón, premios y todo lo demás quedan bloqueados. No olvides apretar <strong>Guardar</strong>.
          </p>
        </div>
      )}

      {/* Points Summary Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Título Mundial', pts: 30, icon: Crown, value: !!form.champion },
          { label: 'Bota de Oro', pts: 20, icon: Target, value: !!form.topScorerId },
          { label: 'Fase de Grupos', pts: 48, icon: Shield, value: form.groupQualifiers?.length > 0 },
        ].map((item, idx) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`card p-6 flex items-center justify-between group overflow-hidden relative ${item.value ? 'border-mundial-gold/30 bg-mundial-gold/5' : ''}`}
          >
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">{item.label}</span>
               <div className="flex items-center gap-2">
                  <item.icon size={18} className={item.value ? 'text-mundial-gold' : 'text-zinc-700'} />
                  <span className={`font-display text-2xl ${item.value ? 'text-white' : 'text-zinc-800'}`}>{item.pts} <span className="text-[10px] uppercase font-black text-zinc-500">pts</span></span>
               </div>
            </div>
            {item.value && <div className="w-8 h-8 rounded-full bg-mundial-gold/20 flex items-center justify-center text-mundial-gold"><Zap size={14} fill="currentColor" /></div>}
          </motion.div>
        ))}
      </div>

      {/* Modern Section Tabs — móvil: 3 columnas con ícono arriba, desktop: pills */}
      <div className="grid grid-cols-3 sm:flex p-1.5 gap-1 sm:gap-0 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl mb-8 md:mb-12">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`sm:flex-1 sm:min-w-[140px] py-3 sm:py-4 px-1 sm:px-4 rounded-2xl sm:rounded-3xl text-[8px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-[0.2em] transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3
              ${section === s.key
                ? 'bg-mundial-gold text-mundial-navy shadow-2xl shadow-mundial-gold/20'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <s.icon size={16} />
            <span className="leading-none text-center">{s.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={section}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {section === 'clasificacion' && (
            <div className="space-y-12">
              <PickSection title="Copa del Mundo" subtitle="Acertar el campeón suma 30 puntos vitales" pts="30 PTS" icon={Crown}>
                <KnockoutStage
                  title="Campeón"
                  detail="1 selección · 30 pts"
                  selectedCount={form.champion ? 1 : 0}
                  max={1}
                >
                  <TeamGrid
                    teams={tournamentTeams}
                    selected={form.champion ? [form.champion] : []}
                    onToggle={(id) => set('champion')(form.champion === id ? null : id)}
                    locked={lockedField('champion')}
                  />
                </KnockoutStage>
              </PickSection>

              <PickSection title="Final Mundialista" subtitle="Pronostica los 2 finalistas (15 pts c/u)" pts="30 PTS MÁX" icon={Shield}>
                <KnockoutStage
                  title="Finalistas"
                  detail="2 selecciones · 15 pts c/u"
                  selectedCount={[form.finalist1, form.finalist2].filter(Boolean).length}
                  max={2}
                >
                  <TeamGrid
                    teams={tournamentTeams}
                    selected={[form.finalist1, form.finalist2].filter(Boolean)}
                    max={2}
                    locked={lockedField('finalist1')}
                    disabledIds={lockedFinalistIds}
                    onToggle={(id) => {
                      if (lockedFinalistIds.includes(id)) return
                      const sel = [form.finalist1, form.finalist2].filter(Boolean)
                      if (sel.includes(id)) {
                        if (form.finalist1 === id) set('finalist1')(null)
                        else set('finalist2')(null)
                      } else if (!form.finalist1) set('finalist1')(id)
                      else if (!form.finalist2) set('finalist2')(id)
                    }}
                  />
                </KnockoutStage>
              </PickSection>

              <PickSection title="Camino al Título" subtitle="Pronostica semifinalistas, 4tos, 8vos y 16avos por etapa" pts="128 PTS MÁX" icon={Trophy}>
                <div className="grid grid-cols-1 gap-5">
                  <KnockoutStage
                    title="Semifinalistas"
                    detail="4 selecciones · 8 pts c/u"
                    selectedCount={form.semifinalists?.length || 0}
                    max={4}
                  >
                    <TeamGrid teams={tournamentTeams} selected={form.semifinalists || []} max={4} onToggle={(id) => toggleArray('semifinalists', id, 4)} locked={lockedField('semifinalists')} />
                  </KnockoutStage>

                  <KnockoutStage
                    title="Cuartos de final"
                    detail="8 selecciones · 4 pts c/u"
                    selectedCount={form.quarterfinalists?.length || 0}
                    max={8}
                  >
                    <TeamGrid teams={tournamentTeams} selected={form.quarterfinalists || []} max={8} onToggle={(id) => toggleArray('quarterfinalists', id, 8)} locked={lockedField('quarterfinalists')} />
                  </KnockoutStage>

                  <KnockoutStage
                    title="8vos de final"
                    detail="16 selecciones · 2 pts c/u"
                    selectedCount={form.round16Teams?.length || 0}
                    max={16}
                  >
                    <TeamGrid teams={tournamentTeams} selected={form.round16Teams || []} max={16} onToggle={(id) => toggleArray('round16Teams', id, 16)} locked={lockedField('round16Teams')} />
                  </KnockoutStage>

                  <KnockoutStage
                    title="16avos de final"
                    detail="32 selecciones · 1 pt c/u"
                    selectedCount={form.round32Teams?.length || 0}
                    max={32}
                  >
                    <TeamGrid teams={tournamentTeams} selected={form.round32Teams || []} max={32} onToggle={(id) => toggleArray('round32Teams', id, 32)} locked={lockedField('round32Teams')} />
                  </KnockoutStage>
                </div>
              </PickSection>

              <PickSection title="El Orgullo del Anfitrión" subtitle="¿Cuál de las sedes llegará más lejos?" pts="5 PTS" icon={Star}>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {hosts.map(t => (
                      <button
                        key={t.id}
                        disabled={lockedField('hostFurthest')}
                        onClick={() => { if (!lockedField('hostFurthest')) set('hostFurthest')(form.hostFurthest === t.id ? null : t.id) }}
                        className={`group relative flex flex-col items-center gap-4 p-8 rounded-[2rem] border transition-all overflow-hidden ${lockedField('hostFurthest') ? 'opacity-60 cursor-not-allowed' : ''}
                          ${form.hostFurthest === t.id
                            ? 'bg-mundial-gold border-mundial-gold shadow-2xl shadow-mundial-gold/20'
                            : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                      >
                         <Flag url={t.flagUrl} name={t.name} className="w-12 h-10 object-contain group-hover:scale-125 transition-transform duration-500" />
                         <span className={`text-xs font-black uppercase tracking-widest ${form.hostFurthest === t.id ? 'text-mundial-navy' : 'text-zinc-500'}`}>{t.name}</span>
                         {form.hostFurthest === t.id && (
                           <motion.div layoutId="host-select" className="absolute inset-0 bg-white/10 pointer-events-none" />
                         )}
                      </button>
                    ))}
                 </div>
              </PickSection>
            </div>
          )}

          {section === 'premios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AwardPick title="Bota de Oro" subtitle="Máximo Goleador" pts="20 PTS" teams={tournamentTeams} value={form.topScorerId} onChange={set('topScorerId')} icon={Target} locked={lockedField('topScorerId')} />
              <AwardPick title="Balón de Oro" subtitle="Mejor Jugador" pts="15 PTS" teams={tournamentTeams} value={form.bestPlayerId} onChange={set('bestPlayerId')} icon={Star} locked={lockedField('bestPlayerId')} />
              <AwardPick title="Guante de Oro" subtitle="Mejor Portero" pts="12 PTS" teams={tournamentTeams} value={form.bestKeeperId} onChange={set('bestKeeperId')} icon={Shield} locked={lockedField('bestKeeperId')} />
              <AwardPick title="Mejor Joven" subtitle="Talento Emergente" pts="10 PTS" teams={tournamentTeams} value={form.bestYoungId} onChange={set('bestYoungId')} icon={Zap} locked={lockedField('bestYoungId')} />
            </div>
          )}

          {section === 'estadisticas' && (
            <div className="space-y-6">
               {/* Total Goles */}
               <div className="card p-10 bg-gradient-to-br from-mundial-navyLight/20 to-mundial-navy/40 border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-1000">
                    <BarChart3 size={200} fill="currentColor" />
                  </div>
                  <div className="max-w-lg">
                    <h3 className="font-display text-3xl text-white uppercase mb-2">Datos del Torneo</h3>
                    <p className="text-sm text-zinc-500 mb-8 font-bold uppercase tracking-widest">Goles totales, ataque y la mejor defensa del torneo.</p>
                    <div>
                      <p className="text-[10px] font-black text-mundial-gold uppercase tracking-[0.2em] mb-4">Total Goles en el Torneo (8 pts)</p>
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <input
                          type="number"
                          className="w-full sm:w-40 bg-white/5 border-2 border-white/10 rounded-3xl p-6 text-center text-4xl font-display text-white focus:border-mundial-gold outline-none transition-all"
                          value={form.totalGoals || ''}
                          onChange={e => setForm(f => ({ ...f, totalGoals: e.target.value }))}
                          placeholder="000"
                          disabled={lockedField('totalGoals')}
                        />
                        <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-loose">
                          <p className="text-zinc-500">Mundial 2022: 172 GOLES</p>
                          <p className="text-zinc-500">Mundial 2018: 169 GOLES</p>
                          <p className="text-mundial-red">2026: 104 PARTIDOS (+ PARTIDOS!)</p>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Más Goleadora + Valla Invicta — misma card style que Premios Indiv. */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <AwardPick
                   title="Más Goleadora"
                   subtitle="Mejor ataque del torneo"
                   pts="6 PTS"
                   teams={tournamentTeams}
                   value={form.mostGoalsTeamId}
                   onChange={set('mostGoalsTeamId')}
                   icon={Target}
                   locked={lockedField('mostGoalsTeamId')}
                 />
                 <AwardPick
                   title="Valla Invicta"
                   subtitle="Más partidos sin recibir gol · penales no cuentan"
                   pts="6 PTS"
                   teams={tournamentTeams}
                   value={form.leastGoalsTeamId}
                   onChange={set('leastGoalsTeamId')}
                   icon={Shield}
                   locked={lockedField('leastGoalsTeamId')}
                 />
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {isTournamentSummaryComplete && (
        <TournamentPickSummary picks={form} teamById={teamById} />
      )}

      {/* Sticky Bottom Bar for Mobile */}
      <div className="fixed bottom-24 left-0 right-0 px-4 md:hidden pointer-events-none z-50">
         <motion.div
          initial={{ y: 100 }} animate={{ y: 0 }}
          className="max-w-lg mx-auto pointer-events-auto"
         >
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !canSubmit || !picksReady}
              className={`w-full py-5 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 transition-all
                ${!canSubmit ? 'bg-zinc-700 text-zinc-300 border-zinc-600 cursor-not-allowed' : !picksReady ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : saved ? 'bg-green-500 border-green-400 text-white' : 'bg-mundial-gold text-mundial-navy border-mundial-gold font-black'}`}
            >
              {saved ? <Zap size={20} fill="currentColor" /> : <Save size={20} />}
              <span className="uppercase tracking-[0.2em] text-[10px]">{!canSubmit ? 'PRONÓSTICO CERRADO' : !picksReady ? 'CARGANDO...' : saved ? 'GUARDADO' : mutation.isPending ? 'GUARDANDO...' : bracketReopen ? 'GUARDAR CRUCES' : 'GUARDAR MI PREDICCIÓN'}</span>
            </button>
         </motion.div>
      </div>
      </>)}
    </div>
  )
}

// ── Comparativa de grupo (torneo) ────────────────────────────────────────────

function TournamentGroupCompare({ rows, isLoading, teamById }) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-3xl bg-white/5" />)}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="card p-16 text-center bg-white/5 border border-white/5">
        <Users size={40} className="mx-auto text-zinc-800 mb-4" />
        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Sin participantes para comparar</p>
      </div>
    )
  }

  const allLocked = rows.every(r => r.error && String(r.error).toLowerCase().includes('revelan'))
  if (allLocked) {
    return (
      <div className="card p-12 text-center bg-white/5 border border-white/5">
        <LockKeyhole size={40} className="mx-auto text-mundial-gold mb-4" />
        <h3 className="font-display text-2xl uppercase text-white mb-2">Pronósticos bloqueados</h3>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Los pronósticos del torneo se revelan cuando cierre el plazo.</p>
      </div>
    )
  }

  const byId = (id) => teamById.get(id)
  const list = (ids = []) => ids?.map(byId).filter(Boolean) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Users size={18} className="text-mundial-gold" />
        <h2 className="font-display text-2xl uppercase text-white">Predicciones del Grupo</h2>
      </div>

      {/* Tabla resumen rápida: campeón + bota de oro de todos */}
      <div className="card overflow-hidden bg-white/5 border border-white/5">
        <div className="px-4 py-3 border-b border-white/8 bg-white/5">
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Resumen rápido</p>
        </div>
        <div className="divide-y divide-white/5">
          {rows.map(({ member, picks, error }) => {
            if (error) return null
            const champion = byId(picks?.champion)
            const scorer = byId(picks?.topScorerId)
            return (
              <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-mundial-gold/10 flex items-center justify-center text-[11px] font-black text-mundial-gold shrink-0">
                  {member.user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-[11px] font-bold text-zinc-300 w-24 truncate shrink-0">{member.user?.username}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  <span className="text-[9px] text-zinc-600 font-black uppercase">Campeón:</span>
                  {champion ? (
                    <span className="flex items-center gap-1.5">
                      <Flag url={champion.flagUrl} name={teamEsp(champion)} className="w-5 h-3.5 object-contain" />
                      <span className="text-[10px] font-black text-mundial-gold uppercase">{teamEsp(champion)}</span>
                    </span>
                  ) : <span className="text-zinc-700 text-[10px]">—</span>}
                  <span className="text-zinc-700 mx-1">·</span>
                  <span className="text-[9px] text-zinc-600 font-black uppercase">Bota:</span>
                  {scorer ? (
                    <span className="flex items-center gap-1.5">
                      <Flag url={scorer.flagUrl} name={teamEsp(scorer)} className="w-5 h-3.5 object-contain" />
                      <span className="text-[10px] font-black text-zinc-300 uppercase">{teamEsp(scorer)}</span>
                    </span>
                  ) : <span className="text-zinc-700 text-[10px]">—</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tarjetas detalladas por jugador */}
      {rows.map(({ member, picks, error }) => (
        <motion.article
          key={member.userId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden bg-white/5 border border-white/5"
        >
          <div className="flex items-center gap-3 border-b border-white/8 p-4">
            <div className="w-10 h-10 rounded-2xl bg-mundial-gold/10 flex items-center justify-center font-black text-mundial-gold">
              {member.user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-display text-xl uppercase text-white">{member.user?.username}</h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Pronóstico de torneo</p>
            </div>
          </div>

          {error || !picks ? (
            <div className="p-6 text-xs font-bold uppercase tracking-widest text-zinc-600">{error || 'Sin pronóstico registrado'}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
              {/* Copa y final */}
              <GroupBlock title="Copa y final">
                <GroupLine label="Campeón" team={byId(picks.champion)} highlight />
                <GroupLine label="Finalista 1" team={byId(picks.finalist1)} />
                <GroupLine label="Finalista 2" team={byId(picks.finalist2)} />
              </GroupBlock>

              {/* Premios */}
              <GroupBlock title="Premios individuales">
                <GroupLine label="Bota de Oro" team={byId(picks.topScorerId)} />
                <GroupLine label="Balón de Oro" team={byId(picks.bestPlayerId)} />
                <GroupLine label="Guante de Oro" team={byId(picks.bestKeeperId)} />
                <GroupLine label="Mejor joven" team={byId(picks.bestYoungId)} />
              </GroupBlock>

              {/* Especiales */}
              <GroupBlock title="Estadísticas">
                <GroupLine label="Anfitrión" team={byId(picks.hostFurthest)} />
                <GroupLine label="Más goleadora" team={byId(picks.mostGoalsTeamId)} />
                <GroupLine label="Valla invicta" team={byId(picks.leastGoalsTeamId)} />
                <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Total goles</p>
                  <p className="font-display text-xl text-mundial-gold">{picks.totalGoals ?? '—'}</p>
                </div>
              </GroupBlock>

              {/* Camino al título */}
              <GroupBlock title="Camino al título">
                <GroupChips label="Semis (4)" teams={list(picks.semifinalists)} />
                <GroupChips label="4tos (8)" teams={list(picks.quarterfinalists)} />
                <GroupChips label="8vos (16)" teams={list(picks.round16Teams)} compact />
                <GroupChips label="16avos (32)" teams={list(picks.round32Teams)} compact />
              </GroupBlock>
            </div>
          )}
        </motion.article>
      ))}
    </div>
  )
}

function GroupBlock({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-mundial-navy/45 p-4">
      <h4 className="mb-3 font-display text-lg uppercase text-mundial-gold">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function GroupLine({ label, team, highlight = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${highlight ? 'border-mundial-gold/25 bg-mundial-gold/10' : 'border-white/8 bg-white/5'}`}>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
      {team ? (
        <span className="flex items-center gap-2 min-w-0">
          <Flag url={team.flagUrl} name={teamEsp(team)} className="w-5 h-3.5 object-contain" />
          <span className={`text-[11px] font-black uppercase truncate ${highlight ? 'text-mundial-gold' : 'text-zinc-300'}`}>{teamEsp(team)}</span>
        </span>
      ) : (
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">—</span>
      )}
    </div>
  )
}

function GroupChips({ label, teams, compact = false }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
        <span className="text-[9px] font-black text-mundial-gold">{teams.length}</span>
      </div>
      <div className={`grid gap-1.5 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2'}`}>
        {teams.slice(0, compact ? 8 : 4).map(team => (
          <div key={team.id} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 min-w-0">
            <Flag url={team.flagUrl} name={teamEsp(team)} className="w-5 h-3.5 object-contain shrink-0" />
            <span className="text-[9px] font-black uppercase text-zinc-400 truncate">{teamEsp(team)}</span>
          </div>
        ))}
        {teams.length > (compact ? 8 : 4) && (
          <div className="flex items-center justify-center rounded-lg bg-white/5 px-2 py-1.5">
            <span className="text-[9px] font-black uppercase text-zinc-600">+{teams.length - (compact ? 8 : 4)} más</span>
          </div>
        )}
      </div>
    </div>
  )
}

function PickSection({ title, subtitle, pts, icon: Icon, children }) {
  return (
    <div className="card p-10 bg-white/5 border-white/5 relative overflow-hidden group">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/5">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-mundial-navy border border-white/10 flex items-center justify-center text-mundial-gold shadow-inner group-hover:scale-110 transition-transform">
               <Icon size={28} />
            </div>
            <div>
               <h3 className="font-display text-2xl text-white uppercase tracking-tight">{title}</h3>
               <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
            </div>
         </div>
         <span className="bg-mundial-gold/10 text-mundial-gold border border-mundial-gold/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{pts}</span>
      </div>
      {children}
    </div>
  )
}

function KnockoutStage({ title, detail, selectedCount, max, children }) {
  const complete = selectedCount === max

  return (
    <section className={`rounded-[1.75rem] border p-5 sm:p-6 transition-all ${
      complete
        ? 'border-mundial-gold/40 bg-mundial-gold/[0.07]'
        : 'border-white/10 bg-mundial-navy/35'
    }`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${complete ? 'bg-green-400' : 'bg-mundial-gold'}`} />
            <h4 className="font-display text-xl sm:text-2xl uppercase text-white tracking-tight">{title}</h4>
          </div>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{detail}</p>
        </div>

        <div className={`w-fit rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${
          complete
            ? 'border-green-400/30 bg-green-400/10 text-green-300'
            : 'border-white/10 bg-white/5 text-zinc-400'
        }`}>
          {selectedCount}/{max} elegidos
        </div>
      </div>

      {children}
    </section>
  )
}

function TournamentPickSummary({ picks, teamById }) {
  const byId = (id) => teamById.get(id)
  const list = (ids = []) => ids.map(byId).filter(Boolean)

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 card overflow-hidden bg-gradient-to-br from-mundial-gold/10 via-white/[0.04] to-green-500/10 border-mundial-gold/25"
    >
      <div className="flex flex-col gap-5 border-b border-white/8 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-mundial-gold/25 bg-mundial-gold/10 text-mundial-gold">
            <Trophy size={25} />
          </div>
          <div>
            <h3 className="font-display text-2xl uppercase text-white">Resumen de tu pronóstico</h3>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Todo lo que apostaste para el torneo</p>
          </div>
        </div>
        <span className="w-fit rounded-xl border border-green-400/25 bg-green-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-green-300">
          Completo
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <SummaryBlock title="Copa y final">
          <SummaryLine label="Campeón" team={byId(picks.champion)} highlight />
          <SummaryLine label="Finalista 1" team={byId(picks.finalist1)} />
          <SummaryLine label="Finalista 2" team={byId(picks.finalist2)} />
        </SummaryBlock>

        <SummaryBlock title="Especiales">
          <SummaryLine label="Anfitrión más lejos" team={byId(picks.hostFurthest)} />
          <SummaryLine label="Más goleadora" team={byId(picks.mostGoalsTeamId)} />
          <SummaryLine label="Valla invicta" team={byId(picks.leastGoalsTeamId)} />
          <div className="mt-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Goles totales</p>
            <p className="font-display text-2xl text-mundial-gold">{picks.totalGoals}</p>
          </div>
        </SummaryBlock>

        <SummaryBlock title="Premios individuales">
          <SummaryLine label="Bota de Oro" team={byId(picks.topScorerId)} />
          <SummaryLine label="Balón de Oro" team={byId(picks.bestPlayerId)} />
          <SummaryLine label="Guante de Oro" team={byId(picks.bestKeeperId)} />
          <SummaryLine label="Mejor joven" team={byId(picks.bestYoungId)} />
        </SummaryBlock>

        <SummaryBlock title="Camino al título">
          <SummaryTeamChips label="Semifinalistas" teams={list(picks.semifinalists)} />
          <SummaryTeamChips label="Cuartos" teams={list(picks.quarterfinalists)} />
          <SummaryTeamChips label="8vos" teams={list(picks.round16Teams)} compact />
          <SummaryTeamChips label="16avos" teams={list(picks.round32Teams)} compact />
        </SummaryBlock>
      </div>
    </motion.section>
  )
}

function SummaryBlock({ title, children }) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-mundial-navy/45 p-4">
      <h4 className="mb-3 font-display text-lg uppercase text-mundial-gold">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SummaryLine({ label, team, highlight = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
      highlight ? 'border-mundial-gold/30 bg-mundial-gold/10' : 'border-white/8 bg-white/5'
    }`}>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
      {team ? (
        <span className="flex min-w-0 items-center gap-2">
          <Flag url={team.flagUrl} name={teamEsp(team)} className="h-4 w-6 object-contain" />
          <span className={`truncate text-right text-[11px] font-black uppercase ${highlight ? 'text-mundial-gold' : 'text-zinc-300'}`}>
            {teamEsp(team)}
          </span>
        </span>
      ) : (
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Sin elegir</span>
      )}
    </div>
  )
}

function SummaryTeamChips({ label, teams, compact = false }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
        <span className="text-[9px] font-black uppercase tracking-widest text-mundial-gold">{teams.length}</span>
      </div>
      <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
        {teams.map(team => (
          <div key={team.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
            <Flag url={team.flagUrl} name={teamEsp(team)} className="h-3.5 w-5 object-contain shrink-0" />
            <span className="truncate text-[9px] font-black uppercase text-zinc-400">{teamEsp(team)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamGrid({ teams, selected, onToggle, max, locked = false, disabledIds = [] }) {
  const disabledSet = new Set(disabledIds)
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 ${locked ? 'opacity-60' : ''}`}>
      {teams.map(t => {
        const isSel = selected.includes(t.id)
        const itemLocked = locked || disabledSet.has(t.id)
        return (
          <button
            key={t.id}
            disabled={itemLocked}
            onClick={() => { if (!itemLocked) onToggle(t.id) }}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${itemLocked ? 'cursor-not-allowed' : ''}
              ${isSel
                ? 'bg-mundial-gold border-mundial-gold shadow-lg shadow-mundial-gold/20'
                : 'bg-white/5 border-white/10 hover:border-white/30'}`}
          >
            <Flag url={t.flagUrl} name={t.name} className="w-10 h-8 object-contain group-hover:scale-110 transition-transform" />
            <span className={`text-[9px] font-black uppercase truncate w-full text-center tracking-tighter ${isSel ? 'text-mundial-navy' : 'text-zinc-500'}`}>
              {t.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AwardPick({ title, subtitle, pts, teams, value, onChange, icon: Icon, locked = false }) {
  const [search, setSearch] = useState('')
  const filtered = teams.filter(t => teamEsp(t).toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()))
  const selected = teams.find(t => t.id === value)

  return (
    <div className={`card p-8 bg-white/5 border-white/5 group hover:border-mundial-gold/20 transition-all ${locked ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-mundial-navy border border-white/10 flex items-center justify-center text-mundial-gold shadow-inner group-hover:rotate-12 transition-transform">
               <Icon size={24} />
            </div>
            <div>
               <h3 className="font-display text-xl text-white uppercase leading-none">{title}</h3>
               <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
            </div>
         </div>
         <span className="text-mundial-gold font-display text-lg">{pts}</span>
      </div>

      <div className="space-y-4">
         <div className="relative">
            <input
              className="input pl-10 pr-4 py-3 text-xs uppercase font-black tracking-widest placeholder:text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="BUSCAR SELECCIÓN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={locked}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
         </div>

         {/* Selección actual */}
         {selected && !search && (
           <div className="flex items-center gap-4 p-4 rounded-2xl bg-mundial-gold border border-mundial-gold shadow-2xl shadow-mundial-gold/20 mb-2">
             <Flag url={selected.flagUrl} name={teamEsp(selected)} className="w-12 h-10 object-contain" />
             <div className="flex-1">
               <p className="text-[10px] text-mundial-navy font-black opacity-60 uppercase tracking-widest">TU SELECCIÓN</p>
               <h4 className="font-display text-xl text-mundial-navy uppercase">{teamEsp(selected)}</h4>
             </div>
             {!locked && (
               <button onClick={() => onChange(null)} className="p-2 hover:bg-mundial-navy hover:text-white rounded-lg transition-colors text-mundial-navy">
                 <Zap size={20} fill="currentColor" />
               </button>
             )}
           </div>
         )}

         {/* Lista filtrada */}
         <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto no-scrollbar">
           {(search.length > 0 ? filtered : teams).map(t => (
             <button
               key={t.id}
               disabled={locked}
               onClick={() => { if (!locked) { onChange(t.id); setSearch('') } }}
               className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${locked ? 'cursor-not-allowed' : ''}
                 ${value === t.id ? 'bg-mundial-gold/20 border-mundial-gold/40 text-mundial-gold' : 'bg-white/3 border-white/5 hover:bg-white/8 hover:border-white/15 text-zinc-400'}`}
             >
               <Flag url={t.flagUrl} name={teamEsp(t)} className="w-7 h-5 object-contain shrink-0" />
               <span className="text-[11px] font-bold uppercase tracking-wide truncate">{teamEsp(t)}</span>
             </button>
           ))}
         </div>
      </div>
    </div>
  )
}

function TeamSelector({ teams, selected, onSelect }) {
  const t = teams.find(i => i.id === selected)
  const [show, setShow] = useState(false)
  const [search, setSearch] = useState('')
  
  return (
    <div className="relative">
       <button 
        onClick={() => setShow(!show)}
        className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all
          ${t ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-zinc-700'}`}
       >
          <div className="flex items-center gap-3">
             <Flag url={t?.flagUrl} name={teamEsp(t)} className="w-8 h-6 object-contain" />
             <span className="text-xs font-black uppercase tracking-widest">{t ? teamEsp(t) : 'Seleccionar...'}</span>
          </div>
          <ChevronRight size={16} className={`transition-transform ${show ? 'rotate-90' : ''}`} />
       </button>
       
       <AnimatePresence>
         {show && (
           <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 top-full mt-2 w-full max-h-64 bg-mundial-navyLight border border-white/10 shadow-2xl rounded-2xl overflow-hidden p-2 flex flex-col gap-2 backdrop-blur-xl"
           >
              <input className="input py-2 text-[10px]" placeholder="BUSCAR..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              <div className="overflow-y-auto no-scrollbar space-y-1">
                 {teams.filter(i => teamEsp(i).toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase())).map(i => (
                   <button key={i.id} onClick={() => { onSelect(i.id); setShow(false); setSearch('') }} className="w-full p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 text-left transition-all">
                      <Flag url={i.flagUrl} name={teamEsp(i)} className="w-7 h-5 object-contain" />
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-300">{teamEsp(i)}</span>
                   </button>
                 ))}
              </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 animate-pulse">
      <div className="h-16 bg-white/5 rounded-3xl" />
      <div className="grid grid-cols-3 gap-6">
        <div className="h-32 bg-white/5 rounded-3xl" />
        <div className="h-32 bg-white/5 rounded-3xl" />
        <div className="h-32 bg-white/5 rounded-3xl" />
      </div>
      <div className="h-96 bg-white/5 rounded-[2.5rem]" />
    </div>
  )
}
