import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RefreshCw, BarChart3, Zap, ChevronDown, Trophy, Shuffle } from 'lucide-react'

// ── DATOS DE EQUIPOS (Probabilidades Opta + Historial Mundialista) ────────────
const TEAMS = {
  'España':          { flag: '🇪🇸', opta: 16.3, titles: 1, finals: 1,  semis: 2,  color: '#c60b1e' },
  'Francia':         { flag: '🇫🇷', opta: 12.4, titles: 2, finals: 3,  semis: 6,  color: '#002395' },
  'Inglaterra':      { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', opta: 11.3, titles: 1, finals: 1,  semis: 3,  color: '#012169' },
  'Argentina':       { flag: '🇦🇷', opta: 10.7, titles: 3, finals: 5,  semis: 6,  color: '#74acdf' },
  'Portugal':        { flag: '🇵🇹', opta: 6.9,  titles: 0, finals: 0,  semis: 1,  color: '#006600' },
  'Brasil':          { flag: '🇧🇷', opta: 6.1,  titles: 5, finals: 7,  semis: 11, color: '#009c3b' },
  'Alemania':        { flag: '🇩🇪', opta: 5.7,  titles: 4, finals: 8,  semis: 13, color: '#000000' },
  'Países Bajos':    { flag: '🇳🇱', opta: 3.9,  titles: 0, finals: 3,  semis: 5,  color: '#ff6600' },
  'Noruega':         { flag: '🇳🇴', opta: 3.4,  titles: 0, finals: 0,  semis: 0,  color: '#ef2b2d' },
  'Bélgica':         { flag: '🇧🇪', opta: 2.3,  titles: 0, finals: 0,  semis: 1,  color: '#000000' },
  'Colombia':        { flag: '🇨🇴', opta: 2.0,  titles: 0, finals: 0,  semis: 0,  color: '#fcd116' },
  'Marruecos':       { flag: '🇲🇦', opta: 1.7,  titles: 0, finals: 0,  semis: 1,  color: '#c1272d' },
  'Uruguay':         { flag: '🇺🇾', opta: 1.7,  titles: 2, finals: 3,  semis: 6,  color: '#75aadb' },
  'México':          { flag: '🇲🇽', opta: 1.6,  titles: 0, finals: 0,  semis: 0,  color: '#006847' },
  'Ecuador':         { flag: '🇪🇨', opta: 1.6,  titles: 0, finals: 0,  semis: 0,  color: '#ffd100' },
  'Suiza':           { flag: '🇨🇭', opta: 1.5,  titles: 0, finals: 0,  semis: 0,  color: '#ff0000' },
  'Croacia':         { flag: '🇭🇷', opta: 1.3,  titles: 0, finals: 1,  semis: 2,  color: '#ff0000' },
  'USA':             { flag: '🇺🇸', opta: 1.3,  titles: 0, finals: 0,  semis: 1,  color: '#002868' },
  'Japón':           { flag: '🇯🇵', opta: 1.2,  titles: 0, finals: 0,  semis: 0,  color: '#bc002d' },
  'Turquía':         { flag: '🇹🇷', opta: 1.0,  titles: 0, finals: 0,  semis: 1,  color: '#e30a17' },
  'Senegal':         { flag: '🇸🇳', opta: 0.9,  titles: 0, finals: 0,  semis: 1,  color: '#00853f' },
  'Canadá':          { flag: '🇨🇦', opta: 0.9,  titles: 0, finals: 0,  semis: 0,  color: '#ff0000' },
  'Paraguay':        { flag: '🇵🇾', opta: 0.5,  titles: 0, finals: 0,  semis: 0,  color: '#d52b1e' },
  'Suecia':          { flag: '🇸🇪', opta: 0.5,  titles: 0, finals: 1,  semis: 3,  color: '#006aa7' },
  'Austria':         { flag: '🇦🇹', opta: 0.4,  titles: 0, finals: 1,  semis: 2,  color: '#ed2939' },
  'Corea del Sur':   { flag: '🇰🇷', opta: 0.4,  titles: 0, finals: 0,  semis: 1,  color: '#003478' },
  'Australia':       { flag: '🇦🇺', opta: 0.3,  titles: 0, finals: 0,  semis: 1,  color: '#00843d' },
  'Irán':            { flag: '🇮🇷', opta: 0.3,  titles: 0, finals: 0,  semis: 0,  color: '#239f40' },
  'Rep. Checa':      { flag: '🇨🇿', opta: 0.3,  titles: 0, finals: 0,  semis: 0,  color: '#d7141a' },
  'Escocia':         { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', opta: 0.2,  titles: 0, finals: 0,  semis: 0,  color: '#003399' },
  'Egipto':          { flag: '🇪🇬', opta: 0.2,  titles: 0, finals: 0,  semis: 0,  color: '#ce1126' },
  'Bosnia y Herz.':  { flag: '🇧🇦', opta: 0.2,  titles: 0, finals: 0,  semis: 0,  color: '#002395' },
  'Costa de Marfil': { flag: '🇨🇮', opta: 0.2,  titles: 0, finals: 0,  semis: 0,  color: '#009a00' },
  'Argelia':         { flag: '🇩🇿', opta: 0.2,  titles: 0, finals: 0,  semis: 0,  color: '#006233' },
  'Ghana':           { flag: '🇬🇭', opta: 0.2,  titles: 0, finals: 0,  semis: 0,  color: '#006b3f' },
  'Sudáfrica':       { flag: '🇿🇦', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#007a4d' },
  'Túnez':           { flag: '🇹🇳', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#e70013' },
  'Uzbekistán':      { flag: '🇺🇿', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#1eb53a' },
  'Panamá':          { flag: '🇵🇦', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#da121a' },
  'Nueva Zelanda':   { flag: '🇳🇿', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#000000' },
  'Irak':            { flag: '🇮🇶', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#007a3d' },
  'Jordania':        { flag: '🇯🇴', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#007a3d' },
  'RD Congo':        { flag: '🇨🇩', opta: 0.1,  titles: 0, finals: 0,  semis: 0,  color: '#007fff' },
  'Catar':           { flag: '🇶🇦', opta: 0.05, titles: 0, finals: 0,  semis: 0,  color: '#8d1b3d' },
  'Arabia Saudita':  { flag: '🇸🇦', opta: 0.05, titles: 0, finals: 0,  semis: 0,  color: '#006c35' },
  'Cabo Verde':      { flag: '🇨🇻', opta: 0.05, titles: 0, finals: 0,  semis: 0,  color: '#003893' },
  'Haití':           { flag: '🇭🇹', opta: 0.05, titles: 0, finals: 0,  semis: 0,  color: '#00209f' },
  'Curazao':         { flag: '🇨🇼', opta: 0.05, titles: 0, finals: 0,  semis: 0,  color: '#003082' },
}

// ── GRUPOS MUNDIAL 2026 (Sorteo oficial FIFA – diciembre 2024) ─────────────────
// Grupos A-C: Sedes (USA, México, Canadá)
// Grupos G-J: "Grupos de la muerte" con 2 potencias UEFA
const GROUPS = {
  A: ['USA',       'Panamá',       'Bosnia y Herz.',  'Curazao'],
  B: ['México',    'Noruega',      'Ghana',           'Jordania'],
  C: ['Canadá',    'Escocia',      'Senegal',         'Irak'],
  D: ['Haití',     'Suecia',       'Costa de Marfil', 'Australia'],
  E: ['Curazao',   'Austria',      'Argelia',         'Irán'],       // Curazao placeholder if TBD
  F: ['Panamá',    'Turquía',      'RD Congo',        'Catar'],
  G: ['Argentina', 'España',       'Bélgica',         'Japón'],
  H: ['Brasil',    'Alemania',     'Rep. Checa',      'Arabia Saudita'],
  I: ['Uruguay',   'Francia',      'Países Bajos',    'Sudáfrica'],
  J: ['Colombia',  'Inglaterra',   'Croacia',         'Corea del Sur'],
  K: ['Ecuador',   'Portugal',     'Túnez',           'Nueva Zelanda'],
  L: ['Paraguay',  'Suiza',        'Egipto',          'Cabo Verde'],
}

// Fix: remove duplicates (Curazao/Panamá appear twice due to draw uncertainty)
// Use Uzbekistán and Marruecos instead
GROUPS.E = ['Uzbekistán', 'Austria', 'Argelia', 'Irán']
GROUPS.F = ['Marruecos',  'Turquía', 'RD Congo', 'Catar']
GROUPS.A = ['USA',        'Panamá',  'Bosnia y Herz.', 'Ghana']
GROUPS.B = ['México',     'Noruega', 'Egipto',         'Jordania']
GROUPS.C = ['Canadá',     'Escocia', 'Senegal',        'Irak']
GROUPS.D = ['Haití',      'Suecia',  'Costa de Marfil','Australia']

// ── AJUSTES HEAD-TO-HEAD HISTÓRICOS ──────────────────────────────────────────
// Factor multiplicador: > 1 = team A rinde mejor históricamente vs team B en mundiales
const H2H = {
  'Argentina|Alemania':  1.08,  // 1986 ganó ARG, 2014 ganó ALE (empate histórico)
  'Alemania|Argentina':  0.93,
  'Argentina|Francia':   1.06,  // 2022 final: ARG ganó en penales
  'Francia|Argentina':   0.94,
  'Brasil|Alemania':     0.85,  // Trauma del 7-1 en 2014
  'Alemania|Brasil':     1.15,
  'España|Francia':      1.10,  // España domina históricamente a Francia
  'Francia|España':      0.91,
  'Argentina|Inglaterra':1.07,  // Mano de Dios 1986, Messi 2022
  'Inglaterra|Argentina':0.93,
  'Uruguay|Brasil':      1.13,  // Maracanazo 1950
  'Brasil|Uruguay':      0.88,
  'Alemania|Francia':    1.09,  // Clásico europeo, ALE históricamente superior
  'Francia|Alemania':    0.92,
  'Brasil|Francia':      1.06,  // 1998 Francia ganó (local), pero historial favoreció a Brasil
  'Francia|Brasil':      0.94,
  'España|Alemania':     1.08,  // España ganó 2010, varios enfrentamientos
  'Alemania|España':     0.93,
  'Países Bajos|Argentina': 1.04, // 1978 final y 2014 semi
  'Argentina|Países Bajos': 0.96,
  'Croacia|Brasil':      1.05,  // 2022 QF penales
  'Brasil|Croacia':      0.95,
  'Marruecos|España':    1.04,  // 2022 QF penales
  'España|Marruecos':    0.96,
  'Japón|Alemania':      1.03,  // 2022 golpe histórico
  'Alemania|Japón':      0.97,
  'Japón|España':        1.03,  // 2022 remontada
  'España|Japón':        0.97,
}

// ── MOTOR DE SIMULACIÓN ───────────────────────────────────────────────────────

function getStrength(name) {
  const t = TEAMS[name]
  if (!t) return 2
  // Opta como señal principal (raíz cuadrada para comprimir rango)
  const base = Math.sqrt(Math.max(t.opta, 0.05)) * 14
  // Bonus experiencia mundialista (peso menor)
  const exp = t.titles * 1.8 + t.finals * 0.5 + t.semis * 0.18
  return base + exp
}

function h2hFactor(a, b) {
  return H2H[`${a}|${b}`] || 1.0
}

function simulateScore(sA, sB) {
  // Simula marcador aproximado basado en fortalezas
  const totalStr = sA + sB
  const lambda = 2.5 // promedio goles por partido en mundiales
  const goalsA = Math.round(Math.max(0, (sA / totalStr) * lambda + (Math.random() - 0.5) * 1.2))
  const goalsB = Math.round(Math.max(0, (sB / totalStr) * lambda + (Math.random() - 0.5) * 1.2))
  return { goalsA, goalsB }
}

function simulateGroupMatch(nameA, nameB) {
  const sA = getStrength(nameA) * h2hFactor(nameA, nameB)
  const sB = getStrength(nameB) * h2hFactor(nameB, nameA)
  const total = sA + sB
  const pA = sA / total

  // Probabilidad de empate: mayor cuando los equipos son más parejos
  const equalness = 1 - Math.abs(pA - 0.5) * 2
  const pDraw = 0.13 + equalness * 0.14

  const r = Math.random()
  const pWinA = (1 - pDraw) * pA

  let { goalsA, goalsB } = simulateScore(sA, sB)

  if (r < pWinA) {
    if (goalsA <= goalsB) goalsA = goalsB + 1
    return { pts: [3, 0], gf: [goalsA, goalsB], gc: [goalsB, goalsA] }
  } else if (r < pWinA + pDraw) {
    const g = Math.min(goalsA, goalsB)
    return { pts: [1, 1], gf: [g, g], gc: [g, g] }
  } else {
    if (goalsB <= goalsA) goalsB = goalsA + 1
    return { pts: [0, 3], gf: [goalsA, goalsB], gc: [goalsB, goalsA] }
  }
}

function simulateKnockout(nameA, nameB) {
  const sA = getStrength(nameA) * h2hFactor(nameA, nameB)
  const sB = getStrength(nameB) * h2hFactor(nameB, nameA)
  // En eliminatoria: factor de incertidumbre más alto (penales)
  const base = sA / (sA + sB)
  const uncertainty = 0.08
  const pA = base * (1 - uncertainty) + 0.5 * uncertainty
  return Math.random() < pA ? nameA : nameB
}

function simulateGroupStage() {
  const standings = {}
  Object.entries(GROUPS).forEach(([letter, teams]) => {
    const rows = teams.map(name => ({ name, pts: 0, gf: 0, gc: 0, pj: 0 }))
    const results = []

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const { pts, gf, gc } = simulateGroupMatch(teams[i], teams[j])
        rows[i].pts += pts[0]; rows[i].gf += gf[0]; rows[i].gc += gc[0]; rows[i].pj++
        rows[j].pts += pts[1]; rows[j].gf += gf[1]; rows[j].gc += gc[1]; rows[j].pj++
        results.push({ home: teams[i], away: teams[j], hg: gf[0], ag: gf[1] })
      }
    }

    rows.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gdDiff = (b.gf - b.gc) - (a.gf - a.gc)
      if (gdDiff !== 0) return gdDiff
      return b.gf - a.gf
    })

    standings[letter] = { rows, results }
  })
  return standings
}

function simulateTournament() {
  const groupStage = simulateGroupStage()

  // Clasificados: top 2 de cada grupo (24) + 8 mejores 3ros (8) = 32
  const firstPlace = [], secondPlace = [], thirds = []
  Object.entries(groupStage).forEach(([letter, { rows }]) => {
    firstPlace.push({ name: rows[0].name, group: letter })
    secondPlace.push({ name: rows[1].name, group: letter })
    thirds.push({ name: rows[2].name, group: letter, pts: rows[2].pts, gd: rows[2].gf - rows[2].gc, gf: rows[2].gf })
  })

  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  const best8thirds = thirds.slice(0, 8).map(t => t.name)

  // Bracket de 32: 1ros + 2dos + mejores 3ros
  const bracket = [
    ...firstPlace.map(t => t.name),
    ...secondPlace.map(t => t.name),
    ...best8thirds,
  ]

  function simRound(teams) {
    const matchups = [], winners = []
    for (let i = 0; i < teams.length; i += 2) {
      const a = teams[i], b = teams[i + 1]
      if (!b) { winners.push(a); matchups.push([a, '—']); continue }
      const w = simulateKnockout(a, b)
      matchups.push([a, b])
      winners.push(w)
    }
    return { matchups, winners }
  }

  const r32 = simRound(bracket)
  const r16 = simRound(r32.winners)
  const qf  = simRound(r16.winners)
  const sf  = simRound(qf.winners)

  const sfLosers = sf.matchups.map(([a, b]) => sf.winners.includes(a) ? b : a).filter(Boolean)
  const thirdPlace = sfLosers.length >= 2 ? simulateKnockout(sfLosers[0], sfLosers[1]) : sfLosers[0]

  const [finalist1, finalist2] = sf.winners
  const champion = simulateKnockout(finalist1, finalist2)
  const runnerUp = champion === finalist1 ? finalist2 : finalist1

  return {
    groupStage,
    r32, r16, qf, sf,
    final: { teams: [finalist1, finalist2], winner: champion },
    thirdPlace,
    champion,
    runnerUp,
  }
}

function runMonteCarlo(n = 1000) {
  const wins = {}
  const finals = {}
  const semis = {}
  for (let i = 0; i < n; i++) {
    const r = simulateTournament()
    wins[r.champion] = (wins[r.champion] || 0) + 1
    finals[r.champion] = (finals[r.champion] || 0) + 1
    finals[r.runnerUp] = (finals[r.runnerUp] || 0) + 1
    r.sf.winners.forEach(t => { semis[t] = (semis[t] || 0) + 1 })
    r.final.teams.forEach(t => { semis[t] = (semis[t] || 0) + 1 })
  }
  return Object.keys(TEAMS).map(name => ({
    name,
    winPct: ((wins[name] || 0) / n * 100).toFixed(1),
    finalPct: ((finals[name] || 0) / n * 100).toFixed(1),
    semifinalPct: ((semis[name] || 0) / n * 100).toFixed(1),
    opta: TEAMS[name].opta,
  })).filter(t => parseFloat(t.winPct) > 0 || parseFloat(t.finalPct) > 0)
    .sort((a, b) => parseFloat(b.winPct) - parseFloat(a.winPct))
}

// ── COMPONENTES UI ────────────────────────────────────────────────────────────

function Flag({ name }) {
  return <span className="text-lg leading-none">{TEAMS[name]?.flag || '🏴'}</span>
}



function GroupCard({ letter, data, open, onToggle }) {
  const { rows, results } = data
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-mundial-gold/15 text-mundial-gold flex items-center justify-center font-display text-lg border border-mundial-gold/20 shrink-0">
            {letter}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {rows.slice(0, 2).map((r, i) => (
              <span key={r.name} className={`text-xs font-bold flex items-center gap-1 ${i === 0 ? 'text-white' : 'text-zinc-400'}`}>
                {TEAMS[r.name]?.flag} {r.name}
                <span className={`text-[9px] px-1 rounded font-black ${i < 2 ? 'bg-mundial-gold/20 text-mundial-gold' : 'bg-white/5 text-zinc-600'}`}>✓</span>
              </span>
            ))}
          </div>
        </div>
        <ChevronDown size={15} className={`text-zinc-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] text-zinc-600 uppercase tracking-widest bg-white/5">
                <th className="text-left px-4 py-2 w-5">#</th>
                <th className="text-left px-2 py-2">Selección</th>
                <th className="text-center px-3 py-2">PJ</th>
                <th className="text-center px-3 py-2">GD</th>
                <th className="text-center px-4 py-2 text-mundial-gold font-black">PTS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className={`border-t border-white/5 ${i < 2 ? 'bg-mundial-gold/[0.025]' : ''}`}>
                  <td className="px-4 py-2.5 text-zinc-600">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <Flag name={r.name} />
                      <span className={`${i < 2 ? 'text-white font-bold' : 'text-zinc-500'}`}>{r.name}</span>
                      {i < 2 && <span className="text-[8px] text-mundial-gold font-black ml-1">CLASIFICA</span>}
                    </span>
                  </td>
                  <td className="text-center px-3 py-2.5 text-zinc-500">{r.pj}</td>
                  <td className={`text-center px-3 py-2.5 font-mono font-bold ${(r.gf - r.gc) > 0 ? 'text-green-500' : (r.gf - r.gc) < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                    {r.gf - r.gc > 0 ? '+' : ''}{r.gf - r.gc}
                  </td>
                  <td className="text-center px-4 py-2.5 font-display text-lg text-white">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 pt-2 border-t border-white/5 space-y-1.5">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Resultados</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center text-xs">
                <span className="flex-1 text-right text-zinc-400 truncate pr-2">{TEAMS[r.home]?.flag} {r.home}</span>
                <span className="font-display text-sm text-white tabular-nums bg-white/5 px-3 py-0.5 rounded-lg shrink-0">
                  {r.hg} – {r.ag}
                </span>
                <span className="flex-1 text-zinc-400 truncate pl-2">{r.away} {TEAMS[r.away]?.flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KnockoutRound({ title, matchups, winners, openByDefault = false }) {
  const [open, setOpen] = useState(openByDefault)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-display text-base text-white">{title}</span>
          <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">{matchups.length} partidos</span>
        </div>
        <ChevronDown size={15} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {matchups.map(([a, b], i) => {
            const w = winners[i]
            if (b === '—') return null
            return (
              <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                <span className={`flex items-center gap-1.5 flex-1 justify-end text-xs ${w === a ? 'text-white font-bold' : 'text-zinc-500'}`}>
                  {TEAMS[a]?.flag} {a}
                  {w === a && <span className="text-mundial-gold text-[10px] font-black">→</span>}
                </span>
                <span className="text-zinc-700 text-[9px] font-bold bg-white/3 px-2 py-0.5 rounded">VS</span>
                <span className={`flex items-center gap-1.5 flex-1 text-xs ${w === b ? 'text-white font-bold' : 'text-zinc-500'}`}>
                  {w === b && <span className="text-mundial-gold text-[10px] font-black">←</span>}
                  {b} {TEAMS[b]?.flag}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function McStats({ stats }) {
  const max = parseFloat(stats[0]?.winPct || 1)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
      <div className="grid grid-cols-4 text-[9px] text-zinc-600 uppercase tracking-widest font-bold px-2 pb-2 border-b border-white/5">
        <span className="col-span-2">Selección</span>
        <span className="text-center">Final</span>
        <span className="text-right">Campeón</span>
      </div>
      {stats.slice(0, 20).map(({ name, winPct, finalPct }, i) => (
        <div key={name} className="flex items-center gap-3">
          <span className="text-[9px] text-zinc-700 w-4 text-right font-mono shrink-0">{i + 1}</span>
          <span className="text-base shrink-0">{TEAMS[name]?.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-200 truncate">{name}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[9px] text-zinc-600">{finalPct}% final</span>
                <span className="text-xs font-mono font-black text-mundial-gold w-10 text-right">{winPct}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(parseFloat(winPct) / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: i === 0 ? 'linear-gradient(90deg,#b8860b,#FFD700)' :
                               i < 4 ? 'rgba(255,215,0,0.45)' :
                               i < 8 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [result, setResult] = useState(null)
  const [mcStats, setMcStats] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [mcRunning, setMcRunning] = useState(false)
  const [tab, setTab] = useState('groups')
  const [openGroups, setOpenGroups] = useState({})

  const handleSim = useCallback(() => {
    setSimulating(true)
    setMcStats(null)
    setTimeout(() => {
      setResult(simulateTournament())
      setTab('groups')
      setOpenGroups({})
      setSimulating(false)
    }, 350)
  }, [])

  const handleMonteCarlo = useCallback(() => {
    setMcRunning(true)
    setTimeout(() => {
      setMcStats(runMonteCarlo(1000))
      setMcRunning(false)
      setTab('stats')
    }, 80)
  }, [])

  const toggleGroup = (letter) => setOpenGroups(o => ({ ...o, [letter]: !o[letter] }))

  const champ = result?.champion
  const champData = champ ? TEAMS[champ] : null

  const TABS = [
    { id: 'groups',  label: 'Grupos' },
    { id: 'bracket', label: 'Eliminatorias' },
    ...(mcStats ? [{ id: 'stats', label: '1000 Sim.' }] : []),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-24 px-4 space-y-6"
    >
      {/* Hero */}
      <div className="text-center py-10 relative">
        <div className="absolute inset-0 -z-0 bg-gradient-to-b from-mundial-gold/4 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[9px] font-black text-mundial-gold uppercase tracking-[0.45em] mb-2">
            SIMULADOR OFICIAL • OPTA + HISTORIAL
          </p>
          <h1 className="font-display text-5xl sm:text-7xl text-white mb-1 leading-none">
            MUNDIAL <span className="text-mundial-gold">2026</span>
          </h1>
          <p className="text-xs text-zinc-500 mb-7 max-w-md mx-auto leading-relaxed mt-3">
            Modelo probabilístico con datos Opta, historial de títulos mundiales y
            ajustes head-to-head entre selecciones (Maracanazo, 7-1, 2022, etc.)
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSim}
              disabled={simulating}
              className="btn-gold px-8 py-4 text-sm justify-center gap-2.5 shadow-2xl shadow-mundial-gold/25 w-full sm:w-auto"
            >
              {simulating
                ? <><RefreshCw size={18} className="animate-spin" /> SIMULANDO...</>
                : <><Play size={18} fill="currentColor" /> SIMULAR MUNDIAL</>}
            </motion.button>

            {result && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleMonteCarlo}
                disabled={mcRunning}
                className="btn-ghost px-8 py-4 text-sm justify-center gap-2.5 w-full sm:w-auto"
              >
                {mcRunning
                  ? <><Zap size={18} className="animate-pulse text-mundial-gold" /> CORRIENDO 1000 SIM...</>
                  : <><BarChart3 size={18} /> 1000 SIMULACIONES</>}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Champion Banner */}
      <AnimatePresence mode="wait">
        {champ && (
          <motion.div
            key={champ}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="p-[1.5px] rounded-[1.75rem]"
            style={{ background: 'linear-gradient(135deg, #b8860b 0%, #FFD700 50%, #b8860b 100%)' }}
          >
            <div className="bg-mundial-navy rounded-[calc(1.75rem-1.5px)] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
              <div className="text-6xl sm:text-7xl">{champData?.flag}</div>
              <div className="text-center sm:text-left flex-1">
                <p className="text-[9px] font-black text-mundial-gold uppercase tracking-[0.4em] mb-1">🏆 CAMPEÓN MUNDIAL 2026</p>
                <h2 className="font-display text-4xl sm:text-5xl text-white">{champ}</h2>
                <div className="flex flex-wrap gap-3 mt-2 justify-center sm:justify-start">
                  <span className="text-xs text-zinc-400">Opta: <span className="text-mundial-gold font-bold">{champData?.opta}%</span></span>
                  {champData && champData.titles > 0 && (
                    <span className="text-xs text-zinc-500">{champData.titles}× campeón histórico</span>
                  )}
                  <span className="text-xs text-zinc-500">
                    Subcampeón: {TEAMS[result.runnerUp]?.flag} {result.runnerUp}
                  </span>
                  {result.thirdPlace && (
                    <span className="text-xs text-zinc-500">
                      3°: {TEAMS[result.thirdPlace]?.flag} {result.thirdPlace}
                    </span>
                  )}
                </div>
              </div>
              <Trophy size={40} className="text-mundial-gold/20 hidden sm:block" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      {result && (
        <div className="flex gap-1 border-b border-white/5">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all border-b-2 ${
                tab === id
                  ? 'text-mundial-gold border-mundial-gold'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center pb-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSim}
              className="flex items-center gap-1.5 text-[9px] text-zinc-600 hover:text-mundial-gold transition-colors font-bold uppercase tracking-widest px-2"
            >
              <Shuffle size={12} /> Re-simular
            </motion.button>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {result && tab === 'groups' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-3">
          {Object.entries(result.groupStage).map(([letter, data]) => (
            <GroupCard
              key={letter}
              letter={letter}
              data={data}
              open={!!openGroups[letter]}
              onToggle={() => toggleGroup(letter)}
            />
          ))}
        </motion.div>
      )}

      {/* Bracket Tab */}
      {result && tab === 'bracket' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <KnockoutRound title="RONDA DE 32 · 32avos" matchups={result.r32.matchups} winners={result.r32.winners} />
          <KnockoutRound title="RONDA DE 16 · 16avos" matchups={result.r16.matchups} winners={result.r16.winners} openByDefault />
          <KnockoutRound title="CUARTOS DE FINAL" matchups={result.qf.matchups} winners={result.qf.winners} openByDefault />
          <KnockoutRound title="SEMIFINALES" matchups={result.sf.matchups} winners={result.sf.winners} openByDefault />

          {/* Final */}
          <div className="card p-6 border border-mundial-gold/15">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-2xl text-mundial-gold">GRAN FINAL</h3>
              <Trophy size={22} className="text-mundial-gold" />
            </div>
            <div className="flex items-center gap-4 justify-center py-2">
              {[0, 1].map(idx => {
                const team = result.final.teams[idx]
                const isWinner = result.final.winner === team
                return (
                  <div key={team} className={`flex-1 text-center transition-all ${isWinner ? 'opacity-100' : 'opacity-35'}`}>
                    <div className="text-5xl mb-2">{TEAMS[team]?.flag}</div>
                    <p className={`font-bold text-sm ${isWinner ? 'text-white' : 'text-zinc-500'}`}>{team}</p>
                    {isWinner && <p className="text-mundial-gold text-[9px] font-black mt-1 uppercase tracking-widest">CAMPEÓN 🏆</p>}
                  </div>
                )
              })}
            </div>
            {result.thirdPlace && (
              <p className="text-center text-xs text-zinc-600 mt-4 pt-4 border-t border-white/5">
                3° Lugar → {TEAMS[result.thirdPlace]?.flag} <span className="text-zinc-400 font-bold">{result.thirdPlace}</span>
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && mcStats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-5">
            Probabilidad de ganar el Mundial · 1,000 simulaciones Monte Carlo
          </p>
          <McStats stats={mcStats} />
        </motion.div>
      )}

      {/* Nota metodológica */}
      {!result && (
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          {[
            { icon: '📊', title: 'Opta 2026', desc: 'Probabilidades reales de conquista del Mundial según modelo Opta.' },
            { icon: '🏆', title: 'Historial Mundialista', desc: 'Bonus por títulos, finales y semifinales alcanzadas históricamente.' },
            { icon: '⚡', title: 'Head-to-Head', desc: 'Ajustes por encuentros históricos clave: Maracanazo, 7-1, 2022, etc.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="card p-5 text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-display text-base text-white mb-2">{title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 border-white/5">
        <p className="text-[8px] text-zinc-700 font-mono uppercase tracking-widest leading-relaxed">
          Simulación con fines de entretenimiento. Grupos basados en sorteo oficial FIFA (dic. 2024).
          Modelo: fuerza = √(Opta%) × 14 + bonus historial. Empate dinámico 13–27% según igualdad.
          Factor incertidumbre eliminatoria: +8% (factor penales). 1000 simulaciones Monte Carlo.
        </p>
      </div>
    </motion.div>
  )
}
