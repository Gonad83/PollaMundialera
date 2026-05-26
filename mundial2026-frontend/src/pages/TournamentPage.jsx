import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tournamentApi, matchApi } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Award, BarChart3, Save, Star, Search, Shield, ChevronRight, Zap, Target, Crown } from 'lucide-react'
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

export default function TournamentPage({ groupId }) {
  const qc = useQueryClient()
  const [section, setSection] = useState('clasificacion')
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    champion: null, finalist1: null, finalist2: null,
    semifinalists: [], quarterfinalists: [], groupQualifiers: [],
    topScorerId: null, bestPlayerId: null, bestKeeperId: null, bestYoungId: null,
    totalGoals: '', mostGoalsTeamId: null, leastGoalsTeamId: null, hostFurthest: null,
  })

  const { data: myPicks, isLoading: loadingPicks } = useQuery({
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

  useEffect(() => {
    if (myPicks && Object.keys(myPicks).length > 0) {
      setForm(f => ({ ...f, ...myPicks }))
      try { localStorage.setItem(`tp_${groupId}`, JSON.stringify(myPicks)) } catch {}
    }
  }, [myPicks, groupId])

  const mutation = useMutation({
    mutationFn: (data) => tournamentApi.savePicks({ ...data, groupId }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-tournament-picks'] })
      try { localStorage.setItem(`tp_${groupId}`, JSON.stringify(data)) } catch {}
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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

  const hosts = teams.filter(t => ['USA', 'MEX', 'CAN'].includes(t.code))

  const { completedCount, totalCount, completionPct } = useMemo(() => {
    const checks = [
      !!form.champion,
      !!form.finalist1,
      !!form.finalist2,
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

  if (loadingPicks) return <LoadingSkeleton />

  return (
    <div className="max-w-4xl mx-auto pb-32 px-4">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="flex flex-col flex-1">
          <h1 className="font-display text-4xl text-white tracking-tight uppercase">Predicción Maestra</h1>
          <div className="flex items-center gap-2 mt-1 mb-4">
            <span className="w-2 h-2 bg-mundial-red rounded-full animate-pulse" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Cierre de Pronósticos: 11 JUN 2026</p>
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
            disabled={mutation.isPending}
            className={`btn-gold px-8 py-4 rounded-2xl flex items-center gap-3 transition-all ${saved ? 'bg-green-500 border-green-400 text-white shadow-green-500/20' : 'shadow-mundial-gold/20'}`}
          >
            {saved ? <Zap size={20} fill="currentColor" /> : <Save size={20} />}
            <span className="font-black tracking-widest text-xs">{saved ? '¡PRONÓSTICOS GUARDADOS!' : mutation.isPending ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</span>
          </button>
        </div>
      </div>

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

      {/* Modern Section Tabs */}
      <div className="flex p-1.5 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl mb-12 overflow-x-auto no-scrollbar">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex-1 min-w-[140px] py-4 px-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
              ${section === s.key 
                ? 'bg-mundial-gold text-mundial-navy shadow-2xl shadow-mundial-gold/20' 
                : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <s.icon size={16} />
            {s.label}
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
                <TeamGrid
                  teams={teams}
                  selected={form.champion ? [form.champion] : []}
                  onToggle={(id) => set('champion')(form.champion === id ? null : id)}
                />
              </PickSection>

              <PickSection title="Final Mundialista" subtitle="Pronostica los 2 finalistas (15 pts c/u)" pts="30 PTS MÁX" icon={Shield}>
                <TeamGrid
                  teams={teams}
                  selected={[form.finalist1, form.finalist2].filter(Boolean)}
                  max={2}
                  onToggle={(id) => {
                    const sel = [form.finalist1, form.finalist2].filter(Boolean)
                    if (sel.includes(id)) {
                      if (form.finalist1 === id) set('finalist1')(null)
                      else set('finalist2')(null)
                    } else if (!form.finalist1) set('finalist1')(id)
                    else if (!form.finalist2) set('finalist2')(id)
                  }}
                />
              </PickSection>

              <PickSection title="Cuadro Final" subtitle="Semifinalistas y su camino a la gloria" pts="32 PTS MÁX" icon={Trophy}>
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-mundial-gold rounded-full" /> Semifinalistas (8 pts c/u)
                    </p>
                    <TeamGrid teams={teams} selected={form.semifinalists || []} max={4} onToggle={(id) => toggleArray('semifinalists', id, 4)} />
                  </div>
                  <div className="pt-8 border-t border-white/5">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-mundial-gold rounded-full" /> Cuartos de Final (4 pts c/u)
                    </p>
                    <TeamGrid teams={teams} selected={form.quarterfinalists || []} max={8} onToggle={(id) => toggleArray('quarterfinalists', id, 8)} />
                  </div>
                </div>
              </PickSection>

              <PickSection title="El Orgullo del Anfitrión" subtitle="¿Cuál de las sedes llegará más lejos?" pts="5 PTS" icon={Star}>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {hosts.map(t => (
                      <button
                        key={t.id}
                        onClick={() => set('hostFurthest')(form.hostFurthest === t.id ? null : t.id)}
                        className={`group relative flex flex-col items-center gap-4 p-8 rounded-[2rem] border transition-all overflow-hidden
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
              <AwardPick title="Bota de Oro" subtitle="Máximo Goleador" pts="20 PTS" teams={teams} value={form.topScorerId} onChange={set('topScorerId')} icon={Target} />
              <AwardPick title="Balón de Oro" subtitle="Mejor Jugador" pts="15 PTS" teams={teams} value={form.bestPlayerId} onChange={set('bestPlayerId')} icon={Star} />
              <AwardPick title="Guante de Oro" subtitle="Mejor Portero" pts="12 PTS" teams={teams} value={form.bestKeeperId} onChange={set('bestKeeperId')} icon={Shield} />
              <AwardPick title="Mejor Joven" subtitle="Talento Emergente" pts="10 PTS" teams={teams} value={form.bestYoungId} onChange={set('bestYoungId')} icon={Zap} />
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
                   teams={teams}
                   value={form.mostGoalsTeamId}
                   onChange={set('mostGoalsTeamId')}
                   icon={Target}
                 />
                 <AwardPick
                   title="Valla Invicta"
                   subtitle="Más partidos sin recibir gol · penales no cuentan"
                   pts="6 PTS"
                   teams={teams}
                   value={form.leastGoalsTeamId}
                   onChange={set('leastGoalsTeamId')}
                   icon={Shield}
                 />
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Sticky Bottom Bar for Mobile */}
      <div className="fixed bottom-24 left-0 right-0 px-4 md:hidden pointer-events-none z-50">
         <motion.div 
          initial={{ y: 100 }} animate={{ y: 0 }}
          className="max-w-lg mx-auto pointer-events-auto"
         >
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending}
              className={`w-full py-5 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 transition-all
                ${saved ? 'bg-green-500 border-green-400 text-white' : 'bg-mundial-gold text-mundial-navy border-mundial-gold font-black'}`}
            >
              {saved ? <Zap size={20} fill="currentColor" /> : <Save size={20} />}
              <span className="uppercase tracking-[0.2em] text-[10px]">{saved ? 'PRONÓSTICOS GUARDADOS' : mutation.isPending ? 'GUARDANDO...' : 'GUARDAR MI PREDICCIÓN'}</span>
            </button>
         </motion.div>
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

function TeamGrid({ teams, selected, onToggle, max }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {teams.map(t => {
        const isSel = selected.includes(t.id)
        return (
          <button
            key={t.id}
            onClick={() => onToggle(t.id)}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all
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

function AwardPick({ title, subtitle, pts, teams, value, onChange, icon: Icon }) {
  const [search, setSearch] = useState('')
  const filtered = teams.filter(t => teamEsp(t).toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()))
  const selected = teams.find(t => t.id === value)

  return (
    <div className="card p-8 bg-white/5 border-white/5 group hover:border-mundial-gold/20 transition-all">
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
              className="input pl-10 pr-4 py-3 text-xs uppercase font-black tracking-widest placeholder:text-zinc-700"
              placeholder="BUSCAR SELECCIÓN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
             <button onClick={() => onChange(null)} className="p-2 hover:bg-mundial-navy hover:text-white rounded-lg transition-colors text-mundial-navy">
               <Zap size={20} fill="currentColor" />
             </button>
           </div>
         )}

         {/* Lista filtrada */}
         <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto no-scrollbar">
           {(search.length > 0 ? filtered : teams).map(t => (
             <button
               key={t.id}
               onClick={() => { onChange(t.id); setSearch('') }}
               className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left
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

