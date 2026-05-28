# 🎬 GUÍA VISUAL - DÓNDE ESTÁN LAS ANIMACIONES

## 📍 MAPA DE ANIMACIONES EN LA LANDING PAGE

```
┌─────────────────────────────────────────────────────────┐
│                    NAVBAR (Fixed)                        │
│              (Sin animación, navbar estático)            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   HERO SECTION                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ✨ Badge "Inscripciones abiertas"                      │
│     → fadeUp (entrada suave vertical)                    │
│     ⏱ delay: 0s, duration: 0.6s                         │
│                                                           │
│  🎯 Headline "La Polla del Mundial..."                  │
│     → slideLeft (entra desde la izquierda)             │
│     ⏱ delay: 0.1s, duration: 0.6s                      │
│     ✨ Efecto de profundidad con WebkitTextStroke      │
│                                                           │
│  📝 Descripción (párrafo)                               │
│     → fadeUp (entrada suave)                            │
│     ⏱ delay: 0.2s, duration: 0.6s                      │
│                                                           │
│  🔘 Botones (CTA + How it works)                        │
│     ├─ Container: scaleIn (zoom suave)                 │
│     ├─ Botón Crear Liga: GlowEffect (resplandor dorado) │
│     │   └─ HoverScale (eleva +5% al hover)             │
│     └─ Botón "Cómo funciona": HoverScale               │
│     ⏱ delay: 0.3s                                       │
│                                                           │
│  ⏰ Countdown (Días, Horas, Min, Seg)                   │
│     ├─ Container: scaleIn                              │
│     └─ Items: StaggerContainer                         │
│        → Cada item entra con 0.1s de separación         │
│        → Efecto waterfall/cascada                       │
│     ⏱ delay: 0.4s                                       │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              CÓMO FUNCIONA - 3 PASOS                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📦 Step Cards (Crea liga, Invita, Sigue mundial)      │
│     ├─ Cada card es un StaggerContainer child           │
│     ├─ Entra con fadeUp secuencial                     │
│     ├─ HoverScale: levanta -4px al hover              │
│     └─ Efecto cascada visual                           │
│     ⏱ Stagger delay: 0.1s entre items                  │
│                                                           │
│  [═══════════════════════════════════════════════════]  │
│     ↑ Línea conectora (solo desktop - decorativa)      │
│                                                           │
│  🔘 CTA "Empezar ahora"                                 │
│     → HoverScale para efecto hover                     │
│     ⏱ delay: 0.2s respecto al contenedor               │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            CARACTERÍSTICAS (6 Features)                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  🚀 Feature 1: CÁLCULO INSTANTÁNEO                     │
│     ├─ fadeUp + HoverScale                             │
│     └─ delay: 0s (en StaggerContainer)                 │
│                                                           │
│  🔒 Feature 2: LIGAS BLINDADAS                         │
│     ├─ fadeUp + HoverScale                             │
│     └─ delay: 0.1s                                      │
│                                                           │
│  🎯 Feature 3: REGLAS MAESTRAS                         │
│     ├─ fadeUp + HoverScale                             │
│     └─ delay: 0.2s                                      │
│                                                           │
│  👥 Feature 4: GESTIÓN EMPRESARIAL                     │
│     ├─ fadeUp + HoverScale                             │
│     └─ delay: 0.3s                                      │
│                                                           │
│  📱 Feature 5: MOBILE FIRST                            │
│     ├─ fadeUp + HoverScale                             │
│     └─ delay: 0.4s                                      │
│                                                           │
│  🏆 Feature 6: HISTORIAL DE GLORIA                     │
│     ├─ fadeUp + HoverScale                             │
│     └─ delay: 0.5s                                      │
│                                                           │
│  🎪 StaggerContainer distribuye entrada en cascada      │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   PLANES (4 planes)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ⭕ AMATEUR                                              │
│     ├─ scaleIn (zoom suave)                            │
│     ├─ HoverScale (1.02x)                              │
│     └─ delay: 0s                                        │
│                                                           │
│  ⭕ CAPITÁN                                              │
│     ├─ scaleIn                                          │
│     ├─ HoverScale (1.02x)                              │
│     └─ delay: 0.1s                                      │
│                                                           │
│  ⭕ DT                                                   │
│     ├─ scaleIn                                          │
│     ├─ HoverScale (1.02x)                              │
│     └─ delay: 0.2s                                      │
│                                                           │
│  ⭐ ELITE (Destacada)                                   │
│     ├─ scaleIn                                          │
│     ├─ GlowEffect (resplandor dorado animado)          │
│     ├─ HoverScale (1.04x - más grande)                │
│     └─ delay: 0.3s                                      │
│                                                           │
│  🎪 StaggerContainer distribuye entrada progresiva      │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    FAQ (4 preguntas)                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ❓ ¿Cómo creo una liga privada?                        │
│     ├─ fadeUp                                           │
│     └─ delay: 0s                                        │
│                                                           │
│  ❓ ¿Cómo se calculan los puntos?                       │
│     ├─ fadeUp                                           │
│     └─ delay: 0.08s                                     │
│                                                           │
│  ❓ ¿Puedo cambiar mi predicción?                       │
│     ├─ fadeUp                                           │
│     └─ delay: 0.16s                                     │
│                                                           │
│  ❓ ¿Qué métodos de pago aceptan?                       │
│     ├─ fadeUp                                           │
│     └─ delay: 0.24s                                     │
│                                                           │
│  🎪 StaggerContainer con delay 0.08s entre items       │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│          CIERRE / URGENCIA (Precio Lanzamiento)         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ⏱ Sección completa: fadeUp                            │
│     ├─ Título: "No dejes tu polla para última hora"   │
│     └─ Descripción: "Configura tu liga hoy..."         │
│                                                           │
│  🔘 Botón CTA                                           │
│     ├─ GlowEffect (resplandor dorado)                   │
│     ├─ HoverScale (eleva +5%)                          │
│     └─ Animación continua                              │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      FOOTER                              │
│              (Sin animación, estático)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎬 EFECTOS DETALLADOS POR TIPO

### 🔄 **AnimationWrapper**
Tipos de animación disponibles:

```
TYPE: "fadeUp" (por defecto)
  ├─ De: opacity 0, translateY +30px
  ├─ A: opacity 1, translateY 0
  └─ Efecto: Entrada desde abajo con fade

TYPE: "slideLeft"
  ├─ De: opacity 0, translateX -40px
  ├─ A: opacity 1, translateX 0
  └─ Efecto: Entra desde la izquierda

TYPE: "slideRight"
  ├─ De: opacity 0, translateX +40px
  ├─ A: opacity 1, translateX 0
  └─ Efecto: Entra desde la derecha

TYPE: "scaleIn"
  ├─ De: opacity 0, scale 0.9
  ├─ A: opacity 1, scale 1
  └─ Efecto: Zoom/escala suave

TYPE: "fadeIn"
  ├─ De: opacity 0
  ├─ A: opacity 1
  └─ Efecto: Solo desvanecimiento

TYPE: "bounce"
  ├─ De: opacity 0, translateY +40px
  ├─ A: opacity 1, translateY 0 (con spring)
  └─ Efecto: Entrada con rebote
```

---

### 📍 **HoverScale**
Efecto de elevación en interactividad:

```
ANTES (sin hover):
  scale: 1
  transform: translateY(0)

AL PASAR MOUSE:
  scale: 1.02 (o 1.05 en CTAs)
  transform: translateY(-2px)
  
Duración: 0.3s con spring physics
```

---

### 🌟 **StaggerContainer**
Distribución en cascada:

```
PRIMER ITEM:   entra en t=0ms
SEGUNDO ITEM:  entra en t=100ms
TERCER ITEM:   entra en t=200ms
CUARTO ITEM:   entra en t=300ms
...

Delay entre items: 0.05s a 0.15s (configurable)
Efecto visual: Cascada progresiva suave
```

---

### ✨ **GlowEffect**
Resplandor animado continuo:

```
COLOR: "gold"
  ├─ De: box-shadow 0 0 20px rgba(255,215,0,0.5)
  ├─ Centro: box-shadow 0 0 40px rgba(255,215,0,0.5)
  └─ Fin: box-shadow 0 0 20px rgba(255,215,0,0.5)
  
DURACIÓN: 2s (loop infinito)
EASING: easeInOut

Otros colores:
  "red" → rgba(227, 27, 35, 0.5)
  "blue" → rgba(26, 54, 93, 0.5)
```

---

## 🎨 ANIMACIONES CSS (enhancements.css)

Además de las animaciones React, hay keyframes CSS que potencian:

```css
@keyframes fadeInUp
  Entrada desde abajo con fade

@keyframes float
  Flotación continua arriba/abajo

@keyframes glow
  Resplandor pulsante en sombras

@keyframes pulse-gold
  Destello en badges dorados

@keyframes shimmer
  Efecto de brillo deslizante (futuro)
```

---

## ⏱️ TIMELINE TOTAL

Cuando el usuario entra a la Landing Page:

```
T = 0ms:     Badge comienza a entrar (fadeUp)
T = 100ms:   Headline comienza (slideLeft)
T = 200ms:   Descripción comienza (fadeUp)
T = 300ms:   Botones comienzan (scaleIn)
T = 400ms:   Countdown comienza (scaleIn) + items en cascada
             (cada item del countdown +100ms)

T = 1500ms:  Todo ha entrado completamente
T = ∞:       Efectos hover activados al mover mouse
```

---

## 🎮 INTERACTIVIDAD

### Al pasar mouse sobre elementos:

```
CARDS / FEATURES:
  scale +2% (1.02)
  translateY -4px
  border-color cambia a dorado
  
BOTONES:
  scale +5% (1.05)
  box-shadow intensifica
  
PLAN CARDS (ELITE):
  scale +4% (1.04)
  box-shadow resplandor dorado
  translateY -15px
```

---

## 📊 PERFORMANCE

**GPU-Accelerated Properties:**
- `transform` (scale, translateY, translateX)
- `opacity`

**Evitadas** (para mejor performance):
- Changes a `width`, `height`, `left`, `top`
- Repaint triggers
- Layout shifts

**Resultado:** 60 FPS en dispositivos modernos

---

## ♿ ACCESIBILIDAD

Todas las animaciones respetan:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

Si el usuario tiene activada la opción de "reducir movimiento" del SO, no hay animaciones.

---

**Última actualización:** 2026-05-28  
**Versión:** 1.0  
**Status:** ✅ Implementado y verificado
