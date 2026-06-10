import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { groupApi } from '../lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const joinToken = searchParams.get('joinToken')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Cargar email recordado
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setForm(f => ({ ...f, email: savedEmail }))
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const loggedUser = await login(form.email, form.password)

      if (remember) {
        localStorage.setItem('rememberedEmail', form.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // Si venía de un link de invitación, unirse al grupo
      if (joinToken) {
        try {
          const res = await groupApi.joinByToken(joinToken)
          navigate(`/groups/${res.data.group.id}`)
          return
        } catch {
          // Si falla el join igual redirige
        }
      }

      const redirect = searchParams.get('redirect')
      if (redirect) {
        navigate(redirect)
        return
      }

      // Si ya tiene grupos → ir a grupos, si no → onboarding
      if (loggedUser?.groupCount > 0) {
        navigate('/groups')
      } else {
        navigate('/welcome')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión. Revisa tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="¡HOLA!" subtitle={joinToken ? `Inicia sesión para unirte al grupo` : "Inicia sesión para apostar"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-xl px-4 py-2">{error}</p>}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Email</label>
          <input className="input" type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="tu@email.com" required />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-zinc-400 font-mono uppercase tracking-wider">Contraseña</label>
            <Link to="/forgot-password" className="text-[10px] text-zinc-500 hover:text-mundial-gold transition">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input className="input pr-12" type={showPassword ? 'text' : 'password'} value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••" required />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xl hover:scale-110 transition opacity-60 hover:opacity-100"
            >
              {showPassword ? '🙈' : '🐵'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 accent-mundial-gold focus:ring-offset-zinc-950"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="remember" className="text-[11px] text-zinc-400 cursor-pointer select-none">
            Recordar mi cuenta
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest bg-mundial-gold text-mundial-navy shadow-lg shadow-mundial-gold/20 hover:shadow-mundial-gold/40 active:scale-95 transition-all flex items-center justify-center"
        >
          {loading ? 'Ingresando...' : 'Ingresar →'}
        </button>
        <p className="text-center text-sm text-zinc-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-mundial-gold hover:opacity-80 font-bold transition-opacity">Regístrate gratis</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

// ─── AuthLayout compartido ───────────────────────────────────────────────────

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-1">
            <img src="/logo.png" alt="MUNDIAL 2026" className="w-24 h-auto" />
            <span className="font-display text-2xl text-mundial-gold">MUNDIAL 2026</span>
          </Link>
          <h1 className="font-display text-3xl text-zinc-100 mt-4">{title}</h1>
          <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  )
}
