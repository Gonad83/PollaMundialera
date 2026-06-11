import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ChevronRight, RotateCcw, Zap, Save, CheckCircle2, MousePointerClick } from 'lucide-react'
import { matchApi } from '../lib/api'
import { THIRDS_TABLE } from '../data/annexC'
import { CODE_TO_ESP } from '../lib/teams'

// ── EQUIPOS ───────────────────────────────────────────────────────────────────
// code = ISO 3166-1 alpha-2 para flagcdn.com (gb-eng / gb-sct para naciones UK)
const TEAMS = {
  'España':          { code: 'es',     opta: 16.3, titles: 1 },
  'Francia':         { code: 'fr',     opta: 12.4, titles: 2 },
  'Inglaterra':      { code: 'gb-eng', opta: 11.3, titles: 1 },
  'Argentina':       { code: 'ar',     opta: 10.7, titles: 3 },
  'Portugal':        { code: 'pt',     opta: 6.9,  titles: 0 },
  'Brasil':          { code: 'br',     opta: 6.1,  titles: 5 },
  'Alemania':        { code: 'de',     opta: 5.7,  titles: 4 },
  'Países Bajos':    { code: 'nl',     opta: 3.9,  titles: 0 },
  'Noruega':         { code: 'no',     opta: 3.4,  titles: 0 },
  'Bélgica':         { code: 'be',     opta: 2.3,  titles: 0 },
  'Colombia':        { code: 'co',     opta: 2.0,  titles: 0 },
  'Marruecos':       { code: 'ma',     opta: 1.7,  titles: 0 },
  'Uruguay':         { code: 'uy',     opta: 1.7,  titles: 2 },
  'México':          { code: 'mx',     opta: 1.6,  titles: 0 },
  'Ecuador':         { code: 'ec',     opta: 1.6,  titles: 0 },
  'Suiza':           { code: 'ch',     opta: 1.5,  titles: 0 },
  'Croacia':         { code: 'hr',     opta: 1.3,  titles: 0 },
  'USA':             { code: 'us',     opta: 1.3,  titles: 0 },
  'Japón':           { code: 'jp',     opta: 1.2,  titles: 0 },
  'Turquía':         { code: 'tr',     opta: 1.0,  titles: 0 },
  'Senegal':         { code: 'sn',     opta: 0.9,  titles: 0 },
  'Canadá':          { code: 'ca',     opta: 0.9,  titles: 0 },
  'Paraguay':        { code: 'py',     opta: 0.5,  titles: 0 },
  'Suecia':          { code: 'se',     opta: 0.5,  titles: 0 },
  'Austria':         { code: 'at',     opta: 0.4,  titles: 0 },
  'Corea del Sur':   { code: 'kr',     opta: 0.4,  titles: 0 },
  'Australia':       { code: 'au',     opta: 0.3,  titles: 0 },
  'Irán':            { code: 'ir',     opta: 0.3,  titles: 0 },
  'Rep. Checa':      { code: 'cz',     opta: 0.3,  titles: 0 },
  'Escocia':         { code: 'gb-sct', opta: 0.2,  titles: 0 },
  'Egipto':          { code: 'eg',     opta: 0.2,  titles: 0 },
  'Bosnia y Herz.':  { code: 'ba',     opta: 0.2,  titles: 0 },
  'Costa de Marfil': { code: 'ci',     opta: 0.2,  titles: 0 },
  'Argelia':         { code: 'dz',     opta: 0.2,  titles: 0 },
  'Ghana':           { code: 'gh',     opta: 0.2,  titles: 0 },
  'Sudáfrica':       { code: 'za',     opta: 0.1,  titles: 0 },
  'Túnez':           { code: 'tn',     opta: 0.1,  titles: 0 },
  'Uzbekistán':      { code: 'uz',     opta: 0.1,  titles: 0 },
  'Panamá':          { code: 'pa',     opta: 0.1,  titles: 0 },
  'Nueva Zelanda':   { code: 'nz',     opta: 0.1,  titles: 0 },
  'Irak':            { code: 'iq',     opta: 0.1,  titles: 0 },
  'Jordania':        { code: 'jo',     opta: 0.1,  titles: 0 },
  'RD Congo':        { code: 'cd',     opta: 0.1,  titles: 0 },
  'Catar':           { code: 'qa',     opta: 0.05, titles: 0 },
  'Arabia Saudita':  { code: 'sa',     opta: 0.05, titles: 0 },
  'Cabo Verde':      { code: 'cv',     opta: 0.05, titles: 0 },
  'Haití':           { code: 'ht',     opta: 0.05, titles: 0 },
  'Curazao':         { code: 'cw',     opta: 0.05, titles: 0 },
}

// ── MAPEO FIFA TLA → flagcdn ISO alpha-2 ─────────────────────────────────────
const FIFA_TO_ISO2 = {
  ARG:'ar', BRA:'br', URU:'uy', COL:'co', ECU:'ec', PAR:'py', CHI:'cl',
  FRA:'fr', ENG:'gb-eng', ESP:'es', POR:'pt', BEL:'be', GER:'de',
  NED:'nl', ITA:'it', CRO:'hr', SUI:'ch', AUT:'at', TUR:'tr',
  SCO:'gb-sct', NOR:'no', SWE:'se', DEN:'dk', SRB:'rs', POL:'pl', UKR:'ua',
  USA:'us', MEX:'mx', CAN:'ca', CRC:'cr', JAM:'jm', HON:'hn', PAN:'pa',
  MAR:'ma', SEN:'sn', EGY:'eg', RSA:'za', CIV:'ci', GHA:'gh', ALG:'dz',
  NGA:'ng', CMR:'cm',
  JPN:'jp', KOR:'kr', KSA:'sa', IRN:'ir', AUS:'au', QAT:'qa', CHN:'cn', IRQ:'iq',
  NZL:'nz', UZB:'uz', BIH:'ba', CZE:'cz', TUN:'tn', JOR:'jo',
  CPV:'cv', COD:'cd', HTI:'ht', HAI:'ht', CUW:'cw', CUR:'cw',
}

// Cache de metadatos de equipos del API (code, flagUrl) indexado por nombre español
const _teamMeta = {}

// ── PROBABILIDADES REALES (hoja de cálculo) ───────────────────────────────────
// win = % de ganar el torneo — fuente principal para la simulación
const TEAM_PROBS = {
  'España':          { win: 21.1, final: 35.6, sf: 48.5, qf: 78.1, r16: 85.2, groups: 98.9 },
  'Francia':         { win: 15.7, final: 28.4, sf: 44.2, qf: 72.4, r16: 82.4, groups: 98.1 },
  'Inglaterra':      { win: 14.7, final: 26.8, sf: 41.5, qf: 71.0, r16: 80.1, groups: 97.5 },
  'Brasil':          { win: 11.6, final: 21.7, sf: 38.4, qf: 67.2, r16: 78.5, groups: 96.8 },
  'Argentina':       { win: 10.0, final: 19.4, sf: 35.1, qf: 64.2, r16: 76.9, groups: 96.2 },
  'Portugal':        { win:  8.1, final: 16.5, sf: 31.2, qf: 60.1, r16: 72.1, groups: 94.5 },
  'Alemania':        { win:  6.3, final: 13.5, sf: 28.5, qf: 56.1, r16: 68.4, groups: 93.8 },
  'Países Bajos':    { win:  2.8, final:  7.0, sf: 19.1, qf: 41.7, r16: 61.2, groups: 90.5 },
  'Bélgica':         { win:  2.5, final:  6.3, sf: 18.2, qf: 40.6, r16: 62.5, groups: 91.2 },
  'Noruega':         { win:  1.4, final:  4.0, sf: 12.1, qf: 28.6, r16: 45.2, groups: 82.1 },
  'Estados Unidos':  { win:  1.2, final:  3.1, sf:  9.5, qf: 22.8, r16: 59.2, groups: 89.4 },
  'USA':             { win:  1.2, final:  3.1, sf:  9.5, qf: 22.8, r16: 59.2, groups: 89.4 },
  'Uruguay':         { win:  0.8, final:  2.6, sf: 10.4, qf: 21.6, r16: 58.1, groups: 88.4 },
  'Suiza':           { win:  0.8, final:  2.4, sf:  7.2, qf: 19.4, r16: 48.1, groups: 84.2 },
  'México':          { win:  0.2, final:  0.9, sf:  3.5, qf: 12.1, r16: 48.5, groups: 85.1 },
  'Colombia':        { win:  0.7, final:  2.1, sf:  6.5, qf: 18.2, r16: 46.4, groups: 83.5 },
  'Japón':           { win:  0.5, final:  1.8, sf:  5.8, qf: 16.5, r16: 44.1, groups: 81.2 },
  'Marruecos':       { win:  0.4, final:  1.5, sf:  5.2, qf: 15.1, r16: 43.5, groups: 80.8 },
  'Croacia':         { win:  0.3, final:  1.2, sf:  4.9, qf: 14.8, r16: 41.2, groups: 79.5 },
  'Ecuador':         { win:  0.1, final:  0.6, sf:  2.8, qf: 10.5, r16: 38.2, groups: 76.4 },
  'Canadá':          { win:  0.1, final:  0.5, sf:  2.1, qf:  9.2, r16: 40.1, groups: 78.2 },
  'Corea del Sur':   { win:  0.1, final:  0.4, sf:  1.9, qf:  8.1, r16: 35.4, groups: 74.1 },
  'Senegal':         { win: 0.05, final:  0.3, sf:  1.5, qf:  7.5, r16: 32.1, groups: 72.5 },
  'Austria':         { win: 0.05, final:  0.2, sf:  1.2, qf:  6.8, r16: 30.5, groups: 70.2 },
  'Suecia':          { win: 0.05, final:  0.2, sf:  1.0, qf:  6.1, r16: 28.9, groups: 68.4 },
  'Nigeria':         { win: 0.05, final:  0.1, sf:  0.8, qf:  5.5, r16: 25.4, groups: 65.1 },
  'Turquía':         { win: 0.05, final:  0.1, sf:  0.7, qf:  5.2, r16: 24.1, groups: 64.8 },
  'Paraguay':        { win: 0.05, final:  0.1, sf:  0.6, qf:  4.8, r16: 22.5, groups: 62.1 },
  'Costa de Marfil': { win: 0.05, final: 0.05, sf:  0.5, qf:  4.2, r16: 21.2, groups: 60.5 },
  'Egipto':          { win: 0.05, final: 0.05, sf:  0.4, qf:  3.8, r16: 19.5, groups: 58.2 },
  'Australia':       { win: 0.05, final: 0.05, sf:  0.3, qf:  3.1, r16: 18.2, groups: 55.4 },
  'Rep. Checa':      { win: 0.05, final: 0.05, sf:  0.2, qf:  2.5, r16: 16.4, groups: 52.1 },
  'Argelia':         { win: 0.05, final: 0.05, sf:  0.1, qf:  1.8, r16: 14.2, groups: 48.5 },
  'Escocia':         { win: 0.05, final: 0.05, sf: 0.05, qf:  1.5, r16: 12.5, groups: 45.2 },
  'Irán':            { win: 0.05, final: 0.05, sf: 0.05, qf:  1.2, r16: 11.1, groups: 42.1 },
  'Ghana':           { win: 0.05, final: 0.05, sf: 0.05, qf:  0.8, r16:  9.5, groups: 38.4 },
  'Irak':            { win: 0.05, final: 0.05, sf: 0.05, qf:  0.6, r16:  8.2, groups: 35.2 },
  'Arabia Saudita':  { win: 0.05, final: 0.05, sf: 0.05, qf:  0.5, r16:  7.4, groups: 32.1 },
  'Uzbekistán':      { win: 0.05, final: 0.05, sf: 0.05, qf:  0.4, r16:  6.1, groups: 28.5 },
  'Panamá':          { win: 0.05, final: 0.05, sf: 0.05, qf:  0.3, r16:  5.2, groups: 25.2 },
  'Jordania':        { win: 0.05, final: 0.05, sf: 0.05, qf:  0.2, r16:  4.8, groups: 22.1 },
  'RD Congo':        { win: 0.05, final: 0.05, sf: 0.05, qf:  0.1, r16:  3.5, groups: 19.5 },
  'Sudáfrica':       { win: 0.05, final: 0.05, sf: 0.05, qf:  0.1, r16:  3.1, groups: 18.2 },
  'Bosnia y Herz.':  { win: 0.05, final: 0.05, sf: 0.05, qf: 0.05, r16:  2.5, groups: 16.4 },
  'Haití':           { win: 0.05, final: 0.05, sf: 0.05, qf: 0.05, r16:  1.8, groups: 12.1 },
  'Curazao':         { win: 0.05, final: 0.05, sf: 0.05, qf: 0.05, r16:  1.5, groups: 10.5 },
  'Catar':           { win: 0.05, final: 0.05, sf: 0.05, qf: 0.05, r16:  1.2, groups:  9.2 },
  'Cabo Verde':      { win: 0.05, final: 0.05, sf: 0.05, qf: 0.05, r16:  1.1, groups:  8.1 },
  'Nueva Zelanda':   { win: 0.05, final: 0.05, sf: 0.05, qf: 0.05, r16:  0.8, groups:  5.4 },
}

// ── GRUPOS MUNDIAL 2026 (fallback si el API no carga) ────────────────────────
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
const BRACKET_ROUNDS = ['r32', 'r16', 'qf', 'sf', 'final']

const initScores = () =>
  Object.fromEntries(
    Object.keys(DEFAULT_GROUPS).map(l => [l, MATCH_PAIRS.map(() => ['', ''])])
  )

// ── LÓGICA ────────────────────────────────────────────────────────────────────

function computeStandings(teams, scores, pairs = MATCH_PAIRS) {
  const rows = teams.map(name => ({ name, pts: 0, gf: 0, gc: 0, pj: 0, w: 0, d: 0, l: 0 }))
  pairs.forEach(([i, j], mi) => {
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
  const prob = TEAM_PROBS[name]
  if (prob) return Math.sqrt(Math.max(prob.win, 0.05)) * 14 + (TEAMS[name]?.titles || 0) * 0.5
  const t = TEAMS[name]
  if (t) return Math.sqrt(Math.max(t.opta, 0.05)) * 14 + t.titles * 0.5
  return 2
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

// ── REGLAS OFICIALES FIFA · R32 (P73–P88) — Anexo C ─────────────────────────
// THIRDS_TABLE: 495 combinaciones oficiales FIFA (Wikipedia Template:2026_FIFA_World_Cup_third-place_table)
// Key: 8 grupos clasificados ordenados alfabéticamente, ej. "ABCDEFIL"
// Value: { P79: "3C", P85: "3E", P81: "3B", P74: "3D", P82: "3A", P77: "3F", P87: "3L", P80: "3I" }
//   "3X" = 3° del grupo X, código de slot = partido donde juega el 1° del grupo indicado
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

  // Clave del Anexo C: 8 grupos clasificados ordenados alfabéticamente
  const comboKey = best8.map(t => t.group).sort().join('')
  const annexRow = THIRDS_TABLE[comboKey]

  // Construir mapa slot → equipo usando la tabla oficial
  // Si por algún motivo la combinación no existe (no debería), fallback a '?'
  const thirdByGroup = {}
  best8.forEach(t => { thirdByGroup[t.group] = t.name })

  const resolveSlot = (slotCode) => {
    if (!annexRow) return '?'
    const code = annexRow[slotCode] // e.g. "3C" or "2X"
    if (!code) return '?'
    const grp = code.slice(1) // "C"
    return thirdByGroup[grp] ?? '?'
  }

  const F = g => f[g] ?? '?'
  const S = g => s[g] ?? '?'

  const RAW = [
    { label: 'P73', desc: '2A vs 2B',  teams: [S('A'), S('B')] },
    { label: 'P74', desc: '1E vs 3°',  teams: [F('E'), resolveSlot('P74')] },
    { label: 'P75', desc: '1F vs 2C',  teams: [F('F'), S('C')] },
    { label: 'P76', desc: '1C vs 2F',  teams: [F('C'), S('F')] },
    { label: 'P77', desc: '1I vs 3°',  teams: [F('I'), resolveSlot('P77')] },
    { label: 'P78', desc: '2E vs 2I',  teams: [S('E'), S('I')] },
    { label: 'P79', desc: '1A vs 3°',  teams: [F('A'), resolveSlot('P79')] },
    { label: 'P80', desc: '1L vs 3°',  teams: [F('L'), resolveSlot('P80')] },
    { label: 'P81', desc: '1D vs 3°',  teams: [F('D'), resolveSlot('P81')] },
    { label: 'P82', desc: '1G vs 3°',  teams: [F('G'), resolveSlot('P82')] },
    { label: 'P83', desc: '2K vs 2L',  teams: [S('K'), S('L')] },
    { label: 'P84', desc: '1H vs 2J',  teams: [F('H'), S('J')] },
    { label: 'P85', desc: '1B vs 3°',  teams: [F('B'), resolveSlot('P85')] },
    { label: 'P86', desc: '1J vs 2H',  teams: [F('J'), S('H')] },
    { label: 'P87', desc: '1K vs 3°',  teams: [F('K'), resolveSlot('P87')] },
    { label: 'P88', desc: '2D vs 2G',  teams: [S('D'), S('G')] },
  ]

  return {
    matches: RAW.map(m => m.teams),
    labels:  RAW.map(m => m.label),
    descs:   RAW.map(m => m.desc),
    thirds:  thirdsArr,
    best8,
    comboKey,
  }
}

// ── SUBCOMPONENTES ────────────────────────────────────────────────────────────

function createEmptyBracketScores(r32Matches) {
  return {
    r32:   r32Matches.map(() => ['', '']),
    r16:   Array(8).fill(null).map(() => ['', '']),
    qf:    Array(4).fill(null).map(() => ['', '']),
    sf:    Array(2).fill(null).map(() => ['', '']),
    final: ['', ''],
  }
}

function Flag({ name, size = 'sm' }) {
  const cls = size === 'lg' ? 'w-10 h-7' : size === 'md' ? 'w-7 h-5' : 'w-5 h-4'

  // 1) ISO alpha-2 del objeto TEAMS (equipos con nombre en español)
  let iso2 = TEAMS[name]?.code

  // 2) Fallback: metadatos del API (nombre en inglés u otro idioma)
  let flagUrl = null
  if (!iso2) {
    const meta = _teamMeta[name]
    if (meta) {
      iso2 = meta.iso2 || FIFA_TO_ISO2[meta.fifaCode?.toUpperCase()]
      if (!iso2) flagUrl = meta.flagUrl
    }
  }

  const src = iso2 ? `https://flagcdn.com/32x24/${iso2}.png` : flagUrl
  if (!src) return <span className="text-sm opacity-40">🏴</span>
  return (
    <img
      src={src}
      alt={name}
      className={`${cls} object-cover rounded-sm shadow-sm shrink-0`}
      onError={e => { e.currentTarget.style.display = 'none' }}
    />
  )
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
      className={`w-9 sm:w-10 h-8 sm:h-9 text-center bg-zinc-900 border rounded-lg font-display text-sm sm:text-base focus:outline-none focus:ring-1 disabled:opacity-30 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors
        ${isWin  ? 'border-mundial-gold/60 text-mundial-gold  focus:ring-mundial-gold  focus:border-mundial-gold'
        : isLose ? 'border-red-500/30    text-red-400/70    focus:ring-red-500      focus:border-red-500'
                 : 'border-white/15       text-white         focus:ring-mundial-gold  focus:border-mundial-gold'}`}
    />
  )
}

function GroupCard({ letter, teams, scores, pairOrder, onScoreChange }) {
  const pairs = pairOrder || MATCH_PAIRS
  const standings = useMemo(() => computeStandings(teams, scores, pairs), [teams, scores, pairs])
  const groupComplete = scores.every(([a, b]) => a !== '' && b !== '')

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/3">
        <span className="font-display text-lg text-white tracking-tight">Grupo <span className="text-mundial-gold">{letter}</span></span>
        {groupComplete
          ? <span className="text-[8px] font-black text-mundial-gold uppercase tracking-widest">✓ COMPLETO</span>
          : <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{scores.filter(([a,b]) => a!==''&&b!=='').length}/{scores.length}</span>
        }
      </div>

      {/* Standings */}
      <div className="border-b border-white/5">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[8px] text-zinc-600 uppercase tracking-widest bg-white/3">
              <th className="text-left px-2 py-1.5 w-5">#</th>
              <th className="text-left px-1 py-1.5">Equipo</th>
              <th className="text-center px-1 py-1.5 text-mundial-gold font-black">PTS</th>
              <th className="hidden sm:table-cell text-center px-1 py-1.5">PJ</th>
              <th className="hidden sm:table-cell text-center px-1 py-1.5">G</th>
              <th className="hidden sm:table-cell text-center px-1 py-1.5">E</th>
              <th className="hidden sm:table-cell text-center px-1 py-1.5">P</th>
              <th className="hidden sm:table-cell text-center px-1 py-1.5">GA</th>
              <th className="hidden sm:table-cell text-center px-1 py-1.5">GC</th>
              <th className="text-center px-1 py-1.5">DG</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.name} className={`border-t border-white/5 ${i < 2 ? 'bg-mundial-gold/[0.02]' : ''}`}>
                <td className="px-2 py-1.5 text-zinc-600 text-[10px]">{i + 1}</td>
                <td className="px-1 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <Flag name={row.name} />
                    <span className={`text-[10px] font-bold truncate max-w-[120px] sm:max-w-[100px] ${i < 2 ? 'text-white' : 'text-zinc-500'}`}>{row.name}</span>
                    {i < 2 && <span className="text-[7px] text-mundial-gold font-black">✓</span>}
                    {i === 2 && <span className="text-[7px] text-zinc-600 font-black">3°</span>}
                  </span>
                </td>
                <td className="text-center px-1 py-1.5 text-[10px] font-black text-white">{row.pts}</td>
                <td className="hidden sm:table-cell text-center px-1 py-1.5 text-zinc-500 text-[10px]">{row.pj}</td>
                <td className="hidden sm:table-cell text-center px-1 py-1.5 text-zinc-500 text-[10px]">{row.w}</td>
                <td className="hidden sm:table-cell text-center px-1 py-1.5 text-zinc-500 text-[10px]">{row.d}</td>
                <td className="hidden sm:table-cell text-center px-1 py-1.5 text-zinc-500 text-[10px]">{row.l}</td>
                <td className="hidden sm:table-cell text-center px-1 py-1.5 text-zinc-500 text-[10px]">{row.gf}</td>
                <td className="hidden sm:table-cell text-center px-1 py-1.5 text-zinc-500 text-[10px]">{row.gc}</td>
                <td className={`text-center px-1 py-1.5 text-[10px] font-bold ${(row.gf-row.gc)>0?'text-green-500':(row.gf-row.gc)<0?'text-red-400':'text-zinc-600'}`}>
                  {row.gf-row.gc>0?'+':''}{row.gf-row.gc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matches */}
      <div className="divide-y divide-white/5 flex-1">
        {pairs.map(([i, j], mi) => {
          const [hg, ag] = scores[mi]
          const hScore = parseInt(hg), aScore = parseInt(ag)
          const hasResult = !isNaN(hScore) && !isNaN(aScore)
          const winHome = hasResult && hScore > aScore
          const winAway = hasResult && aScore > hScore
          return (
            <div key={mi} className="grid items-center px-3 py-2" style={{ gridTemplateColumns: '1fr 90px 1fr' }}>
              <span className={`text-right text-[10px] font-bold flex items-center justify-end gap-1.5 min-w-0 ${winHome ? 'text-white' : 'text-zinc-500'}`}>
                <span className="truncate">{teams[i]}</span>
                <Flag name={teams[i]} size="md" />
              </span>
              <div className="flex items-center justify-center gap-1 shrink-0">
                <ScoreInput value={hg} onChange={v => onScoreChange(mi, 0, v)} isWin={winHome} isLose={winAway} />
                <span className="text-zinc-600 font-bold text-xs">–</span>
                <ScoreInput value={ag} onChange={v => onScoreChange(mi, 1, v)} isWin={winAway} isLose={winHome} />
              </div>
              <span className={`text-left text-[10px] font-bold flex items-center gap-1.5 min-w-0 ${winAway ? 'text-white' : 'text-zinc-500'}`}>
                <Flag name={teams[j]} size="md" />
                <span className="truncate">{teams[j]}</span>
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

// ── VISTA BRACKET GRÁFICO ────────────────────────────────────────────────────
const VB_H  = 512   // alto total del bracket
const VB_MW = 132   // ancho de cada tarjeta de partido
const VB_CW = 16    // ancho de los conectores SVG

function VBTeam({ name, score, win, penWin }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 h-6 ${win ? 'bg-mundial-gold/15' : ''}`}>
      {name
        ? <Flag name={name} size="sm" />
        : <span className="w-4 h-4 border border-white/10 rounded flex items-center justify-center shrink-0">
            <span className="text-[5px] text-zinc-700">?</span>
          </span>
      }
      <span className={`flex-1 text-[8px] font-bold truncate ${win ? 'text-mundial-gold' : name ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {name || 'Por definir'}
        {penWin && <span className="ml-1 text-[6px] text-orange-400 font-black"> ✦PEN</span>}
      </span>
      {score !== '' && (
        <span className={`shrink-0 text-[9px] font-display w-5 text-center rounded ${win ? 'bg-mundial-gold/25 text-mundial-gold' : 'bg-white/8 text-zinc-500'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

function VBCard({ tA, tB, sA, sB, pw }) {
  const a = parseInt(sA), b = parseInt(sB)
  const ok = !isNaN(a) && !isNaN(b) && tA && tB
  const draw = ok && a === b
  const wA = ok && (a > b || (draw && pw === tA))
  const wB = ok && (b > a || (draw && pw === tB))
  return (
    <div className={`border rounded overflow-hidden ${ok ? 'border-white/18' : 'border-white/8'} bg-zinc-950`} style={{ width: VB_MW }}>
      <VBTeam name={tA} score={sA} win={wA} penWin={draw && pw === tA} />
      <div className="h-px bg-white/8" />
      <VBTeam name={tB} score={sB} win={wB} penWin={draw && pw === tB} />
    </div>
  )
}

function InteractiveVBCard({ tA, tB, sA, sB, pw, matchCode, onPickWinner }) {
  const a = parseInt(sA), b = parseInt(sB)
  const ok = !isNaN(a) && !isNaN(b) && tA && tB
  const draw = ok && a === b
  const wA = ok && (a > b || (draw && pw === tA))
  const wB = ok && (b > a || (draw && pw === tB))
  const row = (name, selected) => (
    <button
      type="button"
      disabled={!name}
      onClick={() => name && onPickWinner?.(name)}
      className={`w-full flex items-center gap-1.5 pl-2 pr-9 h-6 text-left transition-all ${
        selected
          ? 'bg-mundial-gold text-mundial-navy'
          : name
            ? 'text-zinc-200 hover:bg-mundial-gold/12 cursor-pointer'
            : 'text-zinc-700 cursor-not-allowed'
      }`}
      title={name ? `Elegir a ${name}` : 'Por definir'}
    >
      {name
        ? <Flag name={name} size="sm" />
        : <span className="w-4 h-4 border border-white/10 rounded flex items-center justify-center shrink-0">
            <span className="text-[5px] text-zinc-700">?</span>
          </span>
      }
      <span className="flex-1 text-[8px] font-bold truncate">{name || 'Por definir'}</span>
      {selected && <span className="text-[7px] font-black uppercase tracking-widest">Avanza</span>}
    </button>
  )

  return (
    <div className={`relative border rounded overflow-hidden bg-zinc-950 ${ok ? 'border-mundial-gold/40 shadow-[0_0_18px_rgba(255,215,0,0.08)]' : tA && tB ? 'border-white/18' : 'border-white/8'}`} style={{ width: VB_MW }}>
      {matchCode && (
        <span className="absolute top-1 right-1 z-10 rounded bg-green-400/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest text-green-300/90">
          {matchCode}
        </span>
      )}
      {row(tA, wA)}
      <div className="h-px bg-white/8" />
      {row(tB, wB)}
    </div>
  )
}

function VBConnector({ fromCount, toCount, totalH, dir = 'ltr' }) {
  const fH = totalH / fromCount
  const tH = totalH / toCount
  const W = VB_CW, mid = W / 2
  const c = 'rgba(255,255,255,0.13)'
  return (
    <svg width={W} height={totalH} className="shrink-0">
      {Array(toCount).fill(null).map((_, ti) => {
        const y1 = (ti * 2 + 0.5) * fH
        const y2 = (ti * 2 + 1.5) * fH
        const ty = (ti + 0.5) * tH
        return dir === 'ltr'
          ? <g key={ti}>
              <line x1={0}   y1={y1} x2={mid} y2={y1} stroke={c} strokeWidth={1.5}/>
              <line x1={0}   y1={y2} x2={mid} y2={y2} stroke={c} strokeWidth={1.5}/>
              <line x1={mid} y1={y1} x2={mid} y2={y2} stroke={c} strokeWidth={1.5}/>
              <line x1={mid} y1={ty} x2={W}   y2={ty} stroke={c} strokeWidth={1.5}/>
            </g>
          : <g key={ti}>
              <line x1={W}   y1={y1} x2={mid} y2={y1} stroke={c} strokeWidth={1.5}/>
              <line x1={W}   y1={y2} x2={mid} y2={y2} stroke={c} strokeWidth={1.5}/>
              <line x1={mid} y1={y1} x2={mid} y2={y2} stroke={c} strokeWidth={1.5}/>
              <line x1={mid} y1={ty} x2={0}   y2={ty} stroke={c} strokeWidth={1.5}/>
            </g>
      })}
    </svg>
  )
}

function VBRoundCol({ data, count, totalH }) {
  const slotH = totalH / count
  return (
    <div className="relative shrink-0" style={{ height: totalH, width: VB_MW }}>
      {Array(count).fill(null).map((_, i) => (
        <div key={i} className="absolute flex items-center justify-center"
          style={{ top: i * slotH, height: slotH, width: VB_MW }}>
          {data[i]
            ? <InteractiveVBCard {...data[i]} />
            : <div className="border border-white/5 rounded opacity-20 bg-zinc-950" style={{ width: VB_MW }}>
                <div className="h-6 flex items-center px-2"><span className="text-[7px] text-zinc-700">TBD</span></div>
                <div className="h-px bg-white/5" />
                <div className="h-6 flex items-center px-2"><span className="text-[7px] text-zinc-700">TBD</span></div>
              </div>
          }
        </div>
      ))}
    </div>
  )
}

function VisualBracket({ bracketTeams, bracketScores, penaltyWinners, bracket, onPickWinner }) {
  if (!bracketTeams || !bracketScores || !bracket) return null
  const gm = (num) => `GM${num}`
  const r32Code = (i) => (bracket.r32labels?.[i] || gm(73 + i)).replace(/^P/, 'GM')
  const roundCode = (round, i) => {
    if (round === 'r32') return r32Code(i)
    if (round === 'r16') return gm(89 + i)
    if (round === 'qf') return gm(97 + i)
    if (round === 'sf') return gm(101 + i)
    return ''
  }
  const bm = (pairs, scores, round) =>
    (pairs || []).map(([tA, tB], i) => ({
      tA, tB,
      sA: scores?.[i]?.[0] ?? '',
      sB: scores?.[i]?.[1] ?? '',
      pw: penaltyWinners[`${round}-${i}`],
      matchCode: roundCode(round, i),
      onPickWinner: (winner) => onPickWinner?.(round, i, winner),
    }))
  const r32d = bm(bracketTeams.r32, bracketScores.r32, 'r32')
  const r16d = bm(bracketTeams.r16, bracketScores.r16, 'r16')
  const qfd  = bm(bracketTeams.qf,  bracketScores.qf,  'qf')
  const sfd  = bm(bracketTeams.sf,  bracketScores.sf,  'sf')
  const fin  = {
    tA: bracketTeams.finalTeams?.[0], tB: bracketTeams.finalTeams?.[1],
    sA: bracketScores.final?.[0] ?? '', sB: bracketScores.final?.[1] ?? '',
    pw: penaltyWinners['final-0'],
    matchCode: gm(104),
    onPickWinner: (winner) => onPickWinner?.('final', 0, winner),
  }
  const L32 = r32d.slice(0, 8); const R32 = [...r32d.slice(8)].reverse()
  const L16 = r16d.slice(0, 4); const R16 = [...r16d.slice(4)].reverse()
  const LQF = qfd.slice(0, 2);  const RQF = [...qfd.slice(2)].reverse()
  const LSF = sfd.slice(0, 1);  const RSF = sfd.slice(1)
  const H = VB_H, W = VB_MW, c = 'rgba(255,255,255,0.12)'
  const COLS = [
    { w: W, t: '16avos' }, { w: VB_CW, t: '' }, { w: W, t: '8avos' }, { w: VB_CW, t: '' },
    { w: W, t: '4tos' },   { w: VB_CW, t: '' }, { w: W, t: 'Semis' }, { w: 32, t: '' },
    { w: W, t: '🏆 FINAL' }, { w: 32, t: '' },
    { w: W, t: 'Semis' },  { w: VB_CW, t: '' }, { w: W, t: '4tos' }, { w: VB_CW, t: '' },
    { w: W, t: '8avos' },  { w: VB_CW, t: '' }, { w: W, t: '16avos' },
  ]
  return (
    <div className="overflow-x-auto pb-4 pt-1 -mx-2">
      <div className="flex items-center mb-2 px-2">
        {COLS.map(({ w, t }, i) => (
          <div
            key={i}
            className={`text-center shrink-0 text-[10px] font-black uppercase tracking-[0.22em] ${
              t ? (String(t).toLowerCase().includes('final') ? 'text-mundial-gold' : 'text-green-300') : ''
            }`}
            style={{ width: w }}
          >
            {String(t).toLowerCase().includes('final') ? 'Final' : t}
          </div>
        ))}
      </div>
      <div className="flex items-stretch">
        <VBRoundCol data={L32} count={8} totalH={H} />
        <VBConnector fromCount={8} toCount={4} totalH={H} dir="ltr" />
        <VBRoundCol data={L16} count={4} totalH={H} />
        <VBConnector fromCount={4} toCount={2} totalH={H} dir="ltr" />
        <VBRoundCol data={LQF} count={2} totalH={H} />
        <VBConnector fromCount={2} toCount={1} totalH={H} dir="ltr" />
        <VBRoundCol data={LSF} count={1} totalH={H} />
        <svg width={32} height={H} className="shrink-0">
          <line x1={0} y1={H/2} x2={32} y2={H/2} stroke={c} strokeWidth={1.5}/>
        </svg>
        {/* Centro */}
        <div className="flex flex-col items-center justify-center gap-3 shrink-0" style={{ height: H, width: W }}>
          <div className="w-full">
            <p className="text-[7px] font-black text-mundial-gold text-center mb-1.5 uppercase tracking-widest">🏆 Gran Final</p>
            <InteractiveVBCard {...fin} />
          </div>
          {(bracketTeams.sfLosers[0] || bracketTeams.sfLosers[1]) && (
            <div className="w-full">
              <p className="text-[7px] font-black text-zinc-600 text-center mb-1.5 uppercase tracking-widest">3° Puesto</p>
              <div className="relative border border-white/8 rounded overflow-hidden bg-zinc-950" style={{ width: W }}>
                <span className="absolute top-1 right-1 z-10 rounded bg-green-400/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest text-green-300/90">
                  GM103
                </span>
                <div className="flex items-center gap-1.5 h-6 pl-2 pr-9">
                  {bracketTeams.sfLosers[0] && <Flag name={bracketTeams.sfLosers[0]} size="sm" />}
                  <span className="text-[8px] text-zinc-400 font-bold truncate">{bracketTeams.sfLosers[0] || 'TBD'}</span>
                </div>
                <div className="h-px bg-white/8" />
                <div className="flex items-center gap-1.5 h-6 pl-2 pr-9">
                  {bracketTeams.sfLosers[1] && <Flag name={bracketTeams.sfLosers[1]} size="sm" />}
                  <span className="text-[8px] text-zinc-400 font-bold truncate">{bracketTeams.sfLosers[1] || 'TBD'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <svg width={32} height={H} className="shrink-0">
          <line x1={0} y1={H/2} x2={32} y2={H/2} stroke={c} strokeWidth={1.5}/>
        </svg>
        <VBRoundCol data={RSF} count={1} totalH={H} />
        <VBConnector fromCount={2} toCount={1} totalH={H} dir="rtl" />
        <VBRoundCol data={RQF} count={2} totalH={H} />
        <VBConnector fromCount={4} toCount={2} totalH={H} dir="rtl" />
        <VBRoundCol data={R16} count={4} totalH={H} />
        <VBConnector fromCount={8} toCount={4} totalH={H} dir="rtl" />
        <VBRoundCol data={R32} count={8} totalH={H} />
      </div>
    </div>
  )
}

const SAVE_KEY = 'mundial2026_sim_v3'

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const [groups, setGroups] = useState({ ...DEFAULT_GROUPS })
  const [scores, setScores]       = useState(initScores)
  const [phase, setPhase]         = useState('groups')
  const [bracket, setBracket]     = useState(null)
  const [bracketScores, setBracketScores] = useState(null)
  const [penaltyWinners, setPenaltyWinners] = useState({}) // {`round-idx` → winner name}
  const [bracketView, setBracketView] = useState('bracket')   // 'list' | 'bracket'
  const [groupsFromApi, setGroupsFromApi] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [groupPairOrders, setGroupPairOrders] = useState({}) // { A: [[i,j],...], ... } orden real de partidos
  const [savedAt, setSavedAt] = useState(null)              // timestamp último guardado

  // Cargar grupos reales del API (idénticos a la página de Partidos)
  const { data: groupMatches = [] } = useQuery({
    queryKey: ['matches-group-sim'],
    queryFn: () => matchApi.list({ phase: 'GROUP' }).then(r => r.data),
    staleTime: Infinity,
  })

  // Auto-cargar simulación guardada al montar
  useEffect(() => {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return
    try {
      const s = JSON.parse(raw)
      if (s.scores)        setScores(s.scores)
      if (s.phase)         setPhase(s.phase)
      if (s.bracket)       setBracket(s.bracket)
      if (s.bracketScores) setBracketScores(s.bracketScores)
      if (s.penaltyWinners)setPenaltyWinners(s.penaltyWinners)
      if (s.bracketView)   setBracketView(s.bracketView)
      if (s.savedAt)       setSavedAt(s.savedAt)
    } catch {}
  }, []) // solo en mount

  useEffect(() => {
    if (!groupMatches.length || groupsFromApi) return
    // Ordenar por fecha para que el orden de partidos coincida con PARTIDOS
    const sorted = [...groupMatches].sort((a, b) => new Date(a.dateUtc) - new Date(b.dateUtc))
    const apiGroups = {}
    const apiMatchOrder = {} // letter → [[homeIdx, awayIdx], ...]
    sorted.forEach(m => {
      const gl = m.groupLetter
      if (!gl) return
      if (!apiGroups[gl]) apiGroups[gl] = []
      const addTeam = (team) => {
        if (!team) return
        const tla = team.code?.toUpperCase()
        const espName = CODE_TO_ESP[tla] || team.name
        _teamMeta[espName] = {
          fifaCode: tla,
          iso2: FIFA_TO_ISO2[tla],
          flagUrl: team.flagUrl,
        }
        if (!apiGroups[gl].includes(espName)) apiGroups[gl].push(espName)
      }
      addTeam(m.teamHome)
      addTeam(m.teamAway)
    })
    const letters = Object.keys(apiGroups)
    if (letters.length < 2) return
    const cleanGroups = {}
    letters.sort().forEach(l => { cleanGroups[l] = apiGroups[l].slice(0, 4) })

    // Construir orden de partidos por grupo según la fecha del API
    letters.forEach(gl => {
      apiMatchOrder[gl] = []
      sorted
        .filter(m => m.groupLetter === gl)
        .forEach(m => {
          // Usar nombre en español (el mismo usado en cleanGroups) para el indexOf
          const homeEsp = CODE_TO_ESP[m.teamHome?.code?.toUpperCase()] || m.teamHome?.name
          const awayEsp = CODE_TO_ESP[m.teamAway?.code?.toUpperCase()] || m.teamAway?.name
          const hi = cleanGroups[gl].indexOf(homeEsp)
          const ai = cleanGroups[gl].indexOf(awayEsp)
          if (hi !== -1 && ai !== -1) apiMatchOrder[gl].push([hi, ai])
        })
      // Fallback si no hay datos suficientes
      if (apiMatchOrder[gl].length !== 6) apiMatchOrder[gl] = MATCH_PAIRS
    })
    setGroupPairOrders(apiMatchOrder)
    setGroups(cleanGroups)
    // Solo resetear scores si no hay simulación guardada
    if (!localStorage.getItem(SAVE_KEY)) {
      setScores(Object.fromEntries(Object.keys(cleanGroups).map(l => [l, MATCH_PAIRS.map(() => ['', ''])])))
    }
    setGroupsFromApi(true)
  }, [groupMatches, groupsFromApi])

  // Cambia un score de grupo
  const handleGroupScore = useCallback((letter, mi, side, val) => {
    setScores(prev => {
      const next = { ...prev, [letter]: prev[letter].map((s, i) => i === mi ? (side === 0 ? [val, s[1]] : [s[0], val]) : s) }
      return next
    })
  }, [])

  // Calcula clasificados de cada grupo (usando el orden de partidos del API)
  const standings = useMemo(() =>
    Object.fromEntries(
      Object.entries(groups).map(([l, teams]) => [
        l,
        computeStandings(teams, scores[l], groupPairOrders[l] || MATCH_PAIRS)
      ])
    ), [groups, scores, groupPairOrders])

  const buildBracket = useCallback(() => {
    const { matches, labels, descs, thirds } = buildR32(standings)
    setBracket({ r32: matches, r32labels: labels, r32descs: descs, thirds })
    setBracketScores(createEmptyBracketScores(matches))
    setPenaltyWinners({})
    setBracketView('bracket')
    setPhase('bracket')
  }, [standings])

  // Regenerar automáticamente el bracket cuando cambien los standings (si ya existe un bracket)
  useEffect(() => {
    if (!bracket) return

    const { matches, labels, descs, thirds } = buildR32(standings)
    const currentR32 = JSON.stringify(bracket.r32 || [])
    const nextR32 = JSON.stringify(matches)

    setBracket(prev => ({ ...prev, r32: matches, r32labels: labels, r32descs: descs, thirds }))

    if (currentR32 !== nextR32) {
      setBracketScores(createEmptyBracketScores(matches))
      setPenaltyWinners({})
    }
  }, [standings]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ganador de un partido (empate → usar penaltyWinner si existe)
  const resolve = (tA, tB, sA, sB, pw) => {
    const a = parseInt(sA), b = parseInt(sB)
    if (isNaN(a) || isNaN(b)) return null
    if (a > b) return tA
    if (b > a) return tB
    return pw || null   // empate → el que ganó penales (o null si no se ha definido)
  }

  // Equipos en cada ronda del bracket
  const bracketTeams = useMemo(() => {
    if (!bracket || !bracketScores) return null
    const pw = penaltyWinners
    const r32pairs = bracket.r32
    const r32w = r32pairs.map(([a, b], i) => resolve(a, b, bracketScores.r32[i][0], bracketScores.r32[i][1], pw[`r32-${i}`]))
    const r16pairs = Array.from({ length: 8 }, (_, i) => [r32w[i*2], r32w[i*2+1]])
    const r16w = r16pairs.map(([a, b], i) => resolve(a, b, bracketScores.r16[i][0], bracketScores.r16[i][1], pw[`r16-${i}`]))
    const qfPairs = Array.from({ length: 4 }, (_, i) => [r16w[i*2], r16w[i*2+1]])
    const qfW = qfPairs.map(([a, b], i) => resolve(a, b, bracketScores.qf[i][0], bracketScores.qf[i][1], pw[`qf-${i}`]))
    const sfPairs = [[qfW[0], qfW[1]], [qfW[2], qfW[3]]]
    const sfW = sfPairs.map(([a, b], i) => resolve(a, b, bracketScores.sf[i][0], bracketScores.sf[i][1], pw[`sf-${i}`]))
    const sfLosers = sfPairs.map(([a, b], i) => { const w = sfW[i]; return w ? (w === a ? b : a) : null })
    const champion = resolve(sfW[0], sfW[1], bracketScores.final[0], bracketScores.final[1], pw['final-0'])
    return { r32: r32pairs, r16: r16pairs, qf: qfPairs, sf: sfPairs, sfLosers, sfWinners: sfW, finalTeams: [sfW[0], sfW[1]], champion }
  }, [bracket, bracketScores, penaltyWinners])

  // Auto-simular penales cuando hay empate en eliminatoria
  useEffect(() => {
    if (!bracketScores || !bracketTeams) return
    const newPW = { ...penaltyWinners }
    let changed = false
    const check = (round, pairs, scores) => {
      if (!pairs || !scores) return
      pairs.forEach(([tA, tB], i) => {
        const [sA, sB] = scores[i] || []
        const a = parseInt(sA), b = parseInt(sB)
        const key = `${round}-${i}`
        if (!isNaN(a) && !isNaN(b) && a === b && tA && tB) {
          if (!newPW[key]) {
            const sa = getStrength(tA), sb = getStrength(tB)
            newPW[key] = Math.random() < sa / (sa + sb) ? tA : tB
            changed = true
          }
        } else if (newPW[key]) {
          delete newPW[key]; changed = true
        }
      })
    }
    check('r32', bracketTeams.r32, bracketScores.r32)
    check('r16', bracketTeams.r16, bracketScores.r16)
    check('qf',  bracketTeams.qf,  bracketScores.qf)
    check('sf',  bracketTeams.sf,  bracketScores.sf)
    const [fA, fB] = bracketTeams.finalTeams || []
    const fa = parseInt(bracketScores.final[0]), fb = parseInt(bracketScores.final[1])
    if (!isNaN(fa) && !isNaN(fb) && fa === fb && fA && fB) {
      if (!newPW['final-0']) {
        const sa = getStrength(fA), sb = getStrength(fB)
        newPW['final-0'] = Math.random() < sa / (sa + sb) ? fA : fB
        changed = true
      }
    } else if (newPW['final-0']) { delete newPW['final-0']; changed = true }
    if (changed) setPenaltyWinners(newPW)
  }, [bracketScores])

  // Simular todo el torneo (respetando el orden de partidos del API)
  const handleSimAll = useCallback(() => {
    const newScores = { ...scores }
    Object.entries(groups).forEach(([letter, teams]) => {
      const pairs = groupPairOrders[letter] || MATCH_PAIRS
      newScores[letter] = pairs.map(([i, j]) => simMatch(teams[i], teams[j]).map(String))
    })
    setScores(newScores)
  }, [groups, scores, groupPairOrders])

  // Simular ronda de bracket (guarda penales si empate)
  const simBracketRound = useCallback((round) => {
    if (!bracketTeams || !bracketScores) return
    const pairs = bracketTeams[round]
    if (!pairs) return
    const newScores = { ...bracketScores }
    const newPW = { ...penaltyWinners }
    newScores[round] = pairs.map(([a, b], i) => {
      if (!a || !b) return ['', '']
      const sa = getStrength(a), sb = getStrength(b)
      const pA = sa / (sa + sb)
      const r = Math.random()
      const gA = Math.round(Math.random() * 2 + (r < pA ? 1 : 0))
      const gB = Math.round(Math.random() * 2 + (r >= pA ? 1 : 0))
      const key = `${round}-${i}`
      if (gA === gB) { newPW[key] = Math.random() < pA ? a : b }
      else { delete newPW[key] }
      return [String(gA), String(gB)]
    })
    setBracketScores(newScores)
    setPenaltyWinners(newPW)
  }, [bracketTeams, bracketScores, penaltyWinners])

  // Seleccion manual del ganador en la vista de bracket
  const pickBracketWinner = useCallback((round, index, winner) => {
    if (!bracketTeams || !bracketScores || !winner) return
    const pairs = round === 'final' ? [bracketTeams.finalTeams] : bracketTeams[round]
    const pair = pairs?.[index]
    if (!pair?.[0] || !pair?.[1]) return

    setBracketScores(prev => {
      if (!prev) return prev
      const next = {
        ...prev,
        r32: prev.r32.map(s => [...s]),
        r16: prev.r16.map(s => [...s]),
        qf: prev.qf.map(s => [...s]),
        sf: prev.sf.map(s => [...s]),
        final: [...prev.final],
      }
      const score = winner === pair[0] ? ['1', '0'] : ['0', '1']
      if (round === 'final') next.final = score
      else next[round][index] = score

      const roundIdx = BRACKET_ROUNDS.indexOf(round)
      BRACKET_ROUNDS.slice(roundIdx + 1).forEach(r => {
        if (r === 'final') next.final = ['', '']
        else next[r] = next[r].map(() => ['', ''])
      })
      return next
    })

    setPenaltyWinners(prev => {
      const next = { ...prev }
      const roundIdx = BRACKET_ROUNDS.indexOf(round)
      BRACKET_ROUNDS.slice(roundIdx).forEach(r => {
        if (r === 'final') delete next['final-0']
        else Object.keys(next).forEach(k => { if (k.startsWith(`${r}-`)) delete next[k] })
      })
      return next
    })
  }, [bracketTeams, bracketScores])

  // Guardar simulación en localStorage
  const handleSave = useCallback(() => {
    const ts = new Date().toISOString()
    const state = { scores, phase, bracket, bracketScores, penaltyWinners, bracketView, savedAt: ts }
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    setSavedAt(ts)
    setJustSaved(true)
    window.setTimeout(() => setJustSaved(false), 2000)
  }, [scores, phase, bracket, bracketScores, penaltyWinners, bracketView])

  // Reset (borra guardado)
  const handleReset = () => {
    localStorage.removeItem(SAVE_KEY)
    setSavedAt(null)
    setJustSaved(false)
    setScores(Object.fromEntries(Object.keys(groups).map(l => [l, MATCH_PAIRS.map(() => ['', ''])])))
    setBracket(null)
    setBracketScores(null)
    setPenaltyWinners({})
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
          {savedAt ? (
            <p className="text-[10px] text-mundial-gold/70 mt-1 flex items-center gap-1">
              <CheckCircle2 size={10} /> Guardado · {new Date(savedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500 mt-1">Sin guardar — usa el botón para conservar tu simulación</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSimAll} className="btn-gold px-4 py-2.5 text-xs gap-2 justify-center">
            <Zap size={14} /> Simular Grupos
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest gap-2 justify-center inline-flex items-center border transition-all ${
              justSaved
                ? 'bg-green-400 text-mundial-navy border-green-400 shadow-lg shadow-green-400/20'
                : 'bg-transparent border-mundial-gold/30 text-mundial-gold hover:bg-mundial-gold/10'
            }`}
          >
            {justSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {justSaved ? 'Guardado' : 'Guardar'}
          </button>
          <button onClick={handleReset} className="btn-ghost px-4 py-2.5 text-xs gap-2 justify-center">
            <RotateCcw size={14} /> Reiniciar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-white/8 px-2">
        {[{ id: 'groups', label: 'Fase de Grupos' }, { id: 'bracket', label: 'Eliminatorias' }].map(({ id, label }) => (
          <button key={id} onClick={() => { if (id === 'bracket' && !bracket) buildBracket(); else setPhase(id) }}
            className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all border-b-2 ${phase === id ? 'text-mundial-gold border-mundial-gold' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
            {label}
          </button>
        ))}
        {phase === 'groups' && (
          <button onClick={buildBracket} className="ml-auto px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-mundial-gold hover:text-white transition-colors flex items-center gap-1.5">
            Ver Eliminatorias <ChevronRight size={12} />
          </button>
        )}
        {phase === 'bracket' && (
          <div className="ml-auto flex items-center gap-1 pb-1">
            {[{ id: 'list', label: '☰ Lista' }, { id: 'bracket', label: '⊞ Bracket' }].map(({ id, label }) => (
              <button key={id} onClick={() => setBracketView(id)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${bracketView === id ? 'bg-mundial-gold/20 text-mundial-gold border border-mundial-gold/40' : 'text-zinc-500 hover:text-zinc-300 border border-white/8'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── FASE DE GRUPOS ── */}
      {phase === 'groups' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(groups).map(([letter, teams]) => (
            <GroupCard
              key={letter}
              letter={letter}
              teams={teams}
              scores={scores[letter]}
              pairOrder={groupPairOrders[letter]}
              onScoreChange={(mi, side, val) => handleGroupScore(letter, mi, side, val)}
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
                  {champData?.code && (
                    <img
                      src={`https://flagcdn.com/64x48/${champData.code}.png`}
                      alt={champion}
                      className="w-24 h-16 object-cover rounded-lg shadow-lg shrink-0"
                    />
                  )}
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

          {/* ── Vista Bracket Gráfico ── */}
          {bracketView === 'bracket' && (
            <div className="relative left-1/2 w-[calc(100vw-1rem)] max-w-[1500px] -translate-x-1/2 rounded-2xl border border-green-400/15 bg-green-400/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <MousePointerClick size={14} className="text-green-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-300">
                    Clic en un equipo para hacerlo avanzar
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                  Solo simulacion
                </span>
              </div>
              <VisualBracket
                bracketTeams={bracketTeams}
                bracketScores={bracketScores}
                penaltyWinners={penaltyWinners}
                bracket={bracket}
                onPickWinner={pickBracketWinner}
              />
            </div>
          )}

          {/* ── Vista Lista ── */}
          {bracketView === 'list' && (['r32', 'r16', 'qf', 'sf']).map(round => {
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

          {bracketView === 'list' && (
            <>
              {/* FINAL */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-display text-2xl text-mundial-gold flex items-center gap-2"><Trophy size={20} /> GRAN FINAL</h3>
                  <button onClick={() => {
                    const [a, b] = bracketTeams.finalTeams
                    if (!a || !b) return
                    const res = simMatch(a, b)
                    const newPW = { ...penaltyWinners }
                    if (res[0] === res[1]) {
                      const sa = getStrength(a), sb = getStrength(b)
                      newPW['final-0'] = Math.random() < sa / (sa + sb) ? a : b
                    } else { delete newPW['final-0'] }
                    setPenaltyWinners(newPW)
                    setBracketScores(prev => ({ ...prev, final: res.map(String) }))
                  }} className="text-[9px] font-black text-mundial-gold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                    <Zap size={10} /> Simular final
                  </button>
                </div>
                <div className="max-w-sm mx-auto">
                  <BracketMatch
                    teamA={bracketTeams.finalTeams[0]} teamB={bracketTeams.finalTeams[1]}
                    scoreA={bracketScores.final[0]} scoreB={bracketScores.final[1]}
                    onScore={(side, val) => setBracketScores(prev => ({
                      ...prev, final: side === 0 ? [val, prev.final[1]] : [prev.final[0], val]
                    }))}
                  />
                  {penaltyWinners['final-0'] && (
                    <p className="text-center text-[9px] font-black text-orange-400 mt-2 uppercase tracking-widest">
                      ⚽ Penales: {penaltyWinners['final-0']} avanza a la final
                    </p>
                  )}
                </div>
              </div>
              {/* 3er puesto */}
              {bracketTeams.sfLosers.some(Boolean) && (
                <div>
                  <h3 className="font-display text-lg text-zinc-400 mb-3 px-1">3° Y 4° PUESTO</h3>
                  <div className="max-w-sm mx-auto">
                    <BracketMatch teamA={bracketTeams.sfLosers[0]} teamB={bracketTeams.sfLosers[1]} scoreA="" scoreB="" onScore={() => {}} />
                  </div>
                </div>
              )}
            </>
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
