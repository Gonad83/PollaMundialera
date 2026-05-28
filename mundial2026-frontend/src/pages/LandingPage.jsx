import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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

// ── Plan card styles ──────────────────────────────────────────────────
const PLAN_CARD_STYLE = {
  ghost: {
    card: {
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: 'none',
      transform: 'scale(1)',
    },
    price: '#a1a1aa',
    btn: {
      background: 'transparent',
      color: '#71717a',
      border: '1px solid rgba(255,255,255,0.12)',
    },
    check: '#52525b',
  },
  steel: {
    card: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(100,120,160,0.25)',
      boxShadow: 'none',
      transform: 'scale(1)',
    },
    price: '#94a3b8',
    btn: {
      background: 'rgba(100,120,160,0.15)',
      color: '#94a3b8',
      border: '1px solid rgba(100,120,160,0.3)',
    },
    check: '#64748b',
  },
  elite: {
    card: {
      background: 'rgba(255,215,0,0.05)',
      border: '2px solid rgba(255,215,0,0.55)',
      boxShadow: '0 0 80px rgba(255,215,0,0.13), 0 0 30px rgba(255,215,0,0.08) inset',
      transform: 'scale(1.04)',
    },
    price: '#FFD700',
    btn: {
      background: '#FFD700',
      color: '#0A192F',
      border: 'none',
    },
    check: '#FFD700',
  },
}

// ── Component ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth()
  const [time, setTime] = useState(getTimeLeft())
  const [activeFaq, setActiveFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setTime(getTimeLeft()), 1000)
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => { clearInterval(tick); window.removeEventListener('scroll', onScroll) }
  }, [])

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ background: '#0A192F', color: '#a1a1aa', fontFamily: '"DM Sans", sans-serif' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        background: scrolled ? 'rgba(10,25,47,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E31B23', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.5)' }}
              onError={(e) => { e.target.style.display = 'none' }} />
          </div>
          <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 24, color: '#fff', letterSpacing: 2 }}>
            MUNDIAL<span style={{ color: '#FFD700' }}>PRO</span>
          </span>
        </button>

        <div style={{ display: 'none' }} className="md-nav">
          {['inicio', 'características', 'planes', 'faq'].map(id => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#71717a' }}>
              {id}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user ? (
            <Link to="/matches" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#FFD700', color: '#0A192F', padding: '10px 20px',
              borderRadius: 999, fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.2em', textDecoration: 'none',
            }}>
              <Layout size={14} /> Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#71717a', textDecoration: 'none' }}>
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
      <section id="inicio" style={{ position: 'relative', paddingTop: 160, paddingBottom: 96, textAlign: 'center', overflow: 'hidden' }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '5%', left: '5%', width: '40%', height: '40%', background: 'rgba(227,27,35,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: '40%', height: '40%', background: 'rgba(255,215,0,0.06)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <AnimationWrapper type="fadeUp" delay={0}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '8px 20px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, marginBottom: 32,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD700', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#FFD700' }}>
                Inscripciones abiertas · Mundial 2026
              </span>
            </div>
          </AnimationWrapper>

          {/* Headline */}
          <AnimationWrapper type="slideLeft" delay={0.1}>
            <h1 style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: 'clamp(52px, 10vw, 110px)',
              lineHeight: 0.92, color: '#fff',
              letterSpacing: '-1px', marginBottom: 32,
            }}>
              La Polla del Mundial<br />
              <span style={{ WebkitTextStroke: '2px #FFD700', color: 'transparent' }}>que se gestiona sola.</span>
            </h1>
          </AnimationWrapper>

          <AnimationWrapper type="fadeUp" delay={0.2}>
            <p style={{ maxWidth: 600, margin: '0 auto 40px', fontSize: 18, lineHeight: 1.75, color: '#a1a1aa', fontWeight: 500 }}>
              Olvida los Excel y los mensajes perdidos. Crea tu liga privada en 30 segundos, automatiza los puntos en tiempo real y vive el mundial como un profesional.
            </p>
          </AnimationWrapper>

          <AnimationWrapper type="fadeUp" delay={0.3}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
              <GlowEffect color="gold">
                <HoverScale scale={1.05}>
                  <Link to="/register" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    background: '#FFD700', color: '#0A192F', padding: '18px 36px',
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
                  letterSpacing: '0.2em', color: '#71717a',
                }}>
                  <span style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={16} style={{ fill: '#a1a1aa', color: '#a1a1aa' }} />
                  </span>
                  Cómo funciona
                </button>
              </HoverScale>
            </div>
          </AnimationWrapper>

          {/* Countdown */}
          {time && (
            <AnimationWrapper type="scaleIn" delay={0.4}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 600, margin: '64px auto 0' }}>
                <StaggerContainer delay={0.1}>
                  {[{ v: time.d, l: 'Días' }, { v: time.h, l: 'Horas' }, { v: time.m, l: 'Min' }, { v: time.s, l: 'Seg' }].map(item => (
                    <div key={item.l} style={{
                      padding: '24px 16px', borderRadius: 24,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}>
                      <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 56, color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                        {pad(item.v)}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#52525b' }}>
                        {item.l}
                      </span>
                    </div>
                  ))}
                </StaggerContainer>
              </div>
            </AnimationWrapper>
          )}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#FFD700', marginBottom: 12 }}>
              Fácil como un penal
            </p>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(40px, 7vw, 80px)', color: '#fff', lineHeight: 1, margin: 0 }}>
              TU LIGA EN 3 PASOS
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, position: 'relative' }}>
            {/* Línea conectora (solo desktop) */}
            <div style={{
              position: 'absolute', top: 40, left: '16.6%', right: '16.6%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.2), rgba(255,215,0,0.2), transparent)',
              pointerEvents: 'none',
            }} />

            {[
              {
                num: '01',
                title: 'Crea tu liga',
                desc: 'Regístrate y nombra tu comunidad en menos de 30 segundos. Gratis, sin tarjeta de crédito.',
                icon: Trophy,
                color: '#FFD700',
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
                onMouseOver={e => e.currentTarget.querySelector('.step-card').style.borderColor = `${color}33`}
                onMouseOut={e => e.currentTarget.querySelector('.step-card').style.borderColor = 'rgba(255,255,255,0.06)'}
              >
                <div className="step-card" style={{
                  padding: '36px 24px', borderRadius: 24,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'border-color 0.3s',
                }}>
                  {/* Número */}
                  <div style={{
                    fontFamily: '"Bebas Neue", cursive', fontSize: 72, lineHeight: 1,
                    color: 'rgba(255,255,255,0.04)', marginBottom: -16, userSelect: 'none',
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
                    fontFamily: '"Bebas Neue", cursive', fontSize: 26, color: '#fff',
                    letterSpacing: 1, marginBottom: 12,
                  }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#71717a', margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA inline */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,215,0,0.08)', color: '#FFD700',
              padding: '14px 32px', borderRadius: 999,
              fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.25em', textDecoration: 'none',
              border: '1px solid rgba(255,215,0,0.25)',
              transition: 'background 0.2s',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,215,0,0.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,215,0,0.08)'}
            >
              <ArrowRight size={14} /> Empezar ahora — es gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ── CARACTERÍSTICAS ── */}
      <section id="características" style={{ padding: '96px 24px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 64, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#FFD700', marginBottom: 12 }}>
              Potencia Mundial
            </p>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(36px, 6vw, 72px)', color: '#fff', lineHeight: 1, margin: 0 }}>
              TECNOLOGÍA AL SERVICIO<br />DE TU LIGA
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(({ Icon, title, desc }, idx) => (
              <AnimationWrapper key={title} type="fadeUp" delay={idx * 0.08}>
                <HoverScale scale={1.02}>
                  <div style={{
                    padding: '40px 32px', borderRadius: 24,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'border-color 0.3s, transform 0.3s',
                  }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: '#112240', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: '#FFD700' }}>
                      <Icon size={24} />
                    </div>
                    <h3 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 24, color: '#fff', marginBottom: 12, letterSpacing: 1 }}>{title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: '#71717a', margin: 0 }}>{desc}</p>
                  </div>
                </HoverScale>
              </AnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANES ── */}
      <section id="planes" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(48px, 8vw, 96px)', color: '#fff', lineHeight: 1, marginBottom: 8 }}>
              ELIGE TU NIVEL
            </h2>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#52525b' }}>
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
                      background: 'linear-gradient(90deg, #b8860b, #FFD700, #b8860b)',
                      color: '#0A192F', padding: '7px 16px',
                      fontSize: 8, fontWeight: 900,
                      textTransform: 'uppercase', letterSpacing: '0.18em',
                      textAlign: 'center', whiteSpace: 'nowrap',
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 style={{
                    fontFamily: '"Bebas Neue", cursive', fontSize: 32,
                    color: isElite ? '#FFD700' : '#fff',
                    marginTop: plan.badge ? 28 : 0,
                    marginBottom: 6, letterSpacing: 2,
                    textShadow: isElite ? '0 0 30px rgba(255,215,0,0.4)' : 'none',
                  }}>
                    {plan.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 6 }}>
                    <span style={{ color: '#52525b', fontSize: 16, fontWeight: 700 }}>$</span>
                    <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: isElite ? 48 : 42, color: s.price, lineHeight: 1 }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#52525b', marginLeft: 3 }}>
                      CLP/mes
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: '#71717a', marginBottom: 16, lineHeight: 1.5 }}>{plan.desc}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={12} style={{ color: s.check, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: isElite ? 700 : 600, color: isElite ? '#e4e4e7' : '#a1a1aa' }}>{f}</span>
                      </div>
                    ))}
                  </div>

                      <Link to="/register" style={{
                        display: 'block', width: '100%', padding: isElite ? '13px' : '11px',
                        textAlign: 'center', borderRadius: 12, fontSize: 9, fontWeight: 900,
                        textTransform: 'uppercase', letterSpacing: '0.15em', textDecoration: 'none',
                        transition: 'all 0.2s',
                        boxShadow: isElite ? '0 0 30px rgba(255,215,0,0.35)' : 'none',
                        ...s.btn,
                      }}
                        onMouseOver={e => { if (isElite) { e.currentTarget.style.boxShadow = '0 0 50px rgba(255,215,0,0.55)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                        onMouseOut={e => { if (isElite) { e.currentTarget.style.boxShadow = '0 0 30px rgba(255,215,0,0.35)'; e.currentTarget.style.transform = 'translateY(0)' } }}
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
      <section id="faq" style={{ padding: '96px 24px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(40px, 7vw, 80px)', color: '#fff', margin: 0 }}>
              PREGUNTAS FRECUENTES
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((item, i) => (
              <AnimationWrapper key={i} type="fadeUp" delay={i * 0.08}>
                <div style={{
                  borderRadius: 20, overflow: 'hidden',
                  border: activeFaq === i ? '1px solid rgba(255,215,0,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  background: activeFaq === i ? 'rgba(255,215,0,0.03)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s',
                }}>
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} style={{
                  width: '100%', padding: '24px 28px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16, background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, color: '#e4e4e7', letterSpacing: 0.5 }}>{item.q}</span>
                  <ChevronDown size={18} style={{ color: activeFaq === i ? '#FFD700' : '#52525b', transform: activeFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>
                {activeFaq === i && (
                  <div style={{ padding: '0 28px 24px', fontSize: 14, color: '#71717a', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
        <section style={{ padding: '80px 24px', textAlign: 'center', background: 'rgba(255,215,0,0.03)', borderTop: '1px solid rgba(255,215,0,0.1)', borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#FFD700', marginBottom: 16 }}>
              ⏱ Precio de Lanzamiento
            </p>
            <h2 style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 'clamp(32px, 6vw, 64px)', color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>
              No dejes tu polla para última hora.
            </h2>
            <p style={{ fontSize: 16, color: '#a1a1aa', lineHeight: 1.7, marginBottom: 36 }}>
              Configura tu liga hoy y asegura el precio de lanzamiento antes de que empiece el torneo.
            </p>
            <GlowEffect color="gold">
              <HoverScale scale={1.05}>
                <Link to="/register" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: '#FFD700', color: '#0A192F', padding: '16px 36px',
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
      <footer style={{ padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: 22, color: '#fff', letterSpacing: 2 }}>
          MUNDIAL<span style={{ color: '#FFD700' }}>PRO</span>
        </span>
        <p style={{ fontSize: 11, color: '#3f3f46', marginTop: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          © 2026 MundialPro · Hecho con ❤️ en Chile 🇨🇱
        </p>
      </footer>

    </div>
  )
}
