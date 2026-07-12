import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Trophy, Users, Shield, Zap, Target,
  ChevronDown, Layout, Play, CheckCircle2,
  ArrowRight, Smartphone, Award
} from 'lucide-react'
import {
  AnimationWrapper,
  HoverScale,
  StaggerContainer,
  GlowEffect
} from '../components/AnimationWrapper'

// ── Constants ────────────────────────────────────────────────────────
const WORLD_CUP_DATE = new Date('2026-06-11T15:00:00Z')

function getTimeLeft() {
  const diff = WORLD_CUP_DATE - Date.now()
  if (diff <= 0) return null
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  }
}

function pad(n) { return String(n).padStart(2, '0') }

const FEATURES = [
  { Icon: Zap,        title: 'CÁLCULO INSTANTÁNEO', desc: 'Puntos al segundo. Apenas termina el partido, el ranking se actualiza solo.' },
  { Icon: Shield,     title: 'LIGAS BLINDADAS',      desc: 'Privacidad Total. Tú controlas quién entra con códigos de acceso únicos.' },
  { Icon: Target,     title: 'REGLAS MAESTRAS',      desc: 'Tu liga, tus reglas. Personaliza el puntaje por resultado exacto, ganador o tendencia.' },
  { Icon: Users,      title: 'GESTIÓN EMPRESARIAL',  desc: 'Perfecto para RRHH. Dinamiza tu oficina con una competencia sana y automatizada.' },
  { Icon: Smartphone, title: 'MOBILE FIRST',         desc: 'Apuesta desde el bar. Diseñado para funcionar perfecto en el celular mientras ves el partido.' },
  { Icon: Award,      title: 'HISTORIAL DE GLORIA',  desc: 'Inmortaliza tu victoria. Guarda los resultados de cada mundial y genera rivalidades eternas.' },
]

// plan.style: 'ghost' | 'steel' | 'elite'
const PLANS = [
  {
    name: 'AMATEUR',
    price: '0',
    desc: 'Ideal para tu círculo íntimo.',
    features: ['1 grupo', 'Hasta 5 miembros', 'Pronósticos ilimitados', 'Ranking en tiempo real'],
    cta: 'Empezar Gratis',
    style: 'ghost',
    badge: null,
  },
  {
    name: 'CAPITÁN',
    price: '2.990',
    desc: 'Para grupos de trabajo y familia.',
    features: ['1 grupo', 'Hasta 15 miembros', 'Pronósticos avanzados', 'Predicciones de torneo', 'Gestión de premios'],
    cta: 'Elegir Capitán',
    style: 'steel',
    badge: null,
  },
  {
    name: 'DT',
    price: '4.990',
    desc: 'Para múltiples torneos y grupos.',
    features: ['3 grupos', 'Hasta 50 miembros', 'Pronósticos avanzados', 'Predicciones de torneo', 'Gestión de premios'],
    cta: 'ELEGIR PLAN DT',
    style: 'steel',
    badge: null,
  },
  {
    name: 'ELITE',
    price: '9.990',
    desc: 'Para comunidades y empresas.',
    features: ['Grupos ilimitados', 'Hasta 150 miembros', 'Reglas personalizadas', 'Descarga de Reportes PDF/Excel', 'Soporte Prioritario WhatsApp 24/7'],
    cta: 'ELEGIR PLAN ELITE',
    style: 'elite',
    badge: 'RECOMENDADO PARA EMPRESAS Y GRANDES LIGAS',
  },
]

const FAQS = [
  { q: '¿Cómo creo una liga privada?', a: 'Regístrate, ve a "Grupos", haz clic en "Crear Liga" y elige tu plan. Recibirás un código de invitación único para compartir.' },
  { q: '¿Cómo se calculan los puntos?', a: '5 puntos por resultado exacto, 3 por acertar ganador y diferencia de goles, 1 punto por acertar solo el ganador o empate.' },
  { q: '¿Puedo cambiar mi predicción?', a: 'Sí, puedes editarla hasta 5 minutos antes del inicio de cada partido. Pasado ese tiempo el mercado cierra y tu pronóstico queda registrado.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos tarjetas de crédito, débito y transferencias a través de Mercado Pago.' },
]

// ── Plan card styles — light theme ───────────────────────────────────
const PLAN_CARD_STYLE = {
  ghost: {
    card: {
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
      transform: 'scale(1)',
    },
    price: '#64748b',
    btn: {
      background: 'transparent',
      color: '#475569',
      border: '1px solid rgba(0,0,0,0.2)',
    },
    check: '#94a3b8',
  },
  steel: {
    card: {
      background: '#ffffff',
      border: '1px solid rgba(29,110,255,0.2)',
      boxShadow: '0 4px 24px rgba(29,110,255,0.08)',
      transform: 'scale(1)',
    },
    price: '#1d6eff',
    btn: {
      background: '#1d6eff',
      color: '#ffffff',
      border: 'none',
    },
    check: '#1d6eff',
  },
  elite: {
    card: {
      background: '#fffbf0',
      border: '2px solid rgba(201,150,12,0.45)',
      boxShadow: '0 8px 40px rgba(201,150,12,0.15)',
      transform: 'scale(1.04)',
    },
    price: '#c9960c',
    btn: {
      background: '#FFD700',
      color: '#0f172a',
      border: 'none',
    },
    check: '#c9960c',
  },
}

// ── Component ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading } = useAuth()
  const { hash } = useLocation()
  const [time, setTime] = useState(getTimeLeft())
  const [activeFaq, setActiveFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setTime(getTimeLeft()), 1000)
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => { clearInterval(tick); window.removeEventListener('scroll', onScroll) }
  }, [])

  // Usuario logueado → directo a elegir su polla, sin pasar por el landing.
  // Excepción: si viene con hash (ej. /#planes desde el botón "Subir"), se queda.
  if (!loading && user && !hash) return <Navigate to="/groups" replace />

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f0f6ff 40%, #e4eeff 70%, #dce8ff 100%)', color: '#475569', fontFamily: '"DM Sans", sans-serif', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E31B23', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.5)' }}
              onError={(e) => { e.target.style.display = 'none' }} />
          </div>
          <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 24, color: '#0f172a', letterSpacing: 2 }}>
            MUNDIAL<span style={{ color: '#1d6eff' }}>PRO</span>
          </span>
        </button>

        <div style={{ display: 'none' }} className="md-nav">
          {['inicio', 'características', 'planes', 'faq'].map(id => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#475569' }}>
              {id}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user ? (
            <Link to="/groups" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#FFD700', color: '#0f172a', padding: '10px 20px',
              borderRadius: 999, fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.2em', textDecoration: 'none',
            }}>
              <Layout size={14} /> Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#475569', textDecoration: 'none' }}>
                Ingresar
              </Link>
              <Link to="/register" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#E31B23', color: '#fff', padding: '10px 20px',
                borderRadius: 999, fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.2em', textDecoration: 'none',
              }}>
                Unirse <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="inicio" style={{ position: 'relative', paddingTop: 120, paddingBottom: 80, overflow: 'hidden' }}>
        {/* Glow blobs suaves sobre fondo claro */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '55%', height: '70%', background: 'rgba(255,215,0,0.12)', borderRadius: '50%', filter: 'blur(120px)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: '45%', height: '60%', background: 'rgba(227,27,35,0.07)', borderRadius: '50%', filter: 'blur(120px)' }} />
          <div style={{ position: 'absolute', top: '20%', left: '35%', width: '35%', height: '35%', background: 'rgba(7,121,71,0.06)', borderRadius: '50%', filter: 'blur(100px)' }} />
        </div>

        {/* Layout dos columnas */}
        <div className="hero-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

          {/* Columna izquierda — texto */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {/* Badge */}
            <AnimationWrapper type="fadeUp" delay={0}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '8px 20px', background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.08)', borderRadius: 999, marginBottom: 32,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d6eff', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#1d6eff' }}>
                  Inscripciones abiertas · Mundial 2026
                </span>
              </div>
            </AnimationWrapper>

            {/* Headline */}
            <AnimationWrapper type="slideLeft" delay={0.1}>
              <h1 style={{
                fontFamily: '"Bebas Neue", cursive',
                fontSize: 'clamp(48px, 6vw, 96px)',
                lineHeight: 0.92, color: '#0f172a',
                letterSpacing: '-1px', marginBottom: 28,
              }}>
                La Polla del Mundial<br />
                <span style={{ color: '#1d6eff' }}>que se gestiona sola.</span>
              </h1>
            </AnimationWrapper>

            <AnimationWrapper type="fadeUp" delay={0.2}>
              <p style={{ maxWidth: 500, marginBottom: 40, fontSize: 17, lineHeight: 1.75, color: '#475569', fontWeight: 500 }}>
                Olvida los Excel y los mensajes perdidos. Crea tu liga privada en 30 segundos, automatiza los puntos en tiempo real y vive el mundial como un profesional.
              </p>
            </AnimationWrapper>

            <AnimationWrapper type="fadeUp" delay={0.3}>
              <div className="hero-btns" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <GlowEffect color="gold">
                  <HoverScale scale={1.05}>
                    <Link to="/register" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      background: '#FFD700', color: '#0f172a', padding: '18px 36px',
                      borderRadius: 999, fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
                      letterSpacing: '0.25em', textDecoration: 'none',
                      boxShadow: '0 0 60px rgba(255,215,0,0.4), 0 4px 20px rgba(255,215,0,0.3)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 80px rgba(255,215,0,0.55), 0 8px 30px rgba(255,215,0,0.4)' }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(255,215,0,0.4), 0 4px 20px rgba(255,215,0,0.3)' }}
                    >
                      <Trophy size={18} /> CREAR MI LIGA AHORA
                    </Link>
                  </HoverScale>
                </GlowEffect>
                <HoverScale scale={1.05}>
                  <button onClick={() => scrollTo('características')} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 12,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.2em', color: '#475569',
                  }}>
                    <span style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={16} style={{ fill: '#64748b', color: '#64748b' }} />
                    </span>
                    Cómo funciona
                  </button>
                </HoverScale>
              </div>
            </AnimationWrapper>

            {/* Countdown */}
            {time && (
              <div className="hero-countdown" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 480, marginTop: 52 }}>
                {[{ v: time.d, l: 'Días' }, { v: time.h, l: 'Horas' }, { v: time.m, l: 'Min' }, { v: time.s, l: 'Seg' }].map((item, idx) => (
                  <motion.div
                    key={item.l}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + idx * 0.1, ease: 'easeOut' }}
                    style={{
                      padding: '20px 12px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.07)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      backdropFilter: 'blur(8px)',
                    }}
                >
                  <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 56, color: '#0f172a', lineHeight: 1, marginBottom: 8 }}>
                    {pad(item.v)}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#94a3b8' }}>
                    {item.l}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
          </div>

          {/* Columna derecha — Copa del Mundo */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
            className="hero-cup"
          >
            {/* Flotación continua */}
            <motion.div
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Rotación suave */}
              <motion.div
                animate={{ rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* Glow pulsante */}
                <motion.img
                  src="/mundial-2026-world-cup%20(1).svg"
                  alt="Copa del Mundo 2026"
                  animate={{
                    filter: [
                      'drop-shadow(0 0 30px rgba(255,215,0,0.3)) drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
                      'drop-shadow(0 0 70px rgba(255,215,0,0.6)) drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
                      'drop-shadow(0 0 30px rgba(255,215,0,0.3)) drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 'min(42vw, 460px)',
                    height: 'auto',
                    userSelect: 'none',
                    display: 'block',
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="landing-section-pad" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#1d6eff', marginBottom: 12 }}>
              Fácil como un penal
            </p>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(40px, 7vw, 80px)', color: '#0f172a', lineHeight: 1, margin: 0 }}>
              TU LIGA EN 3 PASOS
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, position: 'relative' }}>
            {/* Línea conectora (solo desktop) */}
            <div style={{
              position: 'absolute', top: 40, left: '16.6%', right: '16.6%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,150,12,0.35), rgba(201,150,12,0.35), transparent)',
              pointerEvents: 'none',
            }} />

            {[
              {
                num: '01',
                title: 'Crea tu liga',
                desc: 'Regístrate y nombra tu comunidad en menos de 30 segundos. Gratis, sin tarjeta de crédito.',
                icon: Trophy,
                color: '#c9960c',
              },
              {
                num: '02',
                title: 'Invita a todos',
                desc: 'Comparte el código de acceso o el link directo. Tus amigos entran en un clic.',
                icon: Users,
                color: '#60a5fa',
              },
              {
                num: '03',
                title: 'Sigue el mundial',
                desc: 'Los puntos se calculan solos al terminar cada partido. Tú solo disfruta la competencia.',
                icon: Zap,
                color: '#34d399',
              },
            ].map(({ num, title, desc, icon: Icon, color }) => (
              <div key={num} style={{
                padding: '40px 32px', textAlign: 'center', position: 'relative',
              }}
                onMouseOver={e => e.currentTarget.querySelector('.step-card').style.borderColor = `${color}55`}
                onMouseOut={e => e.currentTarget.querySelector('.step-card').style.borderColor = 'rgba(0,0,0,0.07)'}
              >
                <div className="step-card" style={{
                  padding: '36px 24px', borderRadius: 24,
                  background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                  transition: 'border-color 0.3s',
                }}>
                  {/* Número */}
                  <div style={{
                    fontFamily: '"Bebas Neue", cursive', fontSize: 72, lineHeight: 1,
                    color: 'rgba(0,0,0,0.04)', marginBottom: -16, userSelect: 'none',
                  }}>
                    {num}
                  </div>

                  {/* Ícono */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
                    background: `${color}15`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color,
                  }}>
                    <Icon size={28} />
                  </div>

                  <h3 style={{
                    fontFamily: '"Bebas Neue", cursive', fontSize: 26, color: '#0f172a',
                    letterSpacing: 1, marginBottom: 12,
                  }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#64748b', margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA inline */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#0f172a', color: '#ffffff',
              padding: '14px 32px', borderRadius: 999,
              fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.25em', textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              transition: 'all 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = '#1d6eff'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseOut={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <ArrowRight size={14} /> Empezar ahora — es gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ── CARACTERÍSTICAS ── */}
      <section id="características" className="landing-section-pad" style={{ padding: '96px 24px', background: 'rgba(0,0,0,0.025)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 64, paddingBottom: 24, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#1d6eff', marginBottom: 12 }}>
              Potencia Mundial
            </p>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(36px, 6vw, 72px)', color: '#0f172a', lineHeight: 1, margin: 0 }}>
              TECNOLOGÍA AL SERVICIO<br />DE TU LIGA
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ Icon, title, desc }, idx) => (
              <AnimationWrapper key={title} type="fadeUp" delay={idx * 0.08}>
                <HoverScale scale={1.02}>
                  <div style={{
                    padding: '40px 32px', borderRadius: 24,
                    background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    transition: 'border-color 0.3s, transform 0.3s',
                  }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(201,150,12,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f0f6ff', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: '#1d6eff' }}>
                      <Icon size={24} />
                    </div>
                    <h3 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 24, color: '#0f172a', marginBottom: 12, letterSpacing: 1 }}>{title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: '#64748b', margin: 0 }}>{desc}</p>
                  </div>
                </HoverScale>
              </AnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANES ── */}
      <section id="planes" className="landing-section-pad" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(48px, 8vw, 96px)', color: '#0f172a', lineHeight: 1, marginBottom: 8 }}>
              ELIGE TU NIVEL
            </h2>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#94a3b8' }}>
              PAGO ÚNICO MENSUAL · PRECIOS EN PESOS CHILENOS
            </p>
          </div>

          <div className="plans-grid">
            {PLANS.map((plan, idx) => {
              const s = PLAN_CARD_STYLE[plan.style]
              const isElite = plan.style === 'elite'
              return (
                <AnimationWrapper key={plan.name} type="scaleIn" delay={idx * 0.1}>
                  <HoverScale scale={isElite ? 1.04 : 1.02}>
                    <div style={{
                      padding: '28px 20px', borderRadius: 24, position: 'relative', overflow: 'hidden',
                      ...s.card,
                      transition: 'transform 0.3s, box-shadow 0.3s',
                    }}>
                  {/* Badge superior */}
                  {plan.badge && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      background: 'linear-gradient(90deg, #c9960c, #FFD700, #c9960c)',
                      color: '#0f172a', padding: '7px 16px',
                      fontSize: 8, fontWeight: 900,
                      textTransform: 'uppercase', letterSpacing: '0.18em',
                      textAlign: 'center', whiteSpace: 'nowrap',
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 style={{
                    fontFamily: '"Bebas Neue", cursive', fontSize: 32,
                    color: isElite ? '#c9960c' : '#0f172a',
                    marginTop: plan.badge ? 28 : 0,
                    marginBottom: 6, letterSpacing: 2,
                  }}>
                    {plan.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8', fontSize: 16, fontWeight: 700 }}>$</span>
                    <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: isElite ? 48 : 42, color: s.price, lineHeight: 1 }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginLeft: 3 }}>
                      CLP/mes
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>{plan.desc}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={12} style={{ color: s.check, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{f}</span>
                      </div>
                    ))}
                  </div>

                      <Link to="/register" style={{
                        display: 'block', width: '100%', padding: isElite ? '13px' : '11px',
                        textAlign: 'center', borderRadius: 12, fontSize: 9, fontWeight: 900,
                        textTransform: 'uppercase', letterSpacing: '0.15em', textDecoration: 'none',
                        transition: 'all 0.2s',
                        boxShadow: isElite ? '0 4px 20px rgba(201,150,12,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
                        ...s.btn,
                      }}
                        onMouseOver={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </HoverScale>
                </AnimationWrapper>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="landing-section-pad" style={{ padding: '96px 24px', background: 'rgba(0,0,0,0.025)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(40px, 7vw, 80px)', color: '#0f172a', margin: 0 }}>
              PREGUNTAS FRECUENTES
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((item, i) => (
              <AnimationWrapper key={i} type="fadeUp" delay={i * 0.08}>
                <div style={{
                  borderRadius: 20, overflow: 'hidden',
                  border: activeFaq === i ? '1px solid rgba(201,150,12,0.35)' : '1px solid rgba(0,0,0,0.07)',
                  background: activeFaq === i ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.8)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s',
                }}>
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="faq-btn" style={{
                  width: '100%', padding: '24px 28px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16, background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, color: '#0f172a', letterSpacing: 0.5 }}>{item.q}</span>
                  <ChevronDown size={18} style={{ color: activeFaq === i ? '#1d6eff' : '#94a3b8', transform: activeFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>
                {activeFaq === i && (
                  <div style={{ padding: '0 28px 24px', fontSize: 14, color: '#64748b', lineHeight: 1.7, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ paddingTop: 16 }}>{item.a}</div>
                  </div>
                )}
                </div>
              </AnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── CIERRE / URGENCIA ── */}
      <AnimationWrapper type="fadeUp">
        <section style={{ padding: '80px 24px', textAlign: 'center', background: 'rgba(201,150,12,0.07)', borderTop: '1px solid rgba(201,150,12,0.2)', borderBottom: '1px solid rgba(201,150,12,0.2)' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#1d6eff', marginBottom: 16 }}>
              ⏱ Precio de Lanzamiento
            </p>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(32px, 6vw, 64px)', color: '#0f172a', lineHeight: 1.1, marginBottom: 20 }}>
              No dejes tu polla para última hora.
            </h2>
            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.7, marginBottom: 36 }}>
              Configura tu liga hoy y asegura el precio de lanzamiento antes de que empiece el torneo.
            </p>
            <GlowEffect color="gold">
              <HoverScale scale={1.05}>
                <Link to="/register" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: '#FFD700', color: '#0f172a', padding: '16px 36px',
                  borderRadius: 999, fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
                  letterSpacing: '0.25em', textDecoration: 'none',
                  boxShadow: '0 0 50px rgba(255,215,0,0.35)',
                }}>
                  <Trophy size={16} /> CREAR MI LIGA AHORA
                </Link>
              </HoverScale>
            </GlowEffect>
          </div>
        </section>
      </AnimationWrapper>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, color: '#0f172a', letterSpacing: 2 }}>
          MUNDIAL<span style={{ color: '#1d6eff' }}>PRO</span>
        </span>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          © 2026 MundialPro · Hecho con ❤️ en Chile 🇨🇱
        </p>
      </footer>

    </div>
  )
}
