import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { groupApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Users, Crown, ArrowRight, LogIn, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JoinPage() {
  const { token } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [joined, setJoined] = useState(false)

  // Obtener info del grupo antes de unirse
  const { data: group, isLoading, isError } = useQuery({
    queryKey: ['group-by-token', token],
    queryFn: () => groupApi.getByToken(token).then(r => r.data),
  })

  // Unirse automáticamente si ya está logueado
  const joinMut = useMutation({
    mutationFn: () => groupApi.joinByToken(token),
    onSuccess: (res) => {
      if (res.data.alreadyMember) {
        navigate(`/groups/${res.data.group.id}`)
        return
      }
      setJoined(true)
      setTimeout(() => navigate(`/groups/${res.data.group.id}`), 2000)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al unirse al grupo')
    },
  })

  useEffect(() => {
    // Si ya está logueado, intentar unirse directo
    if (user && group && !joined) {
      joinMut.mutate()
    }
  }, [user, group])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-mundial-navy">
      <div className="w-8 h-8 border-2 border-mundial-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !group) return (
    <div className="min-h-screen flex items-center justify-center bg-mundial-navy px-4">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto text-mundial-red mb-4" />
        <h2 className="font-display text-2xl text-white uppercase mb-2">Link Inválido</h2>
        <p className="text-zinc-500 text-sm mb-6">Este link de invitación no existe o fue desactivado.</p>
        <Link to="/" className="btn-gold px-6 py-3 text-xs">Ir al Inicio</Link>
      </div>
    </div>
  )

  if (!group.inviteActive) return (
    <div className="min-h-screen flex items-center justify-center bg-mundial-navy px-4">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto text-zinc-600 mb-4" />
        <h2 className="font-display text-2xl text-white uppercase mb-2">Invitación Desactivada</h2>
        <p className="text-zinc-500 text-sm mb-6">El administrador del grupo desactivó este link.</p>
        <Link to="/" className="btn-gold px-6 py-3 text-xs">Ir al Inicio</Link>
      </div>
    </div>
  )

  const isFull = group._count?.members >= group.maxMembers

  return (
    <div className="min-h-screen flex items-center justify-center bg-mundial-navy px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display text-3xl text-white tracking-widest">
            MUNDIAL<span className="text-mundial-gold">PRO</span>
          </span>
        </div>

        <div className="card p-8 border-mundial-gold/20 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-mundial-gold to-transparent" />

          {joined ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <CheckCircle2 size={56} className="mx-auto text-green-400 mb-4" />
              <h2 className="font-display text-3xl text-white uppercase mb-2">¡Te uniste!</h2>
              <p className="text-zinc-500 text-sm">Redirigiendo a tu grupo...</p>
            </motion.div>
          ) : (
            <>
              {/* Group info */}
              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
                <div className="w-16 h-16 rounded-2xl bg-mundial-navy border border-white/10 flex items-center justify-center shrink-0">
                  <Users size={32} className="text-mundial-gold" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Fuiste invitado a</p>
                  <h2 className="font-display text-2xl text-white uppercase">{group.name}</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    Admin: {group.creator?.username} · {group._count?.members}/{group.maxMembers} miembros
                  </p>
                </div>
              </div>

              {isFull ? (
                <div className="text-center py-4">
                  <AlertCircle size={32} className="mx-auto text-mundial-red mb-3" />
                  <p className="text-mundial-red font-black uppercase tracking-widest text-xs">Grupo lleno</p>
                  <p className="text-zinc-600 text-xs mt-1">Este grupo ya alcanzó su límite de participantes.</p>
                </div>
              ) : user ? (
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-mundial-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Uniéndote al grupo...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-sm text-zinc-400 leading-relaxed">
                    Necesitas una cuenta para participar. Es <span className="text-white font-bold">gratis</span>.
                  </p>
                  <Link
                    to={`/register?joinToken=${token}`}
                    className="btn-gold w-full py-4 text-xs flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} /> Crear cuenta y unirme
                  </Link>
                  <Link
                    to={`/login?joinToken=${token}`}
                    className="w-full py-4 text-xs flex items-center justify-center gap-2 border border-white/10 rounded-2xl text-zinc-400 hover:text-white hover:border-white/20 transition-all font-black uppercase tracking-widest"
                  >
                    <LogIn size={16} /> Ya tengo cuenta
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
