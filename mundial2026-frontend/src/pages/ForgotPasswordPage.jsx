import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from './LoginPage'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Simulación de envío de correo (MVP SaaS)
    // En producción aquí llamaríamos a authApi.requestReset(email)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 1500)
  }

  return (
    <AuthLayout 
      title="RECUPERAR" 
      subtitle={sent ? "Correo enviado con éxito" : "Ingresa tu email para restablecer tu contraseña"}
    >
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-mono uppercase tracking-widest">
              Tu Email de Registro
            </label>
            <input
              type="email"
              required
              className="input"
              placeholder="admin@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3.5 text-zinc-900 font-bold shadow-lg shadow-gold-900/10 active:scale-95"
          >
            {loading ? 'Procesando...' : 'Enviar Instrucciones →'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-300 transition">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </form>
      ) : (
        <div className="text-center py-6 animate-fade-in">
          <div className="w-16 h-16 bg-field-900/30 text-field-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            📧
          </div>
          <h3 className="font-display text-xl text-zinc-100 mb-2">¡REVISA TU BANDEJA!</h3>
          <p className="text-zinc-500 text-sm mb-8">
            Si el correo <b>{email}</b> está registrado, recibirás un enlace para crear una nueva contraseña en los próximos minutos.
          </p>
          <Link to="/login" className="btn-primary px-8 py-3">
            Volver al Login
          </Link>
          <p className="mt-8 text-xs text-zinc-600">
            ¿No recibiste nada? Revisa tu carpeta de SPAM o <button onClick={() => setSent(false)} className="text-zinc-500 hover:underline">intenta de nuevo</button>.
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
