import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from './LoginPage'
import { groupApi } from '../lib/api'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const joinToken = searchParams.get('joinToken')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)

      // Si venía de un link de invitación, unirse al grupo
      if (joinToken) {
        try {
          const res = await groupApi.joinByToken(joinToken)
          navigate(`/groups/${res.data.group.id}`)
          return
        } catch {
          // Si falla el join, igual continúa al welcome
        }
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
        {error && <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-xl px-4 py-2">{error}</p>}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Nombre de usuario</label>
          <input className="input" value={form.username} onChange={set('username')}
            placeholder="juancho99" required minLength={3} maxLength={20} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Email</label>
          <input className="input" type="email" value={form.email} onChange={set('email')}
            placeholder="tu@email.com" required />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Contraseña</label>
          <input className="input" type="password" value={form.password} onChange={set('password')}
            placeholder="Mínimo 8 caracteres" required minLength={8} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading ? 'Creando cuenta...' : '¡Entrar al torneo →'}
        </button>
        <div className="flex justify-center">
          <Link
            to="/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-600 text-zinc-200 text-sm font-semibold hover:border-zinc-400 hover:bg-zinc-800 transition-all"
          >
            ¿Ya tienes cuenta? <span className="text-field-400 font-bold">Inicia sesión →</span>
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
