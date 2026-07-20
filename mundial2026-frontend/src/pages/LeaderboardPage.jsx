import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { leaderboardApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, TrendingUp, ChevronLeft, ChevronRight, Hash, User as UserIcon, Zap, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { celebrateChampionOnce } from '../lib/celebrate'

const MEDAL_COLORS = {
  1: 'from-mundial-gold to-yellow-600',
  2: 'from-zinc-300 to-zinc-500',
  3: 'from-orange-400 to-orange-700'
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const socketRef = useSocket()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [flash, setFlash] = useState(false)

  // Trend arrows: compare current rank vs. previous visit snapshot
  const [prevRanks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lb_prev_ranks') || '{}') }
    catch { return {} }
  })

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', page],
    queryFn: () => leaderboardApi.global({ page, limit: 25 }).then(r => r.data),
  })

  const { data: myRank } = useQuery({
    queryKey: ['my-rank'],
    queryFn: () => leaderboardApi.me().then(r => r.data).catch(() => null),
  })

  // Actualización en tiempo real
  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return
    socket.on('leaderboard:update', () => {
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['my-rank'] })
      setFlash(true)
      setTimeout(() => setFlash(false), 2000)
    })
    return () => socket.off('leaderboard:update')
  }, [socketRef, qc])

  const entries = data?.entries || []
  const total = data?.pagination?.total || 0
  const pages = data?.pagination?.pages || 1

  // Save current snapshot after 4 seconds (trend shows during session, updates for next visit)
  useEffect(() => {
    if (entries.length === 0) return
    const timer = setTimeout(() => {
      const snapshot = {}
      entries.forEach(e => { snapshot[e.userId] = e.rank })
      localStorage.setItem('lb_prev_ranks', JSON.stringify(snapshot))
    }, 4000)
    return () => clearTimeout(timer)
  }, [entries])

  const podium = entries.filter(e => e.rank <= 3)
  const rest = entries.filter(e => e.rank > 3)
  const champion = podium.find(e => e.rank === 1)

  // Torneo terminado: celebrar al campeón del ranking global con confeti (una vez por sesión)
  useEffect(() => {
    if (page === 1 && champion) celebrateChampionOnce('global')
  }, [page, champion?.userId])

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      {/* Header Section */}
      <div className="mb-10 flex items-end justify-between">
        <div className="flex flex-col">
          <h1 className="font-display text-4xl text-white tracking-tight uppercase">Ranking Global</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-mundial-gold rounded-full animate-pulse" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{total} Competidores en vivo</p>
          </div>
        </div>
        <AnimatePresence>
          {flash && (
            <motion.span 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5"
            >
              <Zap size={10} fill="currentColor" /> ¡TABLA ACTUALIZADA!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Podium Visual */}
      {!isLoading && page === 1 && (
        <div className="flex items-end justify-center gap-2 sm:gap-6 mb-12 sm:mb-16 pt-10">
          {/* 2nd Place */}
          {podium.find(e => e.rank === 2) && (
            <PodiumCard entry={podium.find(e => e.rank === 2)} rank={2} isMe={podium.find(e => e.rank === 2).userId === user?.id} />
          )}
          {/* 1st Place */}
          {podium.find(e => e.rank === 1) && (
            <PodiumCard entry={podium.find(e => e.rank === 1)} rank={1} isMe={podium.find(e => e.rank === 1).userId === user?.id} />
          )}
          {/* 3rd Place */}
          {podium.find(e => e.rank === 3) && (
            <PodiumCard entry={podium.find(e => e.rank === 3)} rank={3} isMe={podium.find(e => e.rank === 3).userId === user?.id} />
          )}
        </div>
      )}

      {/* User's Current Position (Sticky/Highlighted) */}
      <AnimatePresence>
        {myRank && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-[2rem] bg-mundial-gold text-mundial-navy shadow-2xl flex items-center justify-between group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 -mr-8 -mt-8">
              <Trophy size={100} fill="currentColor" />
            </div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-16 h-16 bg-mundial-navy/10 rounded-2xl flex items-center justify-center text-3xl font-display border border-mundial-navy/5">
                #{myRank.rank}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">TU POSICIÓN ACTUAL</p>
                <h3 className="font-display text-2xl uppercase leading-none mt-1">{user?.username}</h3>
              </div>
            </div>
            <div className="text-right flex flex-col items-end relative z-10">
              <div className="flex items-center gap-1.5 bg-mundial-navy/5 px-3 py-1.5 rounded-xl border border-mundial-navy/5 mb-1">
                 <Star size={16} fill="currentColor" />
                 <span className="font-display text-2xl tabular-nums leading-none">{myRank.totalPoints}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">PUNTOS TOTALES</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global List */}
      <div className="card overflow-hidden border border-white/5 bg-white/5 backdrop-blur-xl">
        <div className="hidden sm:grid grid-cols-[48px_80px_1fr_100px_100px_120px] items-center px-8 py-4 bg-white/5 border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
           <span><TrendingUp size={12} /></span>
           <span className="flex items-center gap-2"><Hash size={12} /> POS</span>
           <span className="flex items-center gap-2"><UserIcon size={12} /> COMPETIDOR</span>
           <span className="text-right">PARTIDOS</span>
           <span className="text-right">TORNEO</span>
           <span className="text-right flex items-center justify-end gap-2 text-mundial-gold"><Star size={12} fill="currentColor" /> TOTAL</span>
        </div>

        <div className="divide-y divide-white/5">
           {isLoading ? (
             <SkeletonList />
           ) : (
             rest.map((entry, idx) => {
               const isMe = entry.userId === user?.id
               return (
                 <motion.div
                   key={entry.userId}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.03 }}
                 >
                   <Link
                     to={`/profile/${entry.userId}`}
                     className={`grid grid-cols-[60px_1fr_80px] sm:grid-cols-[48px_80px_1fr_100px_100px_120px] items-center px-6 sm:px-8 py-6 transition-all group hover:bg-white/5
                       ${isMe ? 'bg-mundial-gold/5 border-l-4 border-l-mundial-gold' : ''}`}
                   >
                     {/* Trend */}
                     <span className="hidden sm:block"><TrendBadge current={entry.rank} prev={prevRanks[entry.userId]} /></span>
                     {/* Rank */}
                     <span className="font-display text-xl text-zinc-500 tabular-nums">#{entry.rank}</span>

                     {/* Profile */}
                     <div className="flex items-center gap-4 min-w-0">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border group-hover:border-mundial-gold/30 transition-all shadow-inner
                         ${isMe ? 'bg-mundial-gold text-mundial-navy border-mundial-gold' : 'bg-mundial-navyLight text-zinc-400 border-white/10'}`}>
                         {entry.user?.username?.[0]?.toUpperCase()}
                       </div>
                       <div className="flex flex-col truncate">
                         <span className={`text-sm tracking-tight truncate ${isMe ? 'font-black text-mundial-gold' : 'font-bold text-zinc-200'}`}>
                           {entry.user?.username}
                         </span>
                         <span className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter sm:hidden">
                           {entry.totalPoints} PTS
                         </span>
                       </div>
                     </div>

                     {/* Stats (Desktop) */}
                     <span className="hidden sm:block text-right font-mono text-sm text-zinc-500">{entry.matchPoints}</span>
                     <span className="hidden sm:block text-right font-mono text-sm text-zinc-500">{entry.tournamentPoints}</span>
                     
                     {/* Total (Desktop + Highlight) */}
                     <div className="text-right flex flex-col items-end">
                       <span className={`font-display text-xl ${isMe ? 'text-mundial-gold' : 'text-zinc-200'} tabular-nums`}>
                         {entry.totalPoints}
                       </span>
                       <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest sm:hidden">Puntos</span>
                     </div>
                   </Link>
                 </motion.div>
               )
             })
           )}
        </div>
      </div>

      {/* Pagination Container */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          <button 
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0) }} 
            disabled={page === 1}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-zinc-500 hover:text-white hover:border-white/30 disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 font-mono text-sm font-bold text-zinc-400">
             PÁGINA <span className="text-white">{page}</span> / <span className="text-zinc-600">{pages}</span>
          </div>

          <button 
            onClick={() => { setPage(p => Math.min(pages, p + 1)); window.scrollTo(0, 0) }} 
            disabled={page === pages}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-zinc-500 hover:text-white hover:border-white/30 disabled:opacity-20 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

function PodiumCard({ entry, rank, isMe }) {
  const height = rank === 1 ? 'h-52 sm:h-64' : rank === 2 ? 'h-44 sm:h-56' : 'h-36 sm:h-48'
  const size = rank === 1 ? 'w-28 h-28 sm:w-36 sm:h-36' : 'w-20 h-20 sm:w-28 sm:h-28'
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`relative flex flex-col items-center ${rank === 1 ? 'z-10 -mx-1 sm:-mx-4' : 'z-0'}`}
    >
      {/* Crown for #1 */}
      {rank === 1 && (
        <motion.div 
          animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 4 }}
          className="absolute -top-6 sm:-top-8 z-20 text-mundial-gold"
        >
          <Trophy size={40} fill="currentColor" />
        </motion.div>
      )}

      {/* Avatar Box */}
      <div className={`relative ${size} mb-4 flex items-center justify-center`}>
         <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${MEDAL_COLORS[rank]} shadow-2xl transition-all group-hover:scale-105`} />
         <div className="absolute inset-1 rounded-[1.8rem] bg-mundial-navy flex items-center justify-center overflow-hidden">
            {isMe ? (
              <span className="text-3xl sm:text-5xl font-display text-white">{entry.user?.username?.[0]?.toUpperCase()}</span>
            ) : (
              <span className="text-3xl sm:text-5xl font-display text-zinc-700">{entry.user?.username?.[0]?.toUpperCase()}</span>
            )}
            {/* Glossy Overlay */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
         </div>
         {/* Rank Badge */}
         <div className={`absolute -bottom-2 right-0 sm:right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${MEDAL_COLORS[rank]} flex items-center justify-center shadow-2xl border-2 border-mundial-navy text-mundial-navy font-black text-sm sm:text-base`}>
            {rank}
         </div>
      </div>

      {/* Info */}
      <div className="text-center w-24 sm:w-32">
        <h4 className={`text-xs sm:text-sm font-black uppercase tracking-tight truncate ${isMe ? 'text-mundial-gold' : 'text-white'}`}>
          {entry.user?.username}
        </h4>
        <div className="flex items-center justify-center gap-1 mt-0.5 sm:mt-1">
          <Star size={10} className="text-mundial-gold" fill="currentColor" />
          <span className="font-display text-sm sm:text-xl text-white tabular-nums">{entry.totalPoints}</span>
        </div>
        {rank === 1 && (
          <motion.span
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="mt-1.5 inline-block rounded-full bg-mundial-gold/15 border border-mundial-gold/30 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-mundial-gold"
          >
            🏆 Campeón
          </motion.span>
        )}
      </div>
    </motion.div>
  )
}

function TrendBadge({ current, prev }) {
  if (!prev || prev === current) {
    return <Minus size={12} className="text-zinc-700" />
  }
  if (current < prev) {
    return (
      <span className="flex items-center gap-0.5 text-green-400 text-[10px] font-black">
        <ArrowUp size={11} strokeWidth={3} />
        {prev - current}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-red-400 text-[10px] font-black">
      <ArrowDown size={11} strokeWidth={3} />
      {current - prev}
    </span>
  )
}

function SkeletonList() {
  return (
    <div className="divide-y divide-white/5 animate-pulse">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="h-20 bg-white/5" />
      ))}
    </div>
  )
}
