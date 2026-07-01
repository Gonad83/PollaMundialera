import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupApi, leaderboardApi, paymentApi, matchApi, tournamentApi, predictionApi, adminApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useHeaderActions } from '../context/HeaderActionsContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Star, Users, Copy, ChevronLeft, Crown, Sparkles,
  AlertCircle, ShieldCheck, Check, Trash2, Settings, BarChart3,
  Link2, Link2Off, X, Loader2, Save, Send, MessageSquare, Eye, EyeOff, Calendar, BookOpen, Share2, HelpCircle,
  UserCheck, Zap, Globe, CreditCard, ExternalLink, LayoutDashboard, Database
} from 'lucide-react'
import MatchesPage from './MatchesPage'
import TournamentPage from './TournamentPage'
import RulesPage from './RulesPage'
import SimulatorPage from './SimulatorPage'
import CompareView from './CompareView'
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import OnboardingTour from '../components/layout/OnboardingTour'

const MEDAL_COLORS = {
  1: 'from-mundial-gold to-yellow-600',
  2: 'from-zinc-300 to-zinc-500',
  3: 'from-orange-400 to-orange-700',
}

const formatCLP = (amount = 0) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)

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
  const { setActions } = useHeaderActions()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)
  const [preferenceId, setPreferenceId] = useState(null)
  const [memberToDelete, setMemberToDelete] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [editName, setEditName] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(8000)
  const [editingName, setEditingName] = useState(false)
  const [simMode, setSimMode] = useState(false) // "Ver como participante"
  const [startTour, setStartTour] = useState(false)
  const [msgText, setMsgText] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-99999999-9999-9999-9999-999999999999', { locale: 'es-CL' })
  }, [])

  // Prefetch teams + picks al montar el grupo (carga paralela antes de que el usuario clickee la tab)
  useEffect(() => {
    qc.prefetchQuery({
      queryKey: ['teams'],
      queryFn: () => matchApi.teams().then(r => r.data),
      staleTime: Infinity,
    })
    qc.prefetchQuery({
      queryKey: ['my-tournament-picks', id],
      queryFn: () => tournamentApi.myPicks({ groupId: id }).then(r => r.data),
      staleTime: 60_000,
    })
  }, [qc, id])

  const { data: group, isLoading, isError, error } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupApi.get(id).then(r => r.data),
    placeholderData: () => {
      try {
        const c = localStorage.getItem(`grp_${id}`)
        if (c) return JSON.parse(c)
      } catch {}
      const cachedGroups = [
        qc.getQueryData(['my-groups']),
        qc.getQueryData(['all-groups']),
        qc.getQueryData(['groups-admin-list']),
      ].flatMap(list => Array.isArray(list) ? list : [])
      return cachedGroups.find(g => String(g.id) === String(id))
    },
    staleTime: 30_000,
    retry: 1,
  })

  const isUnauthorized = error?.response?.status === 401
  const isForbidden = error?.response?.status === 403

  useEffect(() => {
    if (isUnauthorized) {
      navigate(`/login?redirect=/groups/${id}`)
    }
  }, [isUnauthorized, navigate, id])

  // Persistir el grupo en cache local para carga instantánea en siguiente visita
  useEffect(() => {
    if (group) {
      try { localStorage.setItem(`grp_${id}`, JSON.stringify(group)) } catch {}
    }
  }, [group, id])

  useEffect(() => {
    if (!group) return
    if (!editingName) setEditName(group.name || '')
    setPaymentLink(group.paymentLink || '')
    setPaymentEnabled(!!group.paymentButtonEnabled)
    setPaymentAmount(group.paymentAmount ?? 8000)
  }, [group?.id, group?.name, group?.paymentLink, group?.paymentButtonEnabled, group?.paymentAmount, editingName])

  const { data: rawLeaderboard = [] } = useQuery({
    queryKey: ['group-leaderboard', id],
    queryFn: () => leaderboardApi.group(id).then(r => r.data),
  })

  // Excluir SUPER_ADMIN del ranking competitivo
  const leaderboard = rawLeaderboard.filter(e => e.user?.role !== 'SUPER_ADMIN')

  const { data: myPredictions = [] } = useQuery({
    queryKey: ['my-predictions-group', id],
    queryFn: () => predictionApi.my({ groupId: id }).then(r => r.data),
    enabled: !!id,
  })

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['group-messages', id],
    queryFn: () => groupApi.getMessages(id).then(r => r.data),
    refetchInterval: activeTab === 'messages' ? 10000 : false,
  })

  const isAdmin = group?.creatorId === user?.id || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  // En modo simulación, el admin ve la app como un participante normal
  const actingAsAdmin = isAdmin && !simMode

  const { data: adminDashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.dashboard().then(r => r.data),
    enabled: activeTab === 'config' && isSuperAdmin,
  })

  useEffect(() => {
    sessionStorage.setItem('lastGroupId', id)
    sessionStorage.setItem('lastGroupCanManage', actingAsAdmin ? 'true' : 'false')
    localStorage.setItem('lastGroupId', id)
    localStorage.setItem('lastGroupCanManage', actingAsAdmin ? 'true' : 'false')
  }, [id, actingAsAdmin])

  // Sincronizar activeTab con ?tab= de la URL.
  // Sin activeTab en deps para evitar loop; cuando no hay tabParam siempre vuelve a resultados.
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['resultados', 'premios', 'fixture', 'ranking', 'comparar', 'liga', 'messages', 'config', 'reglas', 'simulador'].includes(tabParam)) {
      setActiveTab(tabParam)
    } else if (group) {
      setActiveTab('resultados')
      setEditName(n => n || group.name)
    }
  }, [searchParams, group]) // eslint-disable-line react-hooks/exhaustive-deps

  // Badge mensajes no leídos
  const lastReadKey = `msg_read_${id}`
  const lastRead = Number(localStorage.getItem(lastReadKey) || 0)
  const unreadCount = messages.filter(m => m.sentAt && new Date(m.sentAt).getTime() > lastRead).length

  // Marcar como leídos al abrir la tab
  useEffect(() => {
    if (activeTab === 'messages' && messages.length > 0) {
      localStorage.setItem(lastReadKey, Date.now().toString())
    }
  }, [activeTab, messages, lastReadKey])

  // Inyectar botones Mensajes + Ajustes en el header — sin cleanup aquí para evitar parpadeo
  useEffect(() => {
    // Esperar a que group cargue para saber si es admin y mostrar Ajustes correctamente
    if (!group) return
    const actions = [
      { id: 'compare', icon: Star, label: 'Comparativa', featured: true, onClick: () => setSearchParams({ tab: 'comparar' }), isActive: activeTab === 'comparar' },
      { id: 'ranking', icon: BarChart3, label: 'Ranking', onClick: () => setSearchParams({ tab: 'ranking' }), isActive: activeTab === 'ranking' },
      { id: 'messages', icon: MessageSquare, label: 'Mensajes', badge: unreadCount || null, onClick: () => setSearchParams({ tab: 'messages' }), isActive: activeTab === 'messages' },
      ...(actingAsAdmin && !isSuperAdmin ? [{ id: 'config', icon: Settings, label: 'Ajustes', onClick: () => setSearchParams({ tab: 'config' }), isActive: activeTab === 'config' }] : []),
    ]
    setActions(actions)
  }, [activeTab, actingAsAdmin, isSuperAdmin, setActions, setSearchParams, group, unreadCount])

  // Limpiar acciones del header solo al desmontar el grupo
  useEffect(() => () => setActions([]), [setActions])

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

  const updatePaymentMut = useMutation({
    mutationFn: () => groupApi.update(id, {
      paymentLink: paymentLink.trim(),
      paymentButtonEnabled: paymentEnabled,
      paymentAmount: Number(paymentAmount) || 0,
    }),
    onSuccess: () => {
      toast.success('Pago del grupo actualizado')
      qc.invalidateQueries({ queryKey: ['group', id] })
      qc.invalidateQueries({ queryKey: ['my-groups'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al guardar el link de pago'),
  })

  // ── Share helpers ──
  const shareGroup = async () => {
    const url = `${window.location.origin}/join/${group.inviteToken}`
    const text = `⚽ Únete a mi liga "${group.name}" en Quién Gana · Mundial 2026!\nCódigo: ${group.inviteCode}\n${url}`
    if (navigator.share) {
      await navigator.share({ title: 'Quién Gana · Mundial 2026', text }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  const shareMyRank = async (entry) => {
    const url = group.inviteToken ? `${window.location.origin}/join/${group.inviteToken}` : window.location.href
    const text = `🏆 Estoy #${entry.rank} en la liga "${group.name}" con ${entry.totalPoints} pts en Quién Gana · Mundial 2026!\n¿Te animas? ${url}`
    if (navigator.share) {
      await navigator.share({ title: 'Mi posición en Quién Gana', text }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

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

  const copyPaymentLink = () => {
    if (!group.paymentLink) return
    navigator.clipboard.writeText(group.paymentLink)
    setCopiedPaymentLink(true)
    toast.success('Link de pago copiado')
    setTimeout(() => setCopiedPaymentLink(false), 2000)
  }

  const commandStats = [
    { label: 'Usuarios', value: adminDashboard?.stats?.users ?? '-', icon: Users },
    { label: 'Predicciones', value: adminDashboard?.stats?.predictions ?? '-', icon: BarChart3 },
    { label: 'Ligas privadas', value: adminDashboard?.stats?.groups ?? '-', icon: Crown },
    {
      label: 'Partidos jugados',
      value: adminDashboard?.stats ? `${adminDashboard.stats.finishedMatches}/${adminDashboard.stats.matches}` : '-',
      icon: Trophy,
    },
  ]

  const commandLinks = [
    { tab: 'overview', label: 'Resumen', icon: LayoutDashboard },
    { tab: 'saas', label: 'Ligas', icon: Crown },
    { tab: 'users', label: 'Usuarios', icon: Users },
    { tab: 'matches', label: 'Partidos', icon: Trophy },
    { tab: 'broadcast', label: 'Anuncios', icon: Send },
    { tab: 'system', label: 'Sistema', icon: Database },
  ]

  const openCommandCenter = (tab = 'overview') => {
    navigate(`/admin?tab=${tab}`, { state: { from: `/groups/${id}` } })
  }

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 animate-pulse">
      <div className="h-48 rounded-[2.5rem] bg-white/5" />
      <div className="h-96 rounded-[2.5rem] bg-white/5" />
    </div>
  )

  if (isError || !group) return (
    <div className="text-center py-20 px-4">
      <AlertCircle size={48} className="mx-auto text-zinc-700 mb-4" />
      <h2 className="text-white font-display text-2xl uppercase">
        {isForbidden ? 'Acceso Privado' : isError ? 'Error de conexión' : 'Grupo no encontrado'}
      </h2>
      <p className="text-zinc-500 text-sm mt-2 mb-4">
        {isForbidden 
          ? 'No eres miembro de esta liga. Para ingresar, necesitas unirte a través del link de invitación o código.' 
          : isError ? 'El servidor no responde. Espera unos segundos y recarga la página.' : ''}
      </p>
      {isForbidden ? (
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link to="/groups" className="btn-gold py-3 text-xs">Ir a mis grupos</Link>
        </div>
      ) : isError ? (
        <button onClick={() => window.location.reload()} className="text-mundial-gold text-xs font-black uppercase mt-2 border border-mundial-gold/30 px-4 py-2 rounded-xl hover:bg-mundial-gold/10 transition-all">Reintentar</button>
      ) : (
        <Link to="/groups" className="text-mundial-gold text-xs font-black uppercase mt-4 block">Volver a mis grupos</Link>
      )}
    </div>
  )

  const isFree = !group.isPremium
  const memberCount = group._count?.members || group.members?.length || 0
  const isAtLimit = isFree && memberCount >= group.maxMembers
  const planLabel = group.activePlan === 'TIER2' ? 'DT' : group.activePlan === 'TIER1' ? 'CAPITÁN' : group.isPremium ? 'ELITE' : 'AMATEUR'
  const planPrice = !group.isPremium ? 'Gratis' : group.activePlan === 'TIER1' ? '$2.990/mes' : group.activePlan === 'TIER2' ? '$4.990/mes' : '$9.990/mes'
  const groupPaymentAmount = group.paymentAmount ?? 8000
  const podium = leaderboard.filter(e => e.rank <= 3)
  const rest = leaderboard.filter(e => e.rank > 3)

  // Tabs — MENSAJES, REGLAS y AJUSTES se mueven al header
  // shortLabel: versión corta para móvil (los 5 tabs deben caber sin scroll)
  // Comparativa va al centro y destacada: ahí los jugadores ven a los otros apostadores
  const tabs = [
    { id: 'resultados', label: 'Pronóstico partidos', shortLabel: 'Partidos', icon: Calendar },
    { id: 'premios',    label: 'Pronóstico torneo',   shortLabel: 'Torneo',   icon: Trophy },
    { id: 'fixture',    label: 'Fixture',             shortLabel: 'Fixture',  icon: Trophy, featured: true },
    { id: 'simulador',  label: 'Simular',             shortLabel: 'Simular',  icon: BarChart3 },
    { id: 'liga',       label: 'Participantes',       shortLabel: 'Liga',     icon: Users },
  ]

  // La barra de tabs queda SIEMPRE fija arriba (debajo del header), en todas las pestañas.
  const tabsPill = (
    <div className="grid grid-cols-[1fr_1fr_1.35fr_1fr_1fr] sm:flex items-stretch p-1 gap-0.5 sm:gap-1 rounded-2xl bg-white/5 border border-white/5">
      {tabs.map(({ id: tabId, label, shortLabel, icon: Icon, featured }) => {
        const active = activeTab === tabId
        return (
          <button key={tabId} id={`tour-tab-${tabId}`} onClick={() => setSearchParams({ tab: tabId })}
            className={`relative rounded-xl py-2 sm:py-2.5 px-1 sm:px-4 text-[8px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2
              ${featured ? 'sm:flex-[1.6]' : 'sm:flex-1'}
              ${active
                ? `bg-mundial-gold text-mundial-navy shadow-lg${featured ? ' shadow-mundial-gold/40 ring-2 ring-mundial-gold/60' : ''}`
                : featured
                  ? 'bg-mundial-gold/[0.12] text-mundial-gold ring-1 ring-mundial-gold/40 shadow-[0_0_18px_rgba(255,215,0,0.12)] hover:bg-mundial-gold/20'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <Icon size={featured ? 17 : 15} className="sm:hidden" fill={featured ? 'currentColor' : 'none'} />
            <Icon size={featured ? 15 : 13} className="hidden sm:block" fill={featured ? 'currentColor' : 'none'} />
            <span className="sm:hidden leading-none">{shortLabel}</span>
            <span className="hidden sm:inline text-center leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )

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
            <button onClick={() => { setSimMode(false); setActiveTab('ranking') }}
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
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 -mx-4 px-4 sm:px-6 py-3 mb-6 bg-mundial-navy/80 backdrop-blur-xl border-b border-white/5"
      >
        {/* Left: back arrow + icon + info */}
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <Link to="/groups" className="shrink-0 text-zinc-500 hover:text-mundial-gold transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className={`w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${group.isPremium ? 'bg-mundial-gold text-mundial-navy' : 'bg-white/10 border border-white/10 text-white/30'}`}>
            {group.isPremium ? <Crown size={16} /> : <Users size={16} />}
          </div>
          <div className="min-w-0 flex-1 sm:flex-none">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-base sm:text-lg text-white uppercase tracking-tight truncate leading-none max-w-[170px] sm:max-w-[220px]">{group.name}</h1>
              {group.isPremium && <span className="bg-mundial-gold text-mundial-navy text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">ELITE</span>}
              {isAdmin && <span className="bg-mundial-gold/10 text-mundial-gold text-[7px] font-black px-1.5 py-0.5 rounded border border-mundial-gold/20 uppercase shrink-0">Admin</span>}
              {isAdmin && (
                <button
                  onClick={() => { setSimMode(s => !s); setActiveTab('ranking') }}
                  className={`hidden sm:flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border transition-all shrink-0
                    ${simMode ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-blue-300 hover:border-blue-500/30'}`}
                >
                  {simMode ? <EyeOff size={8} /> : <Eye size={8} />}
                  {simMode ? 'Salir' : 'Ver como usuario'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 sm:mt-0.5">
              <span className="text-[10px] sm:text-[9px] text-zinc-500 flex items-center gap-1">
                <ShieldCheck size={9} className="text-mundial-gold" /> {group.creator?.username}
              </span>
              <span className={`text-[10px] sm:text-[9px] flex items-center gap-1 font-bold ${isAtLimit ? 'text-mundial-red' : 'text-zinc-500'}`}>
                <Users size={9} /> {memberCount} / {group.maxMembers}
              </span>
            </div>
          </div>
        </div>

        {/* Right: invite code + header actions */}
        <div className="w-full sm:w-auto flex items-center gap-2 shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar pb-0.5 sm:pb-0">
          <div id="tour-invite-code" className="flex items-center gap-2 shrink-0">
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
            <div className="flex sm:hidden items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 min-w-[166px]">
              <div className="min-w-0 flex-1">
                <p className="text-[7px] text-zinc-600 font-black uppercase tracking-widest leading-none mb-0.5">CODIGO</p>
                <span className="block font-mono text-sm text-mundial-gold font-bold tracking-widest truncate">{group.inviteCode}</span>
              </div>
              <button onClick={copyCode} className={`p-1.5 rounded-lg transition-all shrink-0 ${copied ? 'bg-green-500/20 text-green-400' : 'hover:bg-mundial-gold hover:text-mundial-navy text-zinc-500'}`}>
                <Copy size={12} />
              </button>
            </div>
          </div>
          {isAdmin && group.inviteToken && (
            <button onClick={copyLink} className={`h-11 sm:h-auto min-w-11 sm:min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all shrink-0
              ${copiedLink ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-mundial-gold hover:border-mundial-gold/30'}`}>
              {copiedLink ? <Check size={11} /> : <Link2 size={11} />}
              <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Link'}</span>
            </button>
          )}

          {group.inviteToken && (
            <button
              onClick={shareGroup}
              className="h-11 sm:h-auto min-w-11 sm:min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-mundial-gold hover:border-mundial-gold/30 transition-all text-[9px] font-black uppercase tracking-widest shrink-0"
              title="Compartir invitación"
            >
              <Share2 size={12} />
              <span className="hidden sm:inline">Compartir</span>
            </button>
          )}
          <button
            onClick={() => setStartTour(true)}
            className="h-11 sm:h-auto min-w-11 sm:min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-mundial-gold hover:border-mundial-gold/30 transition-all text-[9px] font-black uppercase tracking-widest shrink-0"
            title="Ver tutorial de la liga"
          >
            <HelpCircle size={12} />
            <span className="hidden sm:inline">Guía</span>
          </button>
          {isAdmin && isFree && !showPricing && (
            <button onClick={() => setShowPricing(true)} className="btn-gold h-11 sm:h-auto px-3 py-2 text-[9px] whitespace-nowrap shrink-0">
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


      {/* ── Group metrics — visibles para todos los miembros ── */}

      {/* ── Tabs ── */}
      {group.paymentButtonEnabled && group.paymentLink && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-green-400/20 bg-green-400/10 p-4 sm:p-5 shadow-[0_18px_50px_rgba(34,197,94,0.08)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-green-400/15 border border-green-400/25 flex items-center justify-center shrink-0">
                <CreditCard size={20} className="text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-green-300 font-black uppercase tracking-[0.25em]">Cuota del grupo</p>
                <h3 className="font-display text-2xl text-white uppercase leading-none mt-1">{formatCLP(groupPaymentAmount)}</h3>
                <p className="text-xs text-green-100/60 font-bold mt-1">Paga o transfiere tu cuota usando el link configurado por el admin.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyPaymentLink}
                className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  copiedPaymentLink
                    ? 'bg-green-400/20 border-green-400/30 text-green-300'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:text-green-300 hover:border-green-400/30'
                }`}
              >
                {copiedPaymentLink ? 'Copiado' : 'Copiar'}
              </button>
              <a
                href={group.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-green-400 text-mundial-navy text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 transition-all"
              >
                Pagar <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs — siempre fijos arriba (debajo del header sticky) en todas las pestañas */}
      <div className="fixed top-16 md:top-20 left-0 right-0 z-40 bg-mundial-navy/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {tabsPill}
        </div>
      </div>
      {/* Espaciador para compensar el alto del tab bar fixed (~64px móvil / ~56px desktop) */}
      <div className="h-16 md:h-14 mb-2" />

      <AnimatePresence mode="wait">

        {/* ── TAB: RESULTADOS ── */}
        {activeTab === 'resultados' && (
          <motion.div key="resultados" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <MatchesPage groupId={id} initialViewMode="apostado" hideViewModeSwitcher />
          </motion.div>
        )}

        {/* ── TAB: FIXTURE ── */}
        {activeTab === 'fixture' && (
          <motion.div key="fixture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <MatchesPage groupId={id} initialViewMode="fixture" hideViewModeSwitcher />
          </motion.div>
        )}

        {/* ── TAB: SIMULADOR (Sub-tab of Resultados) ── */}
        {activeTab === 'simulador' && (
          <motion.div key="simulador" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="mb-6 flex">
               <button onClick={() => setActiveTab('resultados')} className="text-zinc-400 hover:text-white flex items-center gap-2 text-xs font-black uppercase">
                 <ChevronLeft size={16} /> Volver a Pronósticos
               </button>
            </div>
            <SimulatorPage groupId={id} />
          </motion.div>
        )}

        {/* ── TAB: PREMIOS ── */}
        {activeTab === 'premios' && (
          <motion.div key="premios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <TournamentPage groupId={id} members={group.members || []} />
          </motion.div>
        )}

        {/* ── TAB: REGLAS ── */}
        {activeTab === 'reglas' && (
          <motion.div key="reglas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <RulesPage />
          </motion.div>
        )}

        {/* ── TAB: COMPARATIVA ── */}
        {activeTab === 'comparar' && (
          <motion.div key="comparar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <CompareView groupId={id} members={group.members || []} />
          </motion.div>
        )}

        {/* ── TAB: LIGA (Members) ── */}
        {activeTab === 'liga' && (
          <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">

            {/* Stats del grupo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Participantes */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}
                className="relative overflow-hidden rounded-2xl p-4 text-center border border-white/10 bg-gradient-to-br from-white/8 to-white/3">
                <div className="absolute top-0 right-0 w-14 h-14 rounded-full bg-blue-500/10 blur-xl -mr-3 -mt-3 pointer-events-none" />
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                    <UserCheck size={14} className="text-blue-400" />
                  </div>
                </div>
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">Miembros</p>
                <p className="font-display text-2xl text-white leading-none">{memberCount}</p>
                <p className="text-[9px] text-zinc-500 mt-1 font-bold">de {group.maxMembers}</p>
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-400/60 transition-all" style={{ width: `${Math.min(100, (memberCount / group.maxMembers) * 100)}%` }} />
                </div>
              </motion.div>

              {/* Monto Total */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="relative overflow-hidden rounded-2xl p-4 text-center border border-green-400/20 bg-gradient-to-br from-green-400/8 to-white/3"
                style={{ boxShadow: '0 4px 24px rgba(52,211,153,0.08)' }}>
                <div className="absolute top-0 right-0 w-14 h-14 rounded-full bg-green-400/10 blur-xl -mr-3 -mt-3 pointer-events-none" />
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-xl bg-green-400/15 border border-green-400/25 flex items-center justify-center">
                    <CreditCard size={14} className="text-green-400" />
                  </div>
                </div>
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">Bote total</p>
                <p className="font-display text-xl text-green-300 leading-none">{formatCLP(groupPaymentAmount * memberCount)}</p>
                <p className="text-[9px] text-zinc-500 mt-1 font-bold">{formatCLP(groupPaymentAmount)} × {memberCount}</p>
              </motion.div>

              {/* Plan */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-2xl p-4 text-center border bg-gradient-to-br from-white/8 to-white/3"
                style={{
                  borderColor: group.isPremium ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)',
                  boxShadow: group.isPremium ? '0 4px 24px rgba(255,215,0,0.1)' : '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                <div className="absolute top-0 right-0 w-14 h-14 rounded-full blur-xl -mr-3 -mt-3 pointer-events-none"
                  style={{ background: group.isPremium ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.05)' }} />
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border"
                    style={{ background: group.isPremium ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)', borderColor: group.isPremium ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)' }}>
                    <Zap size={14} style={{ color: group.isPremium ? '#FFD700' : '#71717a' }} />
                  </div>
                </div>
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">Plan</p>
                <p className="font-display text-2xl leading-none" style={{ color: group.isPremium ? '#FFD700' : '#a1a1aa' }}>{planLabel}</p>
                <p className="text-[9px] text-zinc-500 mt-1 font-bold">{planPrice}</p>
              </motion.div>

              {/* Link de invitación */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="relative overflow-hidden rounded-2xl p-4 text-center border bg-gradient-to-br from-white/8 to-white/3"
                style={{
                  borderColor: group.inviteActive ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)',
                  boxShadow: group.inviteActive ? '0 4px 24px rgba(52,211,153,0.08)' : '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                <div className="absolute top-0 right-0 w-14 h-14 rounded-full blur-xl -mr-3 -mt-3 pointer-events-none"
                  style={{ background: group.inviteActive ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)' }} />
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border"
                    style={{ background: group.inviteActive ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', borderColor: group.inviteActive ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)' }}>
                    <Globe size={14} className={group.inviteActive ? 'text-green-400' : 'text-zinc-600'} />
                  </div>
                </div>
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-1">Link</p>
                <p className={`font-display text-2xl leading-none ${group.inviteActive ? 'text-green-400' : 'text-mundial-red'}`}>
                  {group.inviteActive ? 'ACTIVO' : 'CERRADO'}
                </p>
                <p className="text-[9px] text-zinc-500 mt-1 font-bold">de invitación</p>
              </motion.div>
            </div>

            {/* Lista de participantes */}
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

            {/* Estadísticas del grupo */}
            {leaderboard.length > 1 && (() => {
              const leader    = leaderboard[0]
              const avgPts    = Math.round(leaderboard.reduce((s, e) => s + (e.totalPoints || 0), 0) / leaderboard.length)
              const topMatch  = leaderboard.reduce((a, b) => (b.matchPoints || 0) > (a.matchPoints || 0) ? b : a, leaderboard[0])
              return (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Líder',     value: leader.user?.username,          sub: `${leader.totalPoints} pts`,      color: 'text-mundial-gold' },
                    { label: 'Promedio',  value: `${avgPts} pts`,                sub: `${leaderboard.length} jugadores`, color: 'text-white' },
                    { label: 'Partidos',  value: topMatch.user?.username,        sub: `${topMatch.matchPoints || 0} pts partido`, color: 'text-blue-400' },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} className="card p-3 text-center bg-white/3 border border-white/5">
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
                      <p className={`font-display text-sm leading-tight truncate ${color}`}>{value}</p>
                      <p className="text-[8px] text-zinc-600 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              )
            })()}

            {podium.length > 0 && (
              <div className="flex items-end justify-center gap-2 sm:gap-6 py-8">
                {podium.find(e => e.rank === 2) && <PodiumCard entry={podium.find(e => e.rank === 2)} rank={2} isMe={podium.find(e => e.rank === 2).userId === user?.id} />}
                {podium.find(e => e.rank === 1) && <PodiumCard entry={podium.find(e => e.rank === 1)} rank={1} isMe={podium.find(e => e.rank === 1).userId === user?.id} />}
                {podium.find(e => e.rank === 3) && <PodiumCard entry={podium.find(e => e.rank === 3)} rank={3} isMe={podium.find(e => e.rank === 3).userId === user?.id} />}
              </div>
            )}

            {leaderboard.find(e => e.userId === user?.id) && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => shareMyRank(leaderboard.find(e => e.userId === user?.id))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-mundial-gold hover:border-mundial-gold/30 transition-all text-[9px] font-black uppercase tracking-widest"
                >
                  <Share2 size={12} /> Compartir mi posición
                </button>
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

            {isSuperAdmin && (
              <div className="card p-6 bg-gradient-to-br from-mundial-gold/[0.08] via-white/[0.04] to-white/[0.02] border border-mundial-gold/20">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-mundial-gold/20 border border-mundial-gold/30 text-mundial-gold flex items-center justify-center shrink-0">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-mundial-gold">Tuerca principal</p>
                      <h2 className="font-display text-2xl text-white uppercase leading-none mt-1">Centro de mando</h2>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-2">
                        Control global y ajustes de este grupo en el mismo lugar.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCommandCenter('overview')}
                    className="px-4 py-3 rounded-2xl bg-mundial-gold text-mundial-navy font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-mundial-gold/20 hover:brightness-110 transition-all"
                  >
                    Abrir completo <ExternalLink size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {commandStats.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-mundial-navy/35 px-4 py-3">
                      <Icon size={15} className="text-mundial-gold/80 mb-3" />
                      <p className="font-display text-2xl text-white leading-none">{value}</p>
                      <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mt-2">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {commandLinks.map(({ tab, label, icon: Icon }) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => openCommandCenter(tab)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-zinc-400 hover:text-mundial-gold hover:border-mundial-gold/30 hover:bg-mundial-gold/10 transition-all flex flex-col items-center gap-2"
                    >
                      <Icon size={16} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-1 pt-2">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 text-mundial-gold flex items-center justify-center">
                <Settings size={18} />
              </div>
              <div>
                <h2 className="font-display text-2xl text-white uppercase leading-none">Ajustes del grupo</h2>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-2">
                  Nombre, invitacion, boton de pago y plan de la liga.
                </p>
              </div>
            </div>

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
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg text-white uppercase">Link de Invitación</h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${group.inviteActive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-mundial-red/10 border-mundial-red/20 text-mundial-red'}`}>
                      {group.inviteActive ? 'Activo' : 'Desactivado'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    {group.inviteActive ? 'Cualquiera con el link puede unirse' : 'El link está desactivado'}
                  </p>
                </div>
                <button
                  onClick={() => toggleInviteMut.mutate()}
                  disabled={toggleInviteMut.isPending}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest border transition-all
                    ${group.inviteActive
                      ? 'bg-mundial-red/10 border-mundial-red/20 text-mundial-red hover:bg-mundial-red/20'
                      : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}
                >
                  {toggleInviteMut.isPending ? <Loader2 size={14} className="animate-spin" /> :
                    group.inviteActive ? <><Link2Off size={14} /> Desactivar</> : <><Link2 size={14} /> Activar</>}
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

            <div className="card p-6 bg-white/5 border border-white/5">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-green-400/10 border border-green-400/20 flex items-center justify-center shrink-0">
                    <CreditCard size={17} className="text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-lg text-white uppercase">Boton de pago</h3>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        paymentEnabled ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-zinc-500'
                      }`}>
                        {paymentEnabled ? 'Activo' : 'Oculto'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                      Muestra un boton de pago o transferencia dentro del grupo.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentEnabled(v => !v)}
                  className={`relative w-12 h-7 rounded-full transition-all shrink-0 ${
                    paymentEnabled ? 'bg-green-400' : 'bg-white/10'
                  }`}
                  aria-label="Activar boton de pago"
                >
                  <span
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: paymentEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Cuota</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="input w-full py-3"
                    placeholder="8000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">URL de pago</label>
                  <input
                    type="url"
                    value={paymentLink}
                    onChange={e => setPaymentLink(e.target.value)}
                    className="input w-full py-3"
                    placeholder="https://mpago.la/1Ng5FjY"
                    disabled={!paymentEnabled}
                    style={{ opacity: paymentEnabled ? 1 : 0.45 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (paymentEnabled && !paymentLink.trim()) {
                      toast.error('Agrega el link de pago')
                      return
                    }
                    updatePaymentMut.mutate()
                  }}
                  disabled={updatePaymentMut.isPending}
                  className="px-5 py-3 rounded-2xl bg-green-400 text-mundial-navy font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
                >
                  {updatePaymentMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-3">
                Se vera para todos los miembros como cuota del grupo por {formatCLP(Number(paymentAmount) || 0)}.
              </p>
            </div>

            {/* Info del plan */}
            <div className="card p-6 bg-white/5 border border-white/5">
              <h3 className="font-display text-lg text-white uppercase mb-3">Plan Actual</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-display text-2xl ${group.isPremium ? 'text-mundial-gold' : 'text-zinc-400'}`}>
                    {planLabel}
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
      <OnboardingTour
        group={group}
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        matchParam={searchParams.get('match')}
        setSearchParams={setSearchParams}
        predictionsCount={myPredictions.length}
        startTour={startTour}
        setStartTour={setStartTour}
      />
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
