import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupApi, leaderboardApi, paymentApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Star, Users, Copy, ChevronLeft, Crown, Sparkles,
  AlertCircle, ShieldCheck, Check, Trash2, Settings, BarChart3,
  Link2, Link2Off, X, Loader2, Save, Send, MessageSquare, Eye, EyeOff
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const MEDAL_COLORS = {
  1: 'from-mundial-gold to-yellow-600',
  2: 'from-zinc-300 to-zinc-500',
  3: 'from-orange-400 to-orange-700',
}

// ── Confirmation Modal ──────────────────────────────────────────────
function DeleteMemberModal({ member, groupName, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="w-full max-w-md bg-mundial-navyLight border border-white/10 rounded-[2rem] p-8 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-mundial-red/10 border border-mundial-red/20 flex items-center justify-center shrink-0">
            <Trash2 size={20} className="text-mundial-red" />
          </div>
          <h2 className="font-display text-2xl text-white uppercase tracking-tight">¿Eliminar participante?</h2>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Estás a punto de eliminar a{' '}
          <span className="text-white font-black">@{member.user?.username}</span>{' '}
          de la liga{' '}
          <span className="text-mundial-gold font-black">"{groupName}"</span>.{' '}
          Se borrarán permanentemente sus pronósticos y puntos acumulados en este grupo.{' '}
          <span className="text-mundial-red font-bold">Esta acción no se puede deshacer.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-6 rounded-2xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all font-black uppercase tracking-widest text-xs"
          >
            CANCELAR
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-6 rounded-2xl bg-mundial-red hover:bg-red-600 text-white transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-mundial-red/20"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            SÍ, ELIMINAR
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────
export default function GroupDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)
  const [preferenceId, setPreferenceId] = useState(null)
  const [memberToDelete, setMemberToDelete] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [editName, setEditName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [simMode, setSimMode] = useState(false) // "Ver como participante"
  const [msgText, setMsgText] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-99999999-9999-9999-9999-999999999999', { locale: 'es-CL' })
  }, [])

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupApi.get(id).then(r => r.data),
  })

  const { data: rawLeaderboard = [] } = useQuery({
    queryKey: ['group-leaderboard', id],
    queryFn: () => leaderboardApi.group(id).then(r => r.data),
  })

  // Excluir SUPER_ADMIN del ranking competitivo
  const leaderboard = rawLeaderboard.filter(e => e.user?.role !== 'SUPER_ADMIN')

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['group-messages', id],
    queryFn: () => groupApi.getMessages(id).then(r => r.data),
    refetchInterval: activeTab === 'messages' ? 10000 : false,
  })

  const isAdmin = group?.creatorId === user?.id
  // En modo simulación, el admin ve la app como un participante normal
  const actingAsAdmin = isAdmin && !simMode

  // Sincronizar activeTab con el parámetro ?tab= de la URL
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['members', 'ranking', 'messages', 'config'].includes(tabParam)) {
      setActiveTab(tabParam)
    } else if (group && activeTab === null) {
      setActiveTab(isAdmin ? 'members' : 'ranking')
      setEditName(group.name)
    }
  }, [searchParams, group, isAdmin, activeTab])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // ── Mutations ──
  const prefMutation = useMutation({
    mutationFn: (tierId) => paymentApi.createPreference(id, tierId).then(r => r.data),
    onSuccess: (data) => setPreferenceId(data.id),
    onError: () => toast.error('Error al conectar con Mercado Pago'),
  })

  const removeMut = useMutation({
    mutationFn: (userId) => groupApi.removeMember(id, userId),
    onSuccess: () => {
      toast.success('Miembro eliminado')
      setMemberToDelete(null)
      qc.invalidateQueries({ queryKey: ['group', id] })
      qc.invalidateQueries({ queryKey: ['group-leaderboard', id] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al eliminar miembro')
      setMemberToDelete(null)
    },
  })

  const sendMsgMut = useMutation({
    mutationFn: () => groupApi.sendMessage(id, msgText),
    onSuccess: () => {
      toast.success('Mensaje enviado a todos los miembros')
      setMsgText('')
      refetchMessages()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al enviar'),
  })

  const updateNameMut = useMutation({
    mutationFn: () => groupApi.update(id, { name: editName }),
    onSuccess: () => {
      toast.success('Nombre actualizado')
      setEditingName(false)
      qc.invalidateQueries({ queryKey: ['group', id] })
      qc.invalidateQueries({ queryKey: ['my-groups'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al actualizar'),
  })

  const toggleInviteMut = useMutation({
    mutationFn: () => groupApi.update(id, { inviteActive: !group.inviteActive }),
    onSuccess: () => {
      toast.success(group.inviteActive ? 'Link desactivado' : 'Link activado')
      qc.invalidateQueries({ queryKey: ['group', id] })
    },
    onError: () => toast.error('Error al cambiar estado del link'),
  })

  // ── Clipboard helpers ──
  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    toast.success('Código copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${group.inviteToken}`)
    setCopiedLink(true)
    toast.success('Link copiado')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 animate-pulse">
      <div className="h-48 rounded-[2.5rem] bg-white/5" />
      <div className="h-96 rounded-[2.5rem] bg-white/5" />
    </div>
  )

  if (!group) return (
    <div className="text-center py-20 px-4">
      <AlertCircle size={48} className="mx-auto text-zinc-700 mb-4" />
      <h2 className="text-white font-display text-2xl uppercase">Grupo no encontrado</h2>
      <Link to="/groups" className="text-mundial-gold text-xs font-black uppercase mt-4 block">Volver a mis grupos</Link>
    </div>
  )

  const isFree = !group.isPremium
  const memberCount = group._count?.members || group.members?.length || 0
  const isAtLimit = isFree && memberCount >= group.maxMembers
  const podium = leaderboard.filter(e => e.rank <= 3)
  const rest = leaderboard.filter(e => e.rank > 3)

  // Tabs según rol + modo simulación
  const adminTabs = [
    { id: 'members',  label: 'Miembros',  icon: Users },
    { id: 'ranking',  label: 'Ranking',   icon: BarChart3 },
    { id: 'messages', label: 'Mensajes',  icon: MessageSquare },
    { id: 'config',   label: 'Config',    icon: Settings },
  ]
  const playerTabs = [
    { id: 'ranking',  label: 'Ranking',   icon: BarChart3 },
    { id: 'members',  label: 'Miembros',  icon: Users },
    { id: 'messages', label: 'Mensajes',  icon: MessageSquare },
  ]
  const tabs = actingAsAdmin ? adminTabs : playerTabs

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      {/* Sim mode banner */}
      <AnimatePresence>
        {simMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-blue-400" />
              <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Modo Vista Participante — así ven la app tus usuarios</span>
            </div>
            <button onClick={() => { setSimMode(false); setActiveTab('members') }}
              className="text-[10px] font-black uppercase tracking-widest text-blue-300 hover:text-white border border-blue-500/30 px-3 py-1 rounded-xl transition-all hover:bg-blue-500/20">
              Salir del modo simulación
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {memberToDelete && (
          <DeleteMemberModal
            member={memberToDelete}
            groupName={group.name}
            onConfirm={() => removeMut.mutate(memberToDelete.userId)}
            onCancel={() => setMemberToDelete(null)}
            loading={removeMut.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Group slim header bar — ancho completo, pegado al header ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between gap-3 -mx-4 px-6 py-3 mb-6 bg-mundial-navy/80 backdrop-blur-xl border-b border-white/5"
      >
        {/* Left: back arrow + icon + info */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/groups" className="shrink-0 text-zinc-500 hover:text-mundial-gold transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${group.isPremium ? 'bg-mundial-gold text-mundial-navy' : 'bg-white/10 border border-white/10 text-white/30'}`}>
            {group.isPremium ? <Crown size={16} /> : <Users size={16} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg text-white uppercase tracking-tight truncate leading-none">{group.name}</h1>
              {group.isPremium && <span className="bg-mundial-gold text-mundial-navy text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">ELITE</span>}
              {isAdmin && <span className="bg-mundial-gold/10 text-mundial-gold text-[7px] font-black px-1.5 py-0.5 rounded border border-mundial-gold/20 uppercase shrink-0">Admin</span>}
              {isAdmin && (
                <button
                  onClick={() => { setSimMode(s => !s); setActiveTab(simMode ? 'members' : 'ranking') }}
                  className={`hidden sm:flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border transition-all shrink-0
                    ${simMode ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-blue-300 hover:border-blue-500/30'}`}
                >
                  {simMode ? <EyeOff size={8} /> : <Eye size={8} />}
                  {simMode ? 'Salir' : 'Ver como usuario'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                <ShieldCheck size={9} className="text-mundial-gold" /> {group.creator?.username}
              </span>
              <span className={`text-[9px] flex items-center gap-1 font-bold ${isAtLimit ? 'text-mundial-red' : 'text-zinc-500'}`}>
                <Users size={9} /> {memberCount} / {group.maxMembers}
              </span>
            </div>
          </div>
        </div>

        {/* Right: invite code + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:border-mundial-gold/30 transition-all">
            <div>
              <p className="text-[7px] text-zinc-600 font-black uppercase tracking-widest leading-none mb-0.5">CÓDIGO</p>
              <span className="font-mono text-sm text-mundial-gold font-bold tracking-widest leading-none">{group.inviteCode}</span>
            </div>
            <button onClick={copyCode} className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'hover:bg-mundial-gold hover:text-mundial-navy text-zinc-400'}`}>
              {copied ? <Sparkles size={12} /> : <Copy size={12} />}
            </button>
          </div>
          {/* Mobile: compact code */}
          <div className="flex sm:hidden items-center gap-1 bg-white/5 px-2 py-1.5 rounded-lg border border-white/10">
            <span className="font-mono text-xs text-mundial-gold font-bold">{group.inviteCode}</span>
            <button onClick={copyCode} className={`p-1 rounded transition-all ${copied ? 'text-green-400' : 'text-zinc-500'}`}>
              <Copy size={11} />
            </button>
          </div>
          {isAdmin && group.inviteToken && (
            <button onClick={copyLink} className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all
              ${copiedLink ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-mundial-gold hover:border-mundial-gold/30'}`}>
              {copiedLink ? <Check size={11} /> : <Link2 size={11} />}
              {copiedLink ? 'Copiado' : 'Link'}
            </button>
          )}
          {isAdmin && isFree && !showPricing && (
            <button onClick={() => setShowPricing(true)} className="btn-gold px-3 py-2 text-[9px] whitespace-nowrap">
              MEJORAR
            </button>
          )}
        </div>
      </motion.div>

      {/* Pricing panel (debajo del header, animado) */}
      <AnimatePresence>
        {isAdmin && showPricing && !preferenceId && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white uppercase tracking-tighter">Elige tu Plan</h3>
                <button onClick={() => { setShowPricing(false); setSelectedTier(null) }} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                  { id: 'tier1', title: 'CAPITÁN', groups: 1,   limit: 15,  price: '2.990' },
                  { id: 'tier2', title: 'DT',      groups: 3,   limit: 50,  price: '4.990' },
                  { id: 'tier3', title: 'ELITE',   groups: '∞', limit: 150, price: '9.990', recommended: true },
                ].map((tier) => (
                  <button key={tier.id} onClick={() => setSelectedTier(tier.id)}
                    className={`p-5 rounded-[1.5rem] border-2 transition-all text-left relative
                      ${selectedTier === tier.id ? 'bg-mundial-gold border-mundial-gold shadow-lg shadow-mundial-gold/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    {tier.recommended && selectedTier !== tier.id && (
                      <span className="absolute top-3 right-3 text-[8px] bg-mundial-gold/20 text-mundial-gold border border-mundial-gold/30 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">TOP</span>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${selectedTier === tier.id ? 'text-mundial-navy' : 'text-mundial-gold'}`}>{tier.title}</p>
                      {selectedTier === tier.id && <Check size={14} className="text-mundial-navy" />}
                    </div>
                    <p className={`text-xl font-display uppercase ${selectedTier === tier.id ? 'text-mundial-navy' : 'text-white'}`}>Hasta {tier.limit} Jugadores</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${selectedTier === tier.id ? 'text-mundial-navy/60' : 'text-zinc-600'}`}>{tier.groups} grupo{tier.groups !== 1 ? 's' : ''}</p>
                    <p className={`text-base font-bold mt-1 ${selectedTier === tier.id ? 'text-mundial-navy/70' : 'text-zinc-500'}`}>${tier.price} CLP</p>
                  </button>
                ))}
              </div>
              {selectedTier && (
                <button onClick={() => prefMutation.mutate(selectedTier)} disabled={prefMutation.isPending}
                  className="w-full btn-gold py-4 text-xs flex items-center justify-center gap-2">
                  {prefMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Cargando...</> : 'Pagar con Mercado Pago'}
                </button>
              )}
            </div>
          </motion.div>
        )}
        {preferenceId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4">Finaliza tu compra segura</p>
            <div id="wallet_container" className="w-full max-w-sm">
              <Wallet initialization={{ preferenceId }} customization={{ visual: { buttonBackground: 'default', borderRadius: '1.5rem' } }} />
            </div>
            <button onClick={() => setPreferenceId(null)} className="mt-4 text-[10px] text-zinc-500 hover:text-white uppercase font-bold">Cambiar Plan</button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Admin quick metrics ── */}
      {actingAsAdmin && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Miembros', value: memberCount, sub: `de ${group.maxMembers}`, color: 'text-white' },
            { label: 'Plan', value: group.activePlan === 'TIER3' ? 'ELITE' : group.activePlan === 'TIER2' ? 'DT' : group.activePlan === 'TIER1' ? 'CAPITÁN' : 'AMATEUR', sub: group.isPremium ? `$${group.activePlan === 'TIER3' ? '9.990' : group.activePlan === 'TIER2' ? '4.990' : '2.990'}/mes` : 'Gratis', color: group.isPremium ? 'text-mundial-gold' : 'text-zinc-400' },
            { label: 'Link', value: group.inviteActive ? 'ACTIVO' : 'CERRADO', sub: 'de invitación', color: group.inviteActive ? 'text-green-400' : 'text-mundial-red' },
          ].map(m => (
            <div key={m.label} className="card p-4 text-center bg-white/3 border-white/5">
              <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">{m.label}</p>
              <p className={`font-display text-lg leading-tight ${m.color}`}>{m.value}</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5 mb-6">
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} onClick={() => setActiveTab(tabId)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
              ${activeTab === tabId ? 'bg-mundial-gold text-mundial-navy shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── TAB: MEMBERS ── */}
        {activeTab === 'members' && (
          <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="card overflow-hidden bg-white/5 border border-white/5">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-display text-lg text-white uppercase">Participantes</h2>
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{memberCount} / {group.maxMembers}</span>
              </div>

              <div className="divide-y divide-white/5">
                {group.members?.filter(m => m.user?.role !== 'SUPER_ADMIN').map((member, idx) => {
                  const isCreator = member.userId === group.creatorId
                  const isMe = member.userId === user?.id
                  const lbEntry = leaderboard.find(e => e.userId === member.userId)

                  return (
                    <motion.div
                      key={member.userId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-center gap-4 px-6 py-4 ${isMe ? 'bg-mundial-gold/5' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border shrink-0
                        ${isCreator ? 'bg-mundial-gold text-mundial-navy border-mundial-gold' :
                          isMe ? 'bg-mundial-gold/20 text-mundial-gold border-mundial-gold/30' :
                          'bg-white/5 text-zinc-400 border-white/10'}`}>
                        {member.user?.username?.[0]?.toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold truncate ${isMe ? 'text-mundial-gold' : 'text-white'}`}>
                            {member.user?.username}
                          </span>
                          {isCreator && <span className="text-[8px] bg-mundial-gold/10 text-mundial-gold border border-mundial-gold/20 px-1.5 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1"><Crown size={8} /> Admin</span>}
                          {isMe && !isCreator && <span className="text-[8px] text-zinc-600 font-black uppercase">tú</span>}
                        </div>
                        <p className="text-[10px] text-zinc-600 font-mono">{lbEntry?.totalPoints ?? 0} pts</p>
                      </div>

                      {/* Points badge */}
                      <div className="text-right shrink-0">
                        <span className={`font-display text-lg tabular-nums ${isMe ? 'text-mundial-gold' : 'text-zinc-300'}`}>
                          {lbEntry?.totalPoints ?? 0}
                        </span>
                        <p className="text-[8px] text-zinc-700 uppercase tracking-widest">pts</p>
                      </div>

                      {/* Delete button (admin real mode only, not creator) */}
                      {actingAsAdmin && !isCreator && (
                        <button
                          onClick={() => setMemberToDelete(member)}
                          className="ml-2 w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-mundial-red hover:bg-mundial-red/10 border border-transparent hover:border-mundial-red/20 transition-all shrink-0"
                          title="Eliminar miembro"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </motion.div>
                  )
                })}

                {(!group.members || group.members.length === 0) && (
                  <div className="text-center py-12">
                    <Users size={40} className="mx-auto text-zinc-800 mb-3" />
                    <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Sin miembros</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: RANKING ── */}
        {activeTab === 'ranking' && (
          <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {podium.length > 0 && (
              <div className="flex items-end justify-center gap-2 sm:gap-6 py-8">
                {podium.find(e => e.rank === 2) && <PodiumCard entry={podium.find(e => e.rank === 2)} rank={2} isMe={podium.find(e => e.rank === 2).userId === user?.id} />}
                {podium.find(e => e.rank === 1) && <PodiumCard entry={podium.find(e => e.rank === 1)} rank={1} isMe={podium.find(e => e.rank === 1).userId === user?.id} />}
                {podium.find(e => e.rank === 3) && <PodiumCard entry={podium.find(e => e.rank === 3)} rank={3} isMe={podium.find(e => e.rank === 3).userId === user?.id} />}
              </div>
            )}

            <div className="card overflow-hidden bg-white/5 border border-white/5">
              <div className="hidden sm:grid grid-cols-[80px_1fr_100px_120px] px-8 py-4 bg-white/5 border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <span className="flex items-center gap-2"><Trophy size={12} /> POS</span>
                <span className="flex items-center gap-2"><Users size={12} /> JUGADOR</span>
                <span className="text-right">PARTIDOS</span>
                <span className="text-right flex items-center justify-end gap-2 text-mundial-gold"><Star size={12} fill="currentColor" /> PUNTOS</span>
              </div>
              <div className="divide-y divide-white/5">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-16">
                    <Users size={48} className="mx-auto text-zinc-800 mb-4 opacity-50" />
                    <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Sin competidores aún</p>
                  </div>
                ) : leaderboard.map((entry, idx) => {
                  const isMe = entry.userId === user?.id
                  return (
                    <motion.div key={entry.userId || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}>
                      <Link to={`/profile/${entry.userId}`}
                        className={`grid grid-cols-[60px_1fr_80px] sm:grid-cols-[80px_1fr_100px_120px] items-center px-6 sm:px-8 py-5 transition-all hover:bg-white/5 ${isMe ? 'bg-mundial-gold/5' : ''}`}
                      >
                        <span className="font-display text-xl text-zinc-500 tabular-nums">#{entry.rank}</span>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-inner border
                            ${isMe ? 'bg-mundial-gold text-mundial-navy border-mundial-gold' : 'bg-mundial-navyLight text-zinc-400 border-white/10'}`}>
                            {entry.user?.username?.[0]?.toUpperCase()}
                          </div>
                          <span className={`text-sm truncate ${isMe ? 'text-mundial-gold font-black' : 'text-zinc-200 font-bold'}`}>
                            {entry.user?.username}{isMe && ' (tú)'}
                          </span>
                        </div>
                        <span className="hidden sm:block text-right font-mono text-sm text-zinc-500">{entry.matchPoints || 0}</span>
                        <div className="text-right flex flex-col items-end">
                          <span className={`font-display text-xl tabular-nums ${isMe ? 'text-mundial-gold' : 'text-white'}`}>{entry.totalPoints || 0}</span>
                          <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest sm:hidden">Pts</span>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: MESSAGES ── */}
        {activeTab === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">

            {/* Compose area — solo admin real (no sim) */}
            {actingAsAdmin && (
              <div className="card p-5 bg-white/5 border border-mundial-gold/15">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={15} className="text-mundial-gold" />
                  <h3 className="font-display text-base text-white uppercase">Enviar anuncio a todos los miembros</h3>
                </div>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder="Ej: 🚨 ¡Quedan 30 minutos para el partido! No olviden registrar sus pronósticos."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none outline-none focus:border-mundial-gold/40 transition-colors"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-zinc-600">{msgText.length}/500</span>
                  <button
                    onClick={() => sendMsgMut.mutate()}
                    disabled={!msgText.trim() || sendMsgMut.isPending}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all
                      ${msgText.trim()
                        ? 'bg-mundial-gold text-mundial-navy hover:shadow-lg shadow-mundial-gold/20'
                        : 'bg-white/5 text-zinc-600 cursor-not-allowed'}`}
                  >
                    {sendMsgMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Enviar a todos
                  </button>
                </div>
              </div>
            )}

            {/* Messages list */}
            <div className="card overflow-hidden bg-white/5 border border-white/5">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-display text-base text-white uppercase">Historial de Anuncios</h3>
                <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{messages.length} mensajes</span>
              </div>

              {messages.length === 0 ? (
                <div className="text-center py-14">
                  <MessageSquare size={36} className="mx-auto text-zinc-800 mb-3" />
                  <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Sin anuncios aún</p>
                  {actingAsAdmin && <p className="text-zinc-700 text-[10px] mt-2">Usa el formulario de arriba para enviar el primer mensaje.</p>}
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="px-5 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-mundial-gold/15 border border-mundial-gold/20 flex items-center justify-center shrink-0">
                          <Crown size={13} className="text-mundial-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-mundial-gold uppercase tracking-widest">Admin · {msg.sentBy}</span>
                            <span className="text-[9px] text-zinc-700">
                              {msg.sentAt ? format(new Date(msg.sentAt), "d MMM 'a las' HH:mm", { locale: es }) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB: CONFIG (admin only) ── */}
        {activeTab === 'config' && actingAsAdmin && (
          <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">

            {/* Rename */}
            <div className="card p-6 bg-white/5 border border-white/5">
              <h3 className="font-display text-lg text-white uppercase mb-4">Nombre de la Liga</h3>
              <div className="flex gap-3">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onFocus={() => setEditingName(true)}
                  className="input flex-1 py-3"
                  placeholder="Nombre de tu liga"
                  maxLength={50}
                />
                <button
                  onClick={() => updateNameMut.mutate()}
                  disabled={!editName.trim() || editName === group.name || updateNameMut.isPending}
                  className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all
                    ${editName.trim() && editName !== group.name
                      ? 'bg-mundial-gold text-mundial-navy hover:shadow-lg shadow-mundial-gold/20'
                      : 'bg-white/5 text-zinc-600 cursor-not-allowed'}`}
                >
                  {updateNameMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
            </div>

            {/* Link de invitación toggle */}
            <div className="card p-6 bg-white/5 border border-white/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg text-white uppercase mb-1">Link de Invitación</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    {group.inviteActive ? 'Cualquiera con el link puede unirse' : 'El link está desactivado'}
                  </p>
                </div>
                <button
                  onClick={() => toggleInviteMut.mutate()}
                  disabled={toggleInviteMut.isPending}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest border transition-all
                    ${group.inviteActive
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                      : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:border-white/20'}`}
                >
                  {toggleInviteMut.isPending ? <Loader2 size={14} className="animate-spin" /> :
                    group.inviteActive ? <><Link2 size={14} /> Activo</> : <><Link2Off size={14} /> Cerrado</>}
                </button>
              </div>

              {group.inviteActive && group.inviteToken && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 bg-white/3 rounded-xl px-4 py-3">
                    <code className="text-[10px] text-zinc-400 font-mono flex-1 truncate">
                      {window.location.origin}/join/{group.inviteToken}
                    </code>
                    <button onClick={copyLink} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all
                      ${copiedLink ? 'bg-green-500/20 text-green-400' : 'bg-mundial-gold/10 text-mundial-gold hover:bg-mundial-gold/20'}`}>
                      {copiedLink ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Info del plan */}
            <div className="card p-6 bg-white/5 border border-white/5">
              <h3 className="font-display text-lg text-white uppercase mb-3">Plan Actual</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-display text-2xl ${group.isPremium ? 'text-mundial-gold' : 'text-zinc-400'}`}>
                    {group.activePlan === 'TIER3' ? 'ELITE' : group.activePlan === 'TIER2' ? 'DT' : group.activePlan === 'TIER1' ? 'CAPITÁN' : 'AMATEUR'}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
                    Hasta {group.maxMembers} miembros
                  </p>
                </div>
                {!group.isPremium && (
                  <button onClick={() => { setActiveTab('members'); setShowPricing(true) }}
                    className="btn-gold px-5 py-2.5 text-[10px]">
                    MEJORAR PLAN
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

function PodiumCard({ entry, rank, isMe }) {
  const size = rank === 1 ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-16 h-16 sm:w-20 sm:h-20'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.1 }}
      className={`flex flex-col items-center ${rank === 1 ? 'z-10 -mx-2' : 'z-0'}`}
    >
      <div className={`relative ${size} mb-4`}>
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${MEDAL_COLORS[rank]} shadow-2xl`} />
        <div className="absolute inset-1 rounded-[1.4rem] bg-mundial-navy flex items-center justify-center overflow-hidden">
          <span className={`font-display ${rank === 1 ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'} ${isMe ? 'text-mundial-gold' : 'text-zinc-700'}`}>
            {entry.user?.username?.[0]?.toUpperCase()}
          </span>
        </div>
        <div className={`absolute -bottom-2 -right-2 w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${MEDAL_COLORS[rank]} shadow-xl flex items-center justify-center border-2 border-mundial-navy text-mundial-navy font-black text-sm`}>
          {rank}
        </div>
      </div>
      <div className="text-center w-20 sm:w-28">
        <p className={`text-[10px] font-black uppercase tracking-tight truncate ${isMe ? 'text-mundial-gold' : 'text-white'}`}>{entry.user?.username}</p>
        <span className="font-display text-sm sm:text-lg text-white tabular-nums">{entry.totalPoints}</span>
      </div>
    </motion.div>
  )
}
