import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ChevronRight, RotateCcw, Zap, Edit3, Check, X } from 'lucide-react'

// ── EQUIPOS ───────────────────────────────────────────────────────────────────
const TEAMS = {
  'España':          { flag: '🇪🇸', opta: 16.3, titles: 1 },
  'Francia':         { flag: '🇫🇷', opta: 12.4, titles: 2 },
  'Inglaterra':      { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', opta: 11.3, titles: 1 },
  'Argentina':       { flag: '🇦🇷', opta: 10.7, titles: 3 },
  'Portugal':        { flag: '🇵🇹', opta: 6.9,  titles: 0 },
  'Brasil':          { flag: '🇧🇷', opta: 6.1,  titles: 5 },
  'Alemania':        { flag: '🇩🇪', opta: 5.7,  titles: 4 },
  'Países Bajos':    { flag: '🇳🇱', opta: 3.9,  titles: 0 },
  'Noruega':         { flag: '🇳🇴', opta: 3.4,  titles: 0 },
  'Bélgica':         { flag: '🇧🇪', opta: 2.3,  titles: 0 },
  'Colombia':        { flag: '🇨🇴', opta: 2.0,  titles: 0 },
  'Marruecos':       { flag: '🇲🇦', opta: 1.7,  titles: 0 },
  'Uruguay':         { flag: '🇺🇾', opta: 1.7,  titles: 2 },
  'México':          { flag: '🇲🇽', opta: 1.6,  titles: 0 },
  'Ecuador':         { flag: '🇪🇨', opta: 1.6,  titles: 0 },
  'Suiza':           { flag: '🇨🇭', opta: 1.5,  titles: 0 },
  'Croacia':         { flag: '🇭🇷', opta: 1.3,  titles: 0 },
  'USA':             { flag: '🇺🇸', opta: 1.3,  titles: 0 },
  'Japón':           { flag: '🇯🇵', opta: 1.2,  titles: 0 },
  'Turquía':         { flag: '🇹🇷', opta: 1.0,  titles: 0 },
  'Senegal':         { flag: '🇸🇳', opta: 0.9,  titles: 0 },
  'Canadá':          { flag: '🇨🇦', opta: 0.9,  titles: 0 },
  'Paraguay':        { flag: '🇵🇾', opta: 0.5,  titles: 0 },
  'Suecia':          { flag: '🇸🇪', opta: 0.5,  titles: 0 },
  'Austria':         { flag: '🇦🇹', opta: 0.4,  titles: 0 },
  'Corea del Sur':   { flag: '🇰🇷', opta: 0.4,  titles: 0 },
  'Australia':       { flag: '🇦🇺', opta: 0.3,  titles: 0 },
  'Irán':            { flag: '🇮🇷', opta: 0.3,  titles: 0 },
  'Rep. Checa':      { flag: '🇨🇿', opta: 0.3,  titles: 0 },
  'Escocia':         { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', opta: 0.2,  titles: 0 },
  'Egipto':          { flag: '🇪🇬', opta: 0.2,  titles: 0 },
  'Bosnia y Herz.':  { flag: '🇧🇦', opta: 0.2,  titles: 0 },
  'Costa de Marfil': { flag: '🇨🇮', opta: 0.2,  titles: 0 },
  'Argelia':         { flag: '🇩🇿', opta: 0.2,  titles: 0 },
  'Ghana':           { flag: '🇬🇭', opta: 0.2,  titles: 0 },
  'Sudáfrica':       { flag: '🇿🇦', opta: 0.1,  titles: 0 },
  'Túnez':           { flag: '🇹🇳', opta: 0.1,  titles: 0 },
  'Uzbekistán':      { flag: '🇺🇿', opta: 0.1,  titles: 0 },
  'Panamá':          { flag: '🇵🇦', opta: 0.1,  titles: 0 },
  'Nueva Zelanda':   { flag: '🇳🇿', opta: 0.1,  titles: 0 },
  'Irak':            { flag: '🇮🇶', opta: 0.1,  titles: 0 },
  'Jordania':        { flag: '🇯🇴', opta: 0.1,  titles: 0 },
  'RD Congo':        { flag: '🇨🇩', opta: 0.1,  titles: 0 },
  'Catar':           { flag: '🇶🇦', opta: 0.05, titles: 0 },
  'Arabia Saudita':  { flag: '🇸🇦', opta: 0.05, titles: 0 },
  'Cabo Verde':      { flag: '🇨🇻', opta: 0.05, titles: 0 },
  'Haití':           { flag: '🇭🇹', opta: 0.05, titles: 0 },
  'Curazao':         { flag: '🇨🇼', opta: 0.05, titles: 0 },
}

// ── GRUPOS MUNDIAL 2026 (Sorteo oficial FIFA – 4 dic. 2024) ───────────────────
// Formato: 48 equipos · 12 grupos de 4 · Clasifican top2 + 8 mejores 3ros = 32
const DEFAULT_GROUPS = {
  A: ['USA',       'Panamá',    'Bosnia y Herz.', 'Uzbekistán'],
  B: ['México',    'Croacia',   'Ghana',           'Japón'],
  C: ['Canadá',    'Escocia',   'Senegal',         'Irak'],
  D: ['Panamá',    'Turquía',   'Argelia',         'Corea del Sur'],
  E: ['Haití',     'Austria',   'Costa de Marfil', 'Australia'],
  F: ['Curazao',   'Rep. Checa','Túnez',           'Jordania'],
  G: ['Argentina', 'España',    'Bélgica',         'Irán'],
  H: ['Brasil',    'Alemania',  'Suiza',           'Arabia Saudita'],
  I: ['Uruguay',   'Francia',   'Países Bajos',    'Sudáfrica'],
  J: ['Colombia',  'Inglaterra','Noruega',          'Nueva Zelanda'],
  K: ['Ecuador',   'Portugal',  'Egipto',          'Catar'],
  L: ['Paraguay',  'Suecia',    'RD Congo',         'Cabo Verde'],
}

// Fix: Panamá duplicado — mover Panamá a Grupo A y usar Jamaica como placeholder en D
// En realidad los grupos D-F usan los CONCACAF no-sede. Ajustar:
DEFAULT_GROUPS.A = ['USA',       'Bosnia y Herz.', 'Marruecos',        'Uzbekistán']
DEFAULT_GROUPS.B = ['México',    'Croacia',         'Ghana',            'Japón']
DEFAULT_GROUPS.C = ['Canadá',    'Escocia',         'Senegal',          'Irak']
DEFAULT_GROUPS.D = ['Panamá',    'Turquía',         'Argelia',          'Corea del Sur']
DEFAULT_GROUPS.E = ['Haití',     'Austria',         'Costa de Marfil',  'Australia']
DEFAULT_GROUPS.F = ['Curazao',   'Rep. Checa',      'Túnez',            'Jordania']
DEFAULT_GROUPS.G = ['Argentina', 'España',          'Bélgica',          'Irán']
DEFAULT_GROUPS.H = ['Brasil',    'Alemania',        'Suiza',            'Arabia Saudita']
DEFAULT_GROUPS.I = ['Uruguay',   'Francia',         'Países Bajos',     'Sudáfrica']
DEFAULT_GROUPS.J = ['Colombia',  'Inglaterra',      'Noruega',          'Nueva Zelanda']
DEFAULT_GROUPS.K = ['Ecuador',   'Portugal',        'Egipto',           'Catar']
DEFAULT_GROUPS.L = ['Paraguay',  'Suecia',          'RD Congo',         'Cabo Verde']

// Pares de partidos para un grupo de 4: (0v1),(0v2),(0v3),(1v2),(1v3),(2v3)
const MATCH_PAIRS = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]

const initScores = () =>
  Object.fromEntries(
    Object.keys(DEFAULT_GROUPS).map(l => [l, MATCH_PAIRS.map(() => ['', ''])])
  )

// ── LÓGICA ────────────────────────────────────────────────────────────────────

function computeStandings(teams, scores) {
  const rows = teams.map(name => ({ name, pts: 0, gf: 0, gc: 0, pj: 0, w: 0, d: 0, l: 0 }))
  MATCH_PAIRS.forEach(([i, j], mi) => {
    const hg = parseInt(scores[mi][0])
    const ag = parseInt(scores[mi][1])
    if (isNaN(hg) || isNaN(ag)) return
    rows[i].pj++; rows[j].pj++
    rows[i].gf += hg; rows[i].gc += ag
    rows[j].gf += ag; rows[j].gc += hg
    if (hg > ag)       { rows[i].pts += 3; rows[i].w++; rows[j].l++ }
    else if (hg === ag) { rows[i].pts++; rows[j].pts++; rows[i].d++; rows[j].d++ }
    else               { rows[j].pts += 3; rows[j].w++; rows[i].l++ }
  })
  return [...rows].sort((a, b) =>
    b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
  )
}

function getStrength(name) {
  const t = TEAMS[name]
  if (!t) return 2
  return Math.sqrt(Math.max(t.opta, 0.05)) * 14 + t.titles * 1.8
}

function simMatch(a, b) {
  const sa = getStrength(a), sb = getStrength(b)
  const pa = sa / (sa + sb)
  const eq = 1 - Math.abs(pa - 0.5) * 2
  const pdraw = 0.13 + eq * 0.14
  const r = Math.random()
  const avg = 2.4
  const goA = Math.max(0, Math.round((sa / (sa + sb)) * avg + (Math.random() - 0.5) * 1.2))
  const goB = Math.max(0, Math.round((sb / (sa + sb)) * avg + (Math.random() - 0.5) * 1.2))
  if (r < (1 - pdraw) * pa) return [Math.max(goA, goB + 1), goB]
  if (r < (1 - pdraw) * pa + pdraw) { const g = Math.min(goA, goB); return [g, g] }
  return [goA, Math.max(goB, goA + 1)]
}

// ── REGLAS OFICIALES FIFA · R32 (P73–P88) ────────────────────────────────────
function buildR32(standings) {
  const f = {}, s = {}
  const thirdsArr = []

  Object.entries(standings).forEach(([g, rows]) => {
    f[g] = rows[0].name
    s[g] = rows[1].name
    thirdsArr.push({ name: rows[2].name, group: g, pts: rows[2].pts, gd: rows[2].gf - rows[2].gc, gf: rows[2].gf })
  })

  // Mejores 8 terceros: Pts → GD → GF
  thirdsArr.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  const best8 = thirdsArr.slice(0, 8)

  // Grupos válidos por slot (anti-repetición: 1º de X no enfrenta a 3º de X)
  const VALID = {
    74: ['A','B','C','D','F'],
    77: ['C','D','F','G','H'],
    79: ['C','E','F','H','I'],
    80: ['E','H','I','J','K'],
    81: ['B','E','F','I','J'],
    82: ['A','E','H','I','J'],
    85: ['E','F','G','I','J'],
    87: ['D','E','I','J','L'],
  }

  // Asignación greedy: mejor tercero disponible → primer slot válido
  const thirdFor = {}
  const used = new Set()
  for (const slot of [74, 77, 79, 80, 81, 82, 85, 87]) {
    for (const t of best8) {
      if (!used.has(t.name) && VALID[slot].includes(t.group)) {
        thirdFor[slot] = t.name; used.add(t.name); break
      }
    }
    if (thirdFor[slot] === undefined) thirdFor[slot] = null
  }

  const F = g => f[g] ?? '?'
  const S = g => s[g] ?? '?'
  const T = p => thirdFor[p] ?? '?'

  // Partidos P73-P88 en orden oficial FIFA 2026
  const RAW = [
    { label: 'P73', desc: '2A vs 2B',  teams: [S('A'), S('B')] },
    { label: 'P74', desc: '1E vs 3°',  teams: [F('E'), T(74)]  },
    { label: 'P75', desc: '1F vs 2C',  teams: [F('F'), S('C')] },
    { label: 'P76', desc: '1C vs 2F',  teams: [F('C'), S('F')] },
    { label: 'P77', desc: '1I vs 3°',  teams: [F('I'), T(77)]  },
    { label: 'P78', desc: '2E vs 2I',  teams: [S('E'), S('I')] },
    { label: 'P79', desc: '1A vs 3°',  teams: [F('A'), T(79)]  },
    { label: 'P80', desc: '1L vs 3°',  teams: [F('L'), T(80)]  },
    { label: 'P81', desc: '1D vs 3°',  teams: [F('D'), T(81)]  },
    { label: 'P82', desc: '1G vs 3°',  teams: [F('G'), T(82)]  },
    { label: 'P83', desc: '2K vs 2L',  teams: [S('K'), S('L')] },
    { label: 'P84', desc: '1H vs 2J',  teams: [F('H'), S('J')] },
    { label: 'P85', desc: '1B vs 3°',  teams: [F('B'), T(85)]  },
    { label: 'P86', desc: '1J vs 2H',  teams: [F('J'), S('H')] },
    { label: 'P87', desc: '1K vs 3°',  teams: [F('K'), T(87)]  },
    { label: 'P88', desc: '2D vs 2G',  teams: [S('D'), S('G')] },
  ]

  return {
    matches: RAW.map(m => m.teams),
    labels:  RAW.map(m => m.label),
    descs:   RAW.map(m => m.desc),
    thirds:  thirdsArr,
    best8,
  }
}

// ── SUBCOMPONENTES ────────────────────────────────────────────────────────────

function Flag({ name, size = 'sm' }) {
  const t = TEAMS[name]
  const sz = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-base'
  return <span className={sz}>{t?.flag || '🏴'}</span>
}

function ScoreInput({ value, onChange, disabled, isWin, isLose }) {
  return (
    <input
      type="number"
      min="0"
      max="20"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{ colorScheme: 'dark' }}
      className={`w-10 h-9 text-center bg-zinc-900 border rounded-lg font-display text-base focus:outline-none focus:ring-1 disabled:opacity-30 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors
        ${isWin  ? 'border-mundial-gold/60 text-mundial-gold  focus:ring-mundial-gold  focus:border-mundial-gold'
        : isLose ? 'border-red-500/30    text-red-400/70    focus:ring-red-500      focus:border-red-500'
                 : 'border-white/15       text-white         focus:ring-mundial-gold  focus:border-mundial-gold'}`}
    />
  )
}

function GroupCard({ letter, teams, scores, onScoreChange, onTeamChange }) {
  const standings = useMemo(() => computeStandings(teams, scores), [teams, scores])
  const [editTeam, setEditTeam] = useState(null)
  const [editVal, setEditVal] = useState('')

  const allTeams = Object.keys(TEAMS)

  const handleTeamSave = (idx) => {
    if (editVal && editVal !== teams[idx]) onTeamChange(idx, editVal)
    setEditTeam(null)
  }

  const groupComplete = scores.every(([a, b]) => a !== '' && b !== '')

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/3">
        <div className="w-9 h-9 rounded-xl bg-mundial-gold/20 text-mundial-gold flex items-center justify-center font-display text-xl border border-mundial-gold/20 shrink-0">
          {letter}
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {teams.map((t, i) => (
            editTeam === i ? (
              <div key={i} className="flex items-center gap-1">
                <select
                  autoFocus
                  value={editVal || t}
                  onChange={e => setEditVal(e.target.value)}
                  className="bg-mundial-navy border border-mundial-gold/50 rounded-lg text-xs text-white px-2 py-0.5 focus:outline-none"
                >
                  {allTeams.map(tn => <option key={tn} value={tn}>{TEAMS[tn]?.flag} {tn}</option>)}
                </select>
                <button onClick={() => handleTeamSave(i)} className="text-green-400 hover:text-green-300"><Check size={12}/></button>
                <button onClick={() => setEditTeam(null)} className="text-zinc-500 hover:text-red-400"><X size={12}/></button>
              </div>
            ) : (
              <button
                key={i}
                onClick={() => { setEditTeam(i); setEditVal(t) }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors group"
              >
                <span>{TEAMS[t]?.flag}</span>
                <span>{t}</span>
                <Edit3 size={8} className="opacity-0 group-hover:opacity-100 transition-opacity text-mundial-gold"/>
              </button>
            )
          ))}
        </div>
        {groupComplete && <span className="text-[8px] font-black text-mundial-gold uppercase tracking-widest shrink-0">✓ COMPLETO</span>}
      </div>

      {/* Standings */}
      <div className="border-b border-white/5">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[8px] text-zinc-600 uppercase tracking-widest bg-white/3">
              <th className="text-left px-3 py-1.5 w-4">#</th>
              <th className="text-left px-1 py-1.5">Equipo</th>
              <th className="text-center px-2 py-1.5 w-6">PJ</th>
              <th className="text-center px-2 py-1.5 w-6">GF</th>
              <th className="text-center px-2 py-1.5 w-6">GC</th>
              <th className="text-center px-2 py-1.5 w-6">GD</th>
              <th className="text-center px-3 py-1.5 w-8 text-mundial-gold font-black">PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.name} className={`border-t border-white/5 ${i < 2 ? 'bg-mundial-gold/[0.02]' : ''}`}>
                <td className="px-3 py-2 text-zinc-600 text-[10px]">{i + 1}</td>
                <td className="px-1 py-2">
                  <span className="flex items-center gap-1.5">
                    <Flag name={row.name} />
                    <span className={`text-[10px] font-bold truncate max-w-[80px] ${i < 2 ? 'text-white' : 'text-zinc-500'}`}>{row.name}</span>
                    {i < 2 && <span className="text-[7px] text-mundial-gold font-black">✓</span>}
                    {i === 2 && <span className="text-[7px] text-zinc-600 font-black">3°</span>}
                  </span>
                </td>
                <td className="text-center px-2 py-2 text-zinc-500 text-[10px]">{row.pj}</td>
                <td className="text-center px-2 py-2 text-zinc-500 text-[10px]">{row.gf}</td>
                <td className="text-center px-2 py-2 text-zinc-500 text-[10px]">{row.gc}</td>
                <td className={`text-center px-2 py-2 text-[10px] font-mono font-bold ${(row.gf-row.gc)>0?'text-green-500':(row.gf-row.gc)<0?'text-red-400':'text-zinc-600'}`}>
                  {row.gf-row.gc>0?'+':''}{row.gf-row.gc}
                </td>
                <td className="text-center px-3 py-2 font-display text-base text-white">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matches */}
      <div className="divide-y divide-white/5 flex-1">
        {MATCH_PAIRS.map(([i, j], mi) => {
          const [hg, ag] = scores[mi]
          const hScore = parseInt(hg), aScore = parseInt(ag)
          const hasResult = !isNaN(hScore) && !isNaN(aScore)
          const winHome = hasResult && hScore > aScore
          const winAway = hasResult && aScore > hScore
          return (
            <div key={mi} className="flex items-center gap-2 px-3 py-2">
              <span className={`flex-1 text-right text-[11px] font-bold flex items-center justify-end gap-1.5 ${winHome ? 'text-white' : 'text-zinc-500'}`}>
                <span className="truncate max-w-[65px]">{teams[i]}</span>
                <Flag name={teams[i]} size="md" />
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <ScoreInput value={hg} onChange={v => onScoreChange(mi, 0, v)} isWin={winHome} isLose={winAway} />
                <span className="text-zinc-600 font-bold text-xs px-0.5">–</span>
                <ScoreInput value={ag} onChange={v => onScoreChange(mi, 1, v)} isWin={winAway} isLose={winHome} />
              </div>
              <span className={`flex-1 text-left text-[11px] font-bold flex items-center gap-1.5 ${winAway ? 'text-white' : 'text-zinc-500'}`}>
                <Flag name={teams[j]} size="md" />
                <span className="truncate max-w-[65px]">{teams[j]}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Componente de partido en el bracket
function BracketMatch({ teamA, teamB, scoreA, scoreB, onScore, compact = false }) {
  const hasResult = scoreA !== '' && scoreB !== '' && !isNaN(parseInt(scoreA)) && !isNaN(parseInt(scoreB))
  const winA = hasResult && parseInt(scoreA) > parseInt(scoreB)
  const winB = hasResult && parseInt(scoreB) > parseInt(scoreA)
  const isDraw = hasResult && parseInt(scoreA) === parseInt(scoreB)

  const empty = !teamA && !teamB
  if (empty) return <div className={`${compact ? 'h-16' : 'h-20'} rounded-xl border border-white/5 bg-white/2 flex items-center justify-center`}><span className="text-[9px] text-zinc-700">TBD</span></div>

  return (
    <div className={`rounded-xl border overflow-hidden ${hasResult ? (winA || winB ? 'border-mundial-gold/25 bg-mundial-gold/3' : 'border-orange-500/25 bg-orange-500/3') : 'border-white/8 bg-white/3'}`}>
      {/* Team A */}
      <div className={`flex items-center gap-2 px-3 ${compact ? 'py-1.5' : 'py-2'} border-b border-white/8 ${winA ? 'bg-mundial-gold/10' : ''}`}>
        <Flag name={teamA} size="md" />
        <span className={`flex-1 text-[11px] font-bold truncate ${winA ? 'text-mundial-gold' : teamA ? 'text-zinc-200' : 'text-zinc-600'}`}>
          {teamA || 'Por definir'}
          {winA && <span className="ml-1 text-[8px]">✓</span>}
        </span>
        {onScore ? (
          <ScoreInput value={scoreA} onChange={v => onScore(0, v)} disabled={!teamA || !teamB} isWin={winA} isLose={winB} />
        ) : (
          <span className={`font-display text-base w-6 text-center ${winA ? 'text-mundial-gold' : 'text-zinc-400'}`}>{scoreA !== '' ? scoreA : '-'}</span>
        )}
      </div>
      {/* Team B */}
      <div className={`flex items-center gap-2 px-3 ${compact ? 'py-1.5' : 'py-2'} ${winB ? 'bg-mundial-gold/10' : ''}`}>
        <Flag name={teamB} size="md" />
        <span className={`flex-1 text-[11px] font-bold truncate ${winB ? 'text-mundial-gold' : teamB ? 'text-zinc-200' : 'text-zinc-600'}`}>
          {teamB || 'Por definir'}
          {winB && <span className="ml-1 text-[8px]">✓</span>}
        </span>
        {onScore ? (
          <ScoreInput value={scoreB} onChange={v => onScore(1, v)} disabled={!teamA || !teamB} isWin={winB} isLose={winA} />
        ) : (
          <span className={`font-display text-base w-6 text-center ${winB ? 'text-mundial-gold' : 'text-zinc-400'}`}>{scoreB !== '' ? scoreB : '-'}</span>
        )}
      </div>
      {isDraw && (
        <div className="text-[8px] text-orange-400 font-black uppercase tracking-widest text-center py-0.5 bg-orange-500/10">
          PENALES NECESARIOS
        </div>
      )}
    </div>
  )
}

// Tabla de transparencia de mejores terceros
function ThirdsTable({ thirds }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
      >
        <span className="font-display text-base text-white flex items-center gap-2">
          <span className="text-mundial-gold text-sm">{open ? '▲' : '▼'}</span>
          Tabla de Mejores Terceros · Criterio FIFA
        </span>
        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">{open ? 'OCULTAR' : 'VER'}</span>
      </button>
      {open && (
        <div className="border-t border-white/8 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[8px] text-zinc-600 uppercase tracking-widest bg-white/3">
                <th className="text-center px-3 py-1.5 w-8">#</th>
                <th className="text-left px-2 py-1.5">Equipo</th>
                <th className="text-center px-2 py-1.5">Grp</th>
                <th className="text-center px-2 py-1.5">Pts</th>
                <th className="text-center px-2 py-1.5">GD</th>
                <th className="text-center px-2 py-1.5">GF</th>
                <th className="text-center px-3 py-1.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {thirds.map((t, i) => {
                const ok = i < 8
                return (
                  <tr key={t.name} className={`border-t border-white/5 ${ok ? '' : 'opacity-35'}`}>
                    <td className="text-center px-3 py-2 text-zinc-600 text-[10px]">{i + 1}</td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-1.5">
                        <Flag name={t.name} size="md" />
                        <span className={`text-[10px] font-bold ${ok ? 'text-white' : 'text-zinc-500'}`}>{t.name}</span>
                      </span>
                    </td>
                    <td className="text-center px-2 py-2 text-mundial-gold font-black text-[10px]">{t.group}</td>
                    <td className="text-center px-2 py-2 font-display text-base text-white">{t.pts}</td>
                    <td className={`text-center px-2 py-2 text-[10px] font-mono font-bold ${t.gd > 0 ? 'text-green-500' : t.gd < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                      {t.gd > 0 ? '+' : ''}{t.gd}
                    </td>
                    <td className="text-center px-2 py-2 text-zinc-400 text-[10px]">{t.gf}</td>
                    <td className="text-center px-3 py-2">
                      {ok
                        ? <span className="text-[8px] font-black text-mundial-gold uppercase tracking-widest">✓ Clasifica</span>
                        : <span className="text-[8px] text-zinc-700 uppercase tracking-widest">Eliminado</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const [groups, setGroups] = useState({ ...DEFAULT_GROUPS })
  const [scores, setScores]  = useState(initScores)
  const [phase, setPhase]    = useState('groups') // 'groups' | 'bracket'
  const [bracket, setBracket] = useState(null)
  const [bracketScores, setBracketScores] = useState(null)

  // Cambia un score de grupo
  const handleGroupScore = useCallback((letter, mi, side, val) => {
    setScores(prev => {
      const next = { ...prev, [letter]: prev[letter].map((s, i) => i === mi ? (side === 0 ? [val, s[1]] : [s[0], val]) : s) }
      return next
    })
  }, [])

  // Cambia un equipo de grupo
  const handleTeamChange = useCallback((letter, idx, name) => {
    setGroups(prev => ({ ...prev, [letter]: prev[letter].map((t, i) => i === idx ? name : t) }))
  }, [])

  // Calcula clasificados de cada grupo
  const standings = useMemo(() =>
    Object.fromEntries(
      Object.entries(groups).map(([l, teams]) => [l, computeStandings(teams, scores[l])])
    ), [groups, scores])

  const buildBracket = useCallback(() => {
    const { matches, labels, descs, thirds } = buildR32(standings)
    setBracket({ r32: matches, r32labels: labels, r32descs: descs, thirds })
    setBracketScores({
      r32:   matches.map(() => ['', '']),
      r16:   Array(8).fill(null).map(() => ['', '']),
      qf:    Array(4).fill(null).map(() => ['', '']),
      sf:    Array(2).fill(null).map(() => ['', '']),
      final: ['', ''],
    })
    setPhase('bracket')
  }, [standings])

  // Obtener ganador de un partido del bracket
  const getWinner = (teamA, teamB, sA, sB) => {
    const a = parseInt(sA), b = parseInt(sB)
    if (isNaN(a) || isNaN(b) || a === b) return null
    return a > b ? teamA : teamB
  }

  // Equipos en cada ronda del bracket (derivados de resultados)
  const bracketTeams = useMemo(() => {
    if (!bracket || !bracketScores) return null
    const r32pairs = bracket.r32
    const r32winners = r32pairs.map(([a, b], i) => {
      const [sa, sb] = bracketScores.r32[i]
      return getWinner(a, b, sa, sb)
    })
    const r16pairs = []
    for (let i = 0; i < 8; i++) r16pairs.push([r32winners[i*2], r32winners[i*2+1]])
    const r16winners = r16pairs.map(([a, b], i) => {
      const [sa, sb] = bracketScores.r16[i]
      return getWinner(a, b, sa, sb)
    })
    const qfPairs = []
    for (let i = 0; i < 4; i++) qfPairs.push([r16winners[i*2], r16winners[i*2+1]])
    const qfWinners = qfPairs.map(([a, b], i) => {
      const [sa, sb] = bracketScores.qf[i]
      return getWinner(a, b, sa, sb)
    })
    const sfPairs = [[qfWinners[0], qfWinners[1]], [qfWinners[2], qfWinners[3]]]
    const sfLosers = sfPairs.map(([a, b], i) => {
      const w = getWinner(a, b, bracketScores.sf[i][0], bracketScores.sf[i][1])
      return w ? (w === a ? b : a) : null
    })
    const sfWinners = sfPairs.map(([a, b], i) => getWinner(a, b, bracketScores.sf[i][0], bracketScores.sf[i][1]))
    const champion = getWinner(sfWinners[0], sfWinners[1], bracketScores.final[0], bracketScores.final[1])
    return { r32: r32pairs, r16: r16pairs, qf: qfPairs, sf: sfPairs, sfLosers, sfWinners, finalTeams: [sfWinners[0], sfWinners[1]], champion }
  }, [bracket, bracketScores])

  // Simular todo el torneo
  const handleSimAll = useCallback(() => {
    const newScores = { ...scores }
    Object.entries(groups).forEach(([letter, teams]) => {
      newScores[letter] = MATCH_PAIRS.map(([i, j]) => simMatch(teams[i], teams[j]).map(String))
    })
    setScores(newScores)
  }, [groups, scores])

  // Simular ronda de bracket
  const simBracketRound = useCallback((round) => {
    if (!bracketTeams || !bracketScores) return
    const pairs = bracketTeams[round]
    if (!pairs) return
    const newScores = { ...bracketScores }
    newScores[round] = pairs.map(([a, b]) => {
      if (!a || !b) return ['', '']
      const sa = getStrength(a), sb = getStrength(b)
      const pA = sa / (sa + sb)
      const r = Math.random()
      const gA = Math.round(Math.random() * 2 + (r < pA ? 1 : 0))
      const gB = Math.round(Math.random() * 2 + (r >= pA ? 1 : 0))
      return [String(gA), String(gB)]
    })
    setBracketScores(newScores)
  }, [bracketTeams, bracketScores])

  // Reset
  const handleReset = () => {
    setScores(initScores())
    setBracket(null)
    setBracketScores(null)
    setPhase('groups')
  }

  const champion = bracketTeams?.champion
  const champData = champion ? TEAMS[champion] : null

  const ROUND_LABELS = { r32: '16AVOS DE FINAL', r16: '8VOS DE FINAL', qf: 'CUARTOS DE FINAL', sf: 'SEMIFINALES' }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto pb-24 px-2 sm:px-4 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 px-2">
        <div>
          <p className="text-[9px] font-black text-mundial-gold uppercase tracking-[0.4em]">SIMULADOR EDITABLE</p>
          <h1 className="font-display text-4xl sm:text-5xl text-white leading-none">MUNDIAL <span className="text-mundial-gold">2026</span></h1>
          <p className="text-[10px] text-zinc-500 mt-1">Ingresa los resultados manualmente o simula automáticamente · Haz clic en los equipos para editarlos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSimAll} className="btn-gold px-4 py-2.5 text-xs gap-2 justify-center">
            <Zap size={14} /> Simular Grupos
          </button>
          <button onClick={handleReset} className="btn-ghost px-4 py-2.5 text-xs gap-2 justify-center">
            <RotateCcw size={14} /> Reiniciar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/8 px-2">
        {[{ id: 'groups', label: 'Fase de Grupos' }, { id: 'bracket', label: 'Eliminatorias' }].map(({ id, label }) => (
          <button key={id} onClick={() => { if (id === 'bracket' && !bracket) buildBracket(); else setPhase(id) }}
            className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all border-b-2 ${phase === id ? 'text-mundial-gold border-mundial-gold' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
            {label}
          </button>
        ))}
        {phase === 'groups' && (
          <button onClick={buildBracket} className="ml-auto px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-mundial-gold hover:text-white transition-colors flex items-center gap-1.5 pb-2">
            Ver Eliminatorias <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* ── FASE DE GRUPOS ── */}
      {phase === 'groups' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groups).map(([letter, teams]) => (
            <GroupCard
              key={letter}
              letter={letter}
              teams={teams}
              scores={scores[letter]}
              onScoreChange={(mi, side, val) => handleGroupScore(letter, mi, side, val)}
              onTeamChange={(idx, name) => handleTeamChange(letter, idx, name)}
            />
          ))}
        </motion.div>
      )}

      {/* ── ELIMINATORIAS ── */}
      {phase === 'bracket' && bracketTeams && bracketScores && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

          {/* Campeón banner */}
          <AnimatePresence>
            {champion && (
              <motion.div key={champion} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="p-[1.5px] rounded-[1.5rem]" style={{ background: 'linear-gradient(135deg,#b8860b,#FFD700,#b8860b)' }}>
                <div className="bg-mundial-navy rounded-[calc(1.5rem-1.5px)] p-6 flex flex-col sm:flex-row items-center gap-5">
                  <div className="text-6xl">{champData?.flag}</div>
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] font-black text-mundial-gold uppercase tracking-[0.4em]">🏆 CAMPEÓN MUNDIAL 2026</p>
                    <h2 className="font-display text-4xl sm:text-5xl text-white">{champion}</h2>
                    <p className="text-xs text-zinc-500 mt-1">Probabilidad Opta: <span className="text-mundial-gold font-bold">{champData?.opta}%</span></p>
                  </div>
                  <Trophy size={40} className="text-mundial-gold/20 hidden sm:block sm:ml-auto" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabla de terceros */}
          {bracket?.thirds && <ThirdsTable thirds={bracket.thirds} />}

          {/* Rounds */}
          {(['r32', 'r16', 'qf', 'sf']).map(round => {
            const pairs = bracketTeams[round]
            const scoresRound = bracketScores[round]
            if (!pairs) return null
            const cols = round === 'r32' ? 'grid-cols-2 sm:grid-cols-4'
                       : round === 'r16' ? 'grid-cols-2 sm:grid-cols-4'
                       : round === 'qf'  ? 'grid-cols-2'
                       : 'grid-cols-1 sm:grid-cols-2'
            return (
              <div key={round}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-display text-xl text-white">{ROUND_LABELS[round]}</h3>
                  <button onClick={() => simBracketRound(round)} className="text-[9px] font-black text-mundial-gold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                    <Zap size={10} /> Simular ronda
                  </button>
                </div>
                <div className={`grid ${cols} gap-3`}>
                  {pairs.map(([a, b], i) => (
                    <div key={i} className="flex flex-col gap-1">
                      {round === 'r32' && (
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[9px] font-black text-mundial-gold/80 uppercase tracking-widest">
                            {bracket?.r32labels?.[i]}
                          </span>
                          <span className="text-[8px] text-zinc-600 uppercase tracking-wider">
                            {bracket?.r32descs?.[i]}
                          </span>
                        </div>
                      )}
                      <BracketMatch
                        teamA={a} teamB={b}
                        scoreA={scoresRound[i][0]} scoreB={scoresRound[i][1]}
                        onScore={(side, val) => {
                          setBracketScores(prev => ({
                            ...prev,
                            [round]: prev[round].map((s, si) => si === i ? (side === 0 ? [val, s[1]] : [s[0], val]) : s)
                          }))
                        }}
                        compact={round === 'r32'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* FINAL */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-display text-2xl text-mundial-gold flex items-center gap-2"><Trophy size={20} /> GRAN FINAL</h3>
              <button onClick={() => {
                const [a, b] = bracketTeams.finalTeams
                if (!a || !b) return
                const res = simMatch(a, b)
                setBracketScores(prev => ({ ...prev, final: res.map(String) }))
              }} className="text-[9px] font-black text-mundial-gold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                <Zap size={10} /> Simular final
              </button>
            </div>
            <div className="max-w-sm mx-auto">
              <BracketMatch
                teamA={bracketTeams.finalTeams[0]}
                teamB={bracketTeams.finalTeams[1]}
                scoreA={bracketScores.final[0]}
                scoreB={bracketScores.final[1]}
                onScore={(side, val) => setBracketScores(prev => ({
                  ...prev, final: side === 0 ? [val, prev.final[1]] : [prev.final[0], val]
                }))}
              />
            </div>
          </div>

          {/* 3er puesto */}
          {bracketTeams.sfLosers.some(Boolean) && (
            <div>
              <h3 className="font-display text-lg text-zinc-400 mb-3 px-1">3° Y 4° PUESTO</h3>
              <div className="max-w-sm mx-auto">
                <BracketMatch
                  teamA={bracketTeams.sfLosers[0]}
                  teamB={bracketTeams.sfLosers[1]}
                  scoreA="" scoreB=""
                  onScore={() => {}}
                />
              </div>
            </div>
          )}

          {/* Regenerar bracket */}
          <div className="text-center pt-4">
            <button onClick={() => { buildBracket() }} className="btn-ghost px-6 py-2.5 text-xs gap-2 justify-center">
              <RotateCcw size={13} /> Regenerar bracket desde grupos
            </button>
          </div>
        </motion.div>
      )}

      {/* Nota */}
      <p className="text-[8px] text-zinc-700 font-mono uppercase tracking-widest px-2 text-center">
        Grupos basados en el sorteo oficial FIFA dic. 2024 · Equipos y resultados son editables · Empate en eliminatoria se resuelve por penales (editable)
      </p>
    </motion.div>
  )
}
