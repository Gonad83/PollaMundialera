import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupApi, paymentApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Users, ArrowRight, Crown, CheckCircle2,
  ChevronLeft, Loader2, Link2, Zap
} from 'lucide-react'

// ── Plan comparison data ────────────────────────────────────────────
const PLANS_COMPARE = [
  {
    id: 'free',
    name: 'AMATEUR',
    price: 'Gratis',
    priceNum: null,
    desc: 'Para tu círculo íntimo.',
    features: ['1 grupo', 'Hasta 5 miembros', 'Pronósticos básicos', 'Ranking en tiempo real'],
    style: 'ghost',
  },
  {
    id: 'elite',
    name: 'ELITE',
    price: '$9.990',
    priceNum: 9990,
    desc: 'Para grandes ligas y empresas.',
    features: [
      'Grupos ilimitados',
      'Hasta 150 miembros',
      'Reglas personalizadas',
      'Descarga PDF/Excel',
      'Soporte WhatsApp 24/7',
    ],
    style: 'elite',
    badge: 'RECOMENDADO',
  },
]

// ── Main Component ──────────────────────────────────────────────────
export default function WelcomePage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // step: 'choice' | 'create-name' | 'create-plan' | 'join'
  const [step, setStep] = useState('choice')
  const [ligaName, setLigaName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [loadingPayment, setLoadingPayment] = useState(false)

  // Si ya tiene grupos → ir al primero
  const { data: myGroups, isLoading: loadingGroups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupApi.my().then(r => r.data),
    enabled: !!user,
  })

  useEffect(() => {
    if (!loadingGroups && myGroups && myGroups.length > 0) {
      navigate(`/groups/${myGroups[0].id}`, { replace: true })
    }
  }, [myGroups, loadingGroups, navigate])

  const createMut = useMutation({
    mutationFn: () => groupApi.create({ name: ligaName.trim() }),
    onSuccess: async (res) => {
      const group = res.data
      updateUser({ groupCount: (user?.groupCount || 0) + 1 })
      qc.invalidateQueries({ queryKey: ['my-groups'] })

      // Si eligió ELITE → iniciar pago
      if (selectedPlan === 'elite') {
        setLoadingPayment(true)
        try {
          const { data } = await paymentApi.createPreference(group.id, 'tier2')
          window.location.href = data.initPoint
        } catch {
          // Si falla el pago igual entra al grupo
          navigate(`/groups/${group.id}`)
        }
      } else {
        navigate(`/groups/${group.id}`)
      }
    },
    onError: (err) => setError(err.response?.data?.error || 'Error al crear grupo'),
  })

  const joinMut = useMutation({
    mutationFn: () => groupApi.join(joinCode.trim().toUpperCase()),
    onSuccess: (res) => {
      updateUser({ groupCount: (user?.groupCount || 0) + 1 })
      qc.invalidateQueries({ queryKey: ['my-groups'] })
      navigate(`/groups/${res.data.id}`)
    },
    onError: (err) => setError(err.response?.data?.error || 'Código inválido'),
  })

  if (loadingGroups) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <Loader2 size={32} className="text-[#FFD700] animate-spin" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: '#0A192F', fontFamily: '"DM Sans", sans-serif' }}
    >
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E31B23]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFD700]/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10"
        >
          <img src="/logo.png" alt="Logo" className="w-16 h-auto mb-3" onError={e => e.target.style.display = 'none'} />
          <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 28, letterSpacing: 3, color: '#fff' }}>
            MUNDIAL<span style={{ color: '#FFD700' }}>PRO</span>
          </span>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── CHOICE ── */}
          {step === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h1 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(36px, 8vw, 60px)', color: '#fff', lineHeight: 1, marginBottom: 12 }}>
                ¡BIENVENIDO, {user?.username?.toUpperCase()}!
              </h1>
              <p style={{ color: '#71717a', fontSize: 15, marginBottom: 48, lineHeight: 1.6 }}>
                El mundial se vive mejor en comunidad. ¿Qué quieres hacer?
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Crear */}
                <button
                  onClick={() => { setStep('create-name'); setError('') }}
                  style={{
                    flex: 1, padding: '28px 24px', borderRadius: 24,
                    background: '#FFD700', color: '#0A192F',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 0 60px rgba(255,215,0,0.3)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 80px rgba(255,215,0,0.5)' }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(255,215,0,0.3)' }}
                >
                  <Trophy size={32} style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, letterSpacing: 2, marginBottom: 6 }}>
                    CREAR MI LIGA PRIVADA
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
                    Sé el administrador de tu comunidad
                  </div>
                </button>

                {/* Unirse */}
                <button
                  onClick={() => { setStep('join'); setError('') }}
                  style={{
                    flex: 1, padding: '28px 24px', borderRadius: 24,
                    background: 'rgba(255,255,255,0.04)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                >
                  <Link2 size={32} style={{ margin: '0 auto 12px', color: '#a1a1aa' }} />
                  <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, letterSpacing: 2, marginBottom: 6 }}>
                    UNIRME CON CÓDIGO
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#71717a' }}>
                    Tengo el código de un amigo
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── CREATE: STEP 1 — NOMBRE ── */}
          {step === 'create-name' && (
            <motion.div
              key="create-name"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <button
                onClick={() => { setStep('choice'); setError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', marginBottom: 32, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}
              >
                <ChevronLeft size={16} /> Volver
              </button>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#FFD700' }}>
                  PASO 1 DE 2
                </span>
              </div>
              <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(32px, 7vw, 52px)', color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                NOMBRA TU LIGA
              </h2>
              <p style={{ color: '#71717a', fontSize: 14, marginBottom: 32 }}>
                Elige un nombre épico. Tus rivales lo verán en cada partido.
              </p>

              {error && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(227,27,35,0.1)', border: '1px solid rgba(227,27,35,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <input
                autoFocus
                value={ligaName}
                onChange={e => setLigaName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ligaName.trim() && setStep('create-plan')}
                placeholder="Ej: Los Crack de la Oficina"
                style={{
                  width: '100%', padding: '18px 20px', borderRadius: 16, fontSize: 18,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none', marginBottom: 16, boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,215,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />

              <button
                onClick={() => { setError(''); setStep('create-plan') }}
                disabled={!ligaName.trim()}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16,
                  background: ligaName.trim() ? '#FFD700' : 'rgba(255,255,255,0.05)',
                  color: ligaName.trim() ? '#0A192F' : '#52525b',
                  border: 'none', cursor: ligaName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: ligaName.trim() ? '0 0 40px rgba(255,215,0,0.25)' : 'none',
                }}
              >
                Elegir Plan <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── CREATE: STEP 2 — PLAN ── */}
          {step === 'create-plan' && (
            <motion.div
              key="create-plan"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <button
                onClick={() => { setStep('create-name'); setError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', marginBottom: 32, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}
              >
                <ChevronLeft size={16} /> Volver
              </button>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#FFD700' }}>
                  PASO 2 DE 2
                </span>
              </div>
              <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(28px, 6vw, 44px)', color: '#fff', lineHeight: 1, marginBottom: 4 }}>
                ELIGE EL PODER DE TU LIGA
              </h2>
              <p style={{ color: '#71717a', fontSize: 13, marginBottom: 28 }}>
                Liga: <strong style={{ color: '#fff' }}>"{ligaName}"</strong>
              </p>

              {error && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(227,27,35,0.1)', border: '1px solid rgba(227,27,35,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {PLANS_COMPARE.map(plan => {
                  const isElite = plan.id === 'elite'
                  const isSelected = selectedPlan === plan.id
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      style={{
                        padding: '24px 20px', borderRadius: 20, textAlign: 'left',
                        background: isElite
                          ? isSelected ? 'rgba(255,215,0,0.1)' : 'rgba(255,215,0,0.04)'
                          : isSelected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                        border: isElite
                          ? isSelected ? '2px solid #FFD700' : '2px solid rgba(255,215,0,0.3)'
                          : isSelected ? '2px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        boxShadow: isElite && isSelected ? '0 0 40px rgba(255,215,0,0.2)' : 'none',
                        position: 'relative', overflow: 'hidden',
                        transition: 'all 0.2s',
                      }}
                    >
                      {plan.badge && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0,
                          background: '#FFD700', color: '#0A192F',
                          fontSize: 8, fontWeight: 900, textTransform: 'uppercase',
                          letterSpacing: '0.15em', padding: '4px', textAlign: 'center',
                        }}>
                          {plan.badge}
                        </div>
                      )}

                      {isSelected && (
                        <CheckCircle2 size={18} style={{ position: 'absolute', top: plan.badge ? 28 : 12, right: 12, color: isElite ? '#FFD700' : '#a1a1aa' }} />
                      )}

                      <div style={{ marginTop: plan.badge ? 20 : 0 }}>
                        <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, color: isElite ? '#FFD700' : '#fff', letterSpacing: 1, marginBottom: 4 }}>
                          {plan.name}
                        </div>
                        <div style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 28, color: isElite ? '#FFD700' : '#a1a1aa', lineHeight: 1, marginBottom: 12 }}>
                          {plan.price}
                          {plan.priceNum && <span style={{ fontSize: 11, fontWeight: 700, color: '#71717a', marginLeft: 4 }}>CLP/mes</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {plan.features.map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <CheckCircle2 size={12} style={{ color: isElite ? '#FFD700' : '#52525b', flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontSize: 11, color: isElite ? '#d4d4d8' : '#71717a', lineHeight: 1.4 }}>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => {
                  if (!selectedPlan) return
                  setError('')
                  createMut.mutate()
                }}
                disabled={!selectedPlan || createMut.isPending || loadingPayment}
                style={{
                  width: '100%', padding: '18px', borderRadius: 16,
                  background: selectedPlan ? '#FFD700' : 'rgba(255,255,255,0.05)',
                  color: selectedPlan ? '#0A192F' : '#52525b',
                  border: 'none', cursor: selectedPlan ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: selectedPlan ? '0 0 40px rgba(255,215,0,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {createMut.isPending || loadingPayment ? (
                  <><Loader2 size={16} className="animate-spin" /> {selectedPlan === 'elite' ? 'Redirigiendo al pago...' : 'Creando liga...'}</>
                ) : (
                  <><Crown size={16} /> {selectedPlan === 'elite' ? 'CREAR Y PAGAR $9.990' : 'CREAR LIGA GRATIS'}</>
                )}
              </button>

              {selectedPlan === 'elite' && (
                <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#52525b' }}>
                  Pago seguro vía Mercado Pago · Tu liga se activa inmediatamente
                </p>
              )}
            </motion.div>
          )}

          {/* ── JOIN ── */}
          {step === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <button
                onClick={() => { setStep('choice'); setError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', marginBottom: 32, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}
              >
                <ChevronLeft size={16} /> Volver
              </button>

              <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(32px, 7vw, 52px)', color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                UNIRME A UNA LIGA
              </h2>
              <p style={{ color: '#71717a', fontSize: 14, marginBottom: 32 }}>
                Ingresa el código que te compartió tu administrador.
              </p>

              {error && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(227,27,35,0.1)', border: '1px solid rgba(227,27,35,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <input
                autoFocus
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && joinCode.length >= 4 && joinMut.mutate()}
                placeholder="ABCD1234"
                maxLength={8}
                style={{
                  width: '100%', padding: '22px 20px', borderRadius: 16,
                  fontSize: 32, textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.4em',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none', marginBottom: 16, boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,215,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />

              <button
                onClick={() => { setError(''); joinMut.mutate() }}
                disabled={joinCode.length < 4 || joinMut.isPending}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16,
                  background: joinCode.length >= 4 ? '#FFD700' : 'rgba(255,255,255,0.05)',
                  color: joinCode.length >= 4 ? '#0A192F' : '#52525b',
                  border: 'none', cursor: joinCode.length >= 4 ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: joinCode.length >= 4 ? '0 0 40px rgba(255,215,0,0.25)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {joinMut.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Validando...</>
                ) : (
                  <><Users size={16} /> CONFIRMAR INGRESO</>
                )}
              </button>

              <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 14, background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Zap size={14} style={{ color: '#FFD700', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
                    ¿Tu amigo te envió un link? Ábrelo directamente desde ese link para unirte sin código.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
