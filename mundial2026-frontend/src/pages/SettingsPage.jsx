import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../lib/api'
import { motion } from 'framer-motion'
import { User, Image, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const AVATAR_EMOJIS = ['⚽', '🏆', '🥇', '🦁', '🐯', '🦅', '🔥', '⚡', '🌟', '🎯', '👑', '🛡️']

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const qc = useQueryClient()

  const [username, setUsername]   = useState(user?.username || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [usernameError, setUsernameError] = useState('')

  const validate = (val) => {
    if (val.length < 3)  return 'Mínimo 3 caracteres'
    if (val.length > 20) return 'Máximo 20 caracteres'
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Solo letras, números y guión bajo'
    return ''
  }

  const mutation = useMutation({
    mutationFn: () => authApi.updateMe({
      username: username !== user?.username ? username : undefined,
      avatarUrl: avatarUrl !== user?.avatarUrl ? avatarUrl : undefined,
    }),
    onSuccess: (res) => {
      updateUser({ username: res.data.username, avatarUrl: res.data.avatarUrl })
      qc.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast.success('Perfil actualizado')
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Error al actualizar'
      toast.error(msg)
      if (msg.includes('usuario')) setUsernameError(msg)
    },
  })

  const hasChanges = username !== user?.username || avatarUrl !== (user?.avatarUrl || '')
  const canSave    = hasChanges && !usernameError && username.length >= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto space-y-6 pb-20 px-4"
    >
      <div className="pt-4">
        <h1 className="font-display text-4xl text-white uppercase tracking-tight">Editar perfil</h1>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Personaliza tu cuenta</p>
      </div>

      {/* Avatar */}
      <div className="card p-6 space-y-4 bg-white/3 border border-white/5">
        <h2 className="font-display text-lg text-white uppercase flex items-center gap-2">
          <Image size={16} className="text-mundial-gold" /> Avatar
        </h2>

        {/* Preview */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-mundial-navyLight border border-white/10 flex items-center justify-center text-3xl font-display text-mundial-gold overflow-hidden shrink-0">
            {avatarUrl && avatarUrl.length <= 2
              ? <span className="text-4xl">{avatarUrl}</span>
              : avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                : <span>{user?.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="flex-1">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-2">Elige un emoji</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setAvatarUrl(avatarUrl === e ? '' : e)}
                  className={`w-9 h-9 rounded-xl text-xl transition-all border ${
                    avatarUrl === e
                      ? 'bg-mundial-gold/20 border-mundial-gold/50 scale-110'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1.5">O pega una URL de imagen</p>
          <input
            className="input py-2.5 text-sm"
            placeholder="https://..."
            value={AVATAR_EMOJIS.includes(avatarUrl) ? '' : avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
          />
        </div>
      </div>

      {/* Username */}
      <div className="card p-6 space-y-4 bg-white/3 border border-white/5">
        <h2 className="font-display text-lg text-white uppercase flex items-center gap-2">
          <User size={16} className="text-mundial-gold" /> Nombre de usuario
        </h2>

        <div className="space-y-1.5">
          <input
            className={`input py-3 text-sm font-mono tracking-wide ${usernameError ? 'border-mundial-red/50 focus:border-mundial-red' : ''}`}
            value={username}
            onChange={e => {
              setUsername(e.target.value)
              setUsernameError(validate(e.target.value))
            }}
            maxLength={20}
            placeholder="tu_nombre"
          />
          {usernameError ? (
            <p className="text-[10px] text-mundial-red font-bold flex items-center gap-1">
              <AlertCircle size={10} /> {usernameError}
            </p>
          ) : username !== user?.username && !usernameError ? (
            <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={10} /> Disponible
            </p>
          ) : (
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              Solo letras, números y _ · 3-20 caracteres
            </p>
          )}
        </div>
      </div>

      {/* Info de cuenta (solo lectura) */}
      <div className="card p-6 space-y-3 bg-white/3 border border-white/5">
        <h2 className="font-display text-lg text-white uppercase flex items-center gap-2">
          <CheckCircle2 size={16} className="text-zinc-500" /> Cuenta
        </h2>
        <div className="space-y-2">
          {[
            { label: 'Email',  value: user?.email },
            { label: 'Plan',   value: user?.plan || 'FREE' },
            { label: 'Puntos', value: user?.totalPoints ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
              <span className="text-xs font-bold text-zinc-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guardar */}
      <button
        onClick={() => mutation.mutate()}
        disabled={!canSave || mutation.isPending}
        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
          canSave
            ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20 hover:shadow-mundial-gold/40'
            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
        }`}
      >
        {mutation.isPending
          ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
          : <><Save size={14} /> Guardar cambios</>
        }
      </button>
    </motion.div>
  )
}
