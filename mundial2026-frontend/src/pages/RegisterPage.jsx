import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from './LoginPage'
import { groupApi } from '../lib/api'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

function validateUsername(val) {
  if (val.length < 3)  return 'Mínimo 3 caracteres'
  if (val.length > 20) return 'Máximo 20 caracteres'
  if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Solo letras, números y _'
  return ''
}

function passwordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  return score
}

const STRENGTH_CONFIG = [
  { label: 'Muy débil',  color: 'bg-mundial-red' },
  { label: 'Débil',      color: 'bg-orange-500' },
  { label: 'Regular',    color: 'bg-yellow-400' },
  { label: 'Buena',      color: 'bg-blue-400' },
  { label: 'Fuerte',     color: 'bg-green-500' },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const joinToken = searchParams.get('joinToken')

  const [form, setForm]           = useState({ username: '', email: '', password: '' })
  const [usernameError, setUsernameError] = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [touched, setTouched]     = useState({})

  const touch = (k) => setTouched(t => ({ ...t, [k]: true }))

  const set = (k) => (e) => {
    const val = e.target.value
    setForm(f => ({ ...f, [k]: val }))
    if (k === 'username') setUsernameError(validateUsername(val))
  }

  const strength = passwordStrength(form.password)
  const strengthCfg = STRENGTH_CONFIG[strength]

  const canSubmit = !usernameError && form.username.length >= 3 &&
                    form.email.includes('@') && form.password.length >= 8 && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const uErr = validateUsername(form.username)
    if (uErr) { setUsernameError(uErr); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      if (joinToken) {
        try {
          const res = await groupApi.joinByToken(joinToken)
          navigate(`/groups/${res.data.group.id}`)
          return
        } catch {}
      }
      navigate('/welcome')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="ÚNETE" subtitle={joinToken ? 'Crea tu cuenta para unirte al grupo' : 'Crea tu cuenta y empieza a apostar'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Username */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">
            Nombre de usuario
          </label>
          <input
            className={`input transition-colors ${
              touched.username && usernameError
                ? 'border-mundial-red/50 focus:border-mundial-red'
                : touched.username && !usernameError && form.username.length >= 3
                ? 'border-green-500/40 focus:border-green-500'
                : ''
            }`}
            value={form.username}
            onChange={set('username')}
            onBlur={() => touch('username')}
            placeholder="juancho99"
            required
            minLength={3}
            maxLength={20}
          />
          {touched.username && usernameError ? (
            <p className="mt-1 text-[10px] text-mundial-red font-bold flex items-center gap-1">
              <AlertCircle size={10} /> {usernameError}
            </p>
          ) : touched.username && !usernameError && form.username.length >= 3 ? (
            <p className="mt-1 text-[10px] text-green-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={10} /> Disponible
            </p>
          ) : (
            <p className="mt-1 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              Solo letras, números y _ · 3-20 caracteres
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="tu@email.com"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Contraseña</label>
          <div className="relative">
            <input
              className="input pr-11"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              onBlur={() => touch('password')}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength bar */}
          {form.password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength ? strengthCfg.color : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{
                color: strength <= 1 ? '#ef4444' : strength === 2 ? '#f97316' : strength === 3 ? '#facc15' : '#4ade80'
              }}>
                {strengthCfg.label}
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            canSubmit
              ? 'bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20 hover:shadow-mundial-gold/40 active:scale-95'
              : 'bg-white/5 text-zinc-600 cursor-not-allowed'
          }`}
        >
          {loading ? 'Creando cuenta...' : '¡Entrar al torneo →'}
        </button>

        <p className="text-center text-sm text-zinc-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-mundial-gold hover:opacity-80 font-bold transition-opacity">
            Inicia sesión →
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
