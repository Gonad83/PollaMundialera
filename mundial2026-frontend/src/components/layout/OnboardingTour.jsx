import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, HelpCircle, X, ChevronRight, ChevronLeft, Target, Star, Users } from 'lucide-react'

export default function OnboardingTour({ 
  group, 
  user,
  activeTab, 
  setActiveTab, 
  matchParam, 
  setSearchParams,
  predictionsCount,
  startTour,
  setStartTour
}) {
  const [step, setStep] = useState(0) // 0: inactive, 1: welcome, 2: resultados tab, 3: UCL banner, 4: score inputs, 5: ranking tab, 6: invite code
  const [coords, setCoords] = useState(null)

  const tourKey = useMemo(() => {
    return `has_seen_onboarding_tour_${user?.id || 'guest'}`
  }, [user])

  // Iniciar tour si no se ha visto nunca — esperar a que user.id esté cargado
  useEffect(() => {
    if (!group || !user?.id) return
    const hasSeenTour = localStorage.getItem(tourKey)
    if (!hasSeenTour) {
      const t = setTimeout(() => setStep(1), 1200)
      return () => clearTimeout(t)
    }
  }, [group, user?.id, tourKey])

  // Trigger manual del tour
  useEffect(() => {
    if (startTour) {
      setStep(1)
      setStartTour(false)
    }
  }, [startTour, setStartTour])

  // Configuración de los pasos del tour
  const stepsConfig = useMemo(() => [
    {
      target: null, // Centro
      title: "🏆 ¡Bienvenido a tu Liga Privada!",
      content: "Esta es tu liga exclusiva. Aquí competirás con tus amigos para ver quién es el rey de los pronósticos futbolísticos. Vamos a tomar un paseo de 1 minuto para aprender cómo jugar.",
      btnText: "Iniciar Paseo",
    },
    {
      target: "#tour-tab-resultados",
      title: "📅 Encuentros y Apuestas",
      content: "En la pestaña 'Resultados' verás el fixture de partidos. Aquí es donde registrarás tus pronósticos antes del pitazo inicial. ¡Asegúrate de no llegar tarde!",
      btnText: "Entendido",
      action: () => setActiveTab('resultados'),
    },
    {
      target: "#tour-champions-banner",
      title: "⚡ ¡Pronostica tu primer partido!",
      content: "Vamos a probar el sistema. Haz clic en el botón 'Pronosticar Resultado' de la gran Final de la Champions League para ingresar tu apuesta interactiva.",
      btnText: "Haz clic en el botón...",
      action: () => setActiveTab('resultados'),
      requireAction: true, // Bloquea avance manual; requiere clic real del usuario
    },
    {
      target: "#tour-score-inputs",
      title: "⚽ Ingresa tu Marcador",
      content: "Ingresa los goles para cada equipo y selecciona las opciones bonus (como si marcan ambos o el total de goles) para ganar puntos adicionales. ¡Luego confirma tu pronóstico!",
      btnText: "Confirma tu pronóstico...",
      requireAction: true,
    },
    {
      target: "#tour-tab-ranking",
      title: "📊 Tabla de Posiciones",
      content: "¡Excelente! A medida que los partidos terminen, sumarás puntos. En la pestaña 'Ranking' podrás seguir el standing en tiempo real y ver quién lidera el grupo.",
      btnText: "Siguiente",
      action: () => setActiveTab('ranking'),
    },
    {
      target: "#tour-invite-code",
      title: "👥 Comparte tu Liga",
      content: "Para que empiece la emoción, comparte tu código de invitación único con tus amigos por WhatsApp. ¡Que empiece el juego!",
      btnText: "¡Terminar y Jugar!",
    }
  ], [setActiveTab])

  const currentStepConfig = stepsConfig[step - 1]

  // Detectar automáticamente el avance interactivo de pasos
  useEffect(() => {
    if (step === 3 && matchParam) {
      // Si el usuario hace clic en el partido y abre el modal, avanzamos al paso 4
      setStep(4)
    }
  }, [step, matchParam])

  useEffect(() => {
    if (step === 4 && predictionsCount > 0) {
      // Si el usuario guarda el pronóstico y el count de predicciones sube, avanzamos al paso 5
      // y cerramos el modal de partido
      setSearchParams({})
      setStep(5)
    }
  }, [step, predictionsCount, setSearchParams])

  // Calcular las coordenadas del elemento objetivo
  useEffect(() => {
    if (!currentStepConfig?.target) {
      setCoords(null)
      return
    }

    const updateCoords = () => {
      const element = document.querySelector(currentStepConfig.target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        })
      } else {
        setCoords(null)
      }
    }

    // Pequeño timeout para dar tiempo a que cambie la pestaña en el DOM
    const t = setTimeout(updateCoords, 150)

    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords)
    }
  }, [step, currentStepConfig, activeTab, matchParam])

  const handleNext = () => {
    if (currentStepConfig?.requireAction) return

    if (step < stepsConfig.length) {
      const nextStepConfig = stepsConfig[step]
      if (nextStepConfig.action) {
        nextStepConfig.action()
      }
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (step > 1) {
      const prevStepConfig = stepsConfig[step - 2]
      if (prevStepConfig.action) {
        prevStepConfig.action()
      }
      setStep(step - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(tourKey, 'true')
    setStep(0)
  }

  if (step === 0) return null

  // Tooltip siempre fijo en esquina inferior derecha — más visible y sin colisiones
  const tooltipStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 110,
    width: '320px',
    maxWidth: 'calc(100vw - 32px)',
  }

  // Dimensiones de la pantalla para los paneles oscuros del spotlight
  const scrollY = window.scrollY
  const innerWidth = window.innerWidth
  const innerHeight = window.innerHeight

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 99 }}>
      {/* ── SPOTLIGHT OVERLAYS (Bloquean clics fuera, permiten clics dentro del objetivo) ── */}
      {coords && (
        <div className="fixed inset-0 pointer-events-auto" style={{ zIndex: 100 }}>
          {/* Panel Superior */}
          <div 
            className="fixed bg-black/50" 
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, coords.top - scrollY) }} 
          />
          {/* Panel Inferior */}
          <div 
            className="fixed bg-black/50" 
            style={{ top: coords.top - scrollY + coords.height, left: 0, right: 0, bottom: 0 }} 
          />
          {/* Panel Izquierdo */}
          <div 
            className="fixed bg-black/50" 
            style={{ 
              top: Math.max(0, coords.top - scrollY), 
              height: coords.height, 
              left: 0, 
              width: Math.max(0, coords.left) 
            }} 
          />
          {/* Panel Derecho */}
          <div 
            className="fixed bg-black/50" 
            style={{ 
              top: Math.max(0, coords.top - scrollY), 
              height: coords.height, 
              left: coords.left + coords.width, 
              right: 0 
            }} 
          />

          {/* Marco del recorte dorado */}
          <div
            className="absolute rounded-2xl border-2 border-mundial-gold shadow-[0_0_20px_rgba(255,215,0,0.5)] transition-all duration-300 pointer-events-none"
            style={{
              top: coords.top - 8,
              left: coords.left - 8,
              width: coords.width + 16,
              height: coords.height + 16,
            }}
          />
        </div>
      )}

      {/* ── BACKDROP DE BIENVENIDA (Paso 1 completo) ── */}
      {!coords && step === 1 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" style={{ zIndex: 100 }} />
      )}

      {/* ── TOOLTIP CARD DE INSTRUCCIONES ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: coords ? 10 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: coords ? 10 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={tooltipStyle}
          className="card-hover p-6 bg-mundial-navyLight border border-mundial-gold/30 shadow-[0_15px_40px_rgba(0,0,0,0.5)] pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-mundial-gold uppercase tracking-widest bg-mundial-gold/10 px-2.5 py-1 rounded-full border border-mundial-gold/20 flex items-center gap-1">
              <HelpCircle size={10} /> GUÍA INTERACTIVA
            </span>
            <button 
              onClick={handleComplete} 
              className="text-zinc-500 hover:text-white transition-colors"
              title="Omitir guía"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <h3 className="font-display text-lg text-white uppercase tracking-tight mb-2">
            {currentStepConfig?.title}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-bold mb-6">
            {currentStepConfig?.content}
          </p>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-4">
            {/* Step indicator */}
            <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">
              Paso {step} de {stepsConfig.length}
            </span>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {step > 1 && !currentStepConfig?.requireAction && (
                <button
                  onClick={handlePrev}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:bg-white/10"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              
              {currentStepConfig?.requireAction ? (
                <span className="px-4 py-2.5 bg-mundial-gold/10 border border-mundial-gold/25 rounded-xl flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-mundial-gold rounded-full" />
                  <span className="text-[8px] text-mundial-gold font-black uppercase tracking-wider">
                    {currentStepConfig.btnText}
                  </span>
                </span>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 bg-mundial-gold text-mundial-navy rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-mundial-gold/10"
                >
                  {currentStepConfig?.btnText} <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
