# ⚡ QUICK REFERENCE - ANIMATION COMPONENTS

## 🚀 IMPORT RÁPIDO

```jsx
import {
  AnimationWrapper,
  HoverScale,
  StaggerContainer,
  FloatingElement,
  PulseElement,
  GlowEffect,
  CountUp
} from '@/components/AnimationWrapper'
```

---

## 📋 COMPONENTES Y USOS

### 1️⃣ **AnimationWrapper**
Anima elementos al entrar en viewport.

```jsx
// Básico
<AnimationWrapper type="fadeUp">
  <h1>Título</h1>
</AnimationWrapper>

// Con delay
<AnimationWrapper type="slideLeft" delay={0.2}>
  <p>Descripción</p>
</AnimationWrapper>

// Con duración personalizada
<AnimationWrapper type="scaleIn" duration={1} delay={0.3}>
  <button>Botón</button>
</AnimationWrapper>

// Tipos disponibles:
// - "fadeUp" (por defecto)
// - "fadeIn"
// - "slideLeft"
// - "slideRight"
// - "scaleIn"
// - "bounce"
```

**Props:**
- `type`: string (fadeUp, slideLeft, slideRight, scaleIn, fadeIn, bounce)
- `delay`: number (segundos, default: 0)
- `duration`: number (segundos, default: 0.6)
- `className`: string (clases Tailwind adicionales)
- `children`: ReactNode

---

### 2️⃣ **HoverScale**
Efecto de elevación al pasar mouse.

```jsx
// Básico
<HoverScale>
  <div className="card">Card content</div>
</HoverScale>

// Escala personalizada
<HoverScale scale={1.1}>
  <img src="image.jpg" alt="Image" />
</HoverScale>

// En botones
<HoverScale scale={1.05}>
  <button className="btn-primary">Click me</button>
</HoverScale>
```

**Props:**
- `scale`: number (default: 1.05)
- `children`: ReactNode
- `className`: string

---

### 3️⃣ **StaggerContainer**
Anima múltiples items con delays escalonados.

```jsx
// Básico - automático
<StaggerContainer delay={0.1}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</StaggerContainer>

// Con map y keys
<StaggerContainer delay={0.08}>
  {features.map(f => (
    <AnimationWrapper key={f.id} type="fadeUp">
      <div className="feature-card">{f.title}</div>
    </AnimationWrapper>
  ))}
</StaggerContainer>

// Delay más rápido
<StaggerContainer delay={0.05}>
  {/* Items cada 0.05s */}
</StaggerContainer>
```

**Props:**
- `delay`: number (segundos entre items, default: 0.05)
- `children`: ReactNode o array

---

### 4️⃣ **FloatingElement**
Flotación continua arriba/abajo.

```jsx
// Básico
<FloatingElement>
  <div className="icon">🏆</div>
</FloatingElement>

// Duración personalizada
<FloatingElement duration={4}>
  <img src="trophy.svg" alt="Trophy" />
</FloatingElement>

// Con clases
<FloatingElement duration={3} className="absolute top-10 right-10">
  <Sparkles className="w-12 h-12 text-gold-400" />
</FloatingElement>
```

**Props:**
- `duration`: number (segundos, default: 3)
- `className`: string
- `children`: ReactNode

---

### 5️⃣ **PulseElement**
Destello/parpadeo de opacidad.

```jsx
// Básico
<PulseElement>
  <div className="badge-gold">Ofertas!</div>
</PulseElement>

// Con clases
<PulseElement className="inline-block">
  <span className="text-red-500 font-bold">LIVE</span>
</PulseElement>

// En notificaciones
<PulseElement>
  <div className="px-3 py-2 bg-red-500/20 rounded-lg">
    Nuevo mensaje
  </div>
</PulseElement>
```

**Props:**
- `className`: string
- `children`: ReactNode

---

### 6️⃣ **GlowEffect**
Resplandor animado continuo.

```jsx
// Dorado (default)
<GlowEffect>
  <button className="btn-gold">Elite</button>
</GlowEffect>

// Color rojo
<GlowEffect color="red">
  <div className="alert">Alert</div>
</GlowEffect>

// Color azul
<GlowEffect color="blue">
  <div className="info-box">Info</div>
</GlowEffect>

// Combinado con otros
<GlowEffect color="gold">
  <HoverScale scale={1.05}>
    <button className="btn">Click</button>
  </HoverScale>
</GlowEffect>
```

**Props:**
- `color`: "gold" | "red" | "blue" (default: "gold")
- `className`: string
- `children`: ReactNode

---

### 7️⃣ **CountUp**
Contador animado (próximamente con valores dinámicos).

```jsx
// Básico
<CountUp target={100} duration={2}>
</CountUp>

// Personalizado
<CountUp target={50} duration={1.5} className="text-3xl font-bold">
</CountUp>
```

**Props:**
- `target`: number (valor final)
- `duration`: number (segundos)
- `className`: string

---

## 🎯 PATRONES COMUNES

### Pattern 1: Hero Section
```jsx
<section>
  <AnimationWrapper type="slideLeft">
    <h1>Title</h1>
  </AnimationWrapper>
  
  <AnimationWrapper type="fadeUp" delay={0.1}>
    <p>Subtitle</p>
  </AnimationWrapper>
  
  <AnimationWrapper type="scaleIn" delay={0.2}>
    <button>CTA</button>
  </AnimationWrapper>
</section>
```

### Pattern 2: Grid de Features
```jsx
<StaggerContainer delay={0.1}>
  {features.map((f, idx) => (
    <AnimationWrapper key={f.id} type="fadeUp">
      <HoverScale scale={1.02}>
        <div className="feature-card">
          {f.title}
        </div>
      </HoverScale>
    </AnimationWrapper>
  ))}
</StaggerContainer>
```

### Pattern 3: Cards con Glow
```jsx
<AnimationWrapper type="scaleIn" delay={idx * 0.1}>
  <GlowEffect color={isElite ? "gold" : "blue"}>
    <HoverScale scale={isElite ? 1.04 : 1.02}>
      <div className="plan-card">
        {plan.name}
      </div>
    </HoverScale>
  </GlowEffect>
</AnimationWrapper>
```

### Pattern 4: FAQ Accordion
```jsx
<StaggerContainer delay={0.08}>
  {faqs.map((faq, i) => (
    <AnimationWrapper key={i} type="fadeUp">
      <div className="faq-item">
        {/* FAQ content */}
      </div>
    </AnimationWrapper>
  ))}
</StaggerContainer>
```

---

## 🎨 COMBINACIONES RECOMENDADAS

| Caso | Componentes | Delay | Scale |
|---|---|---|---|
| Hero Title | AnimationWrapper(slideLeft) | 0 | - |
| Hero Description | AnimationWrapper(fadeUp) | 0.1s | - |
| CTA Button | AnimationWrapper(scaleIn) + HoverScale | 0.2s | 1.05 |
| Feature List | StaggerContainer + AnimationWrapper(fadeUp) | var | - |
| Plan Cards | AnimationWrapper(scaleIn) + HoverScale + GlowEffect | var | 1.02-1.04 |
| Icon | FloatingElement | - | - |
| Badge | PulseElement | - | - |
| Highlight | GlowEffect | - | - |

---

## ⏱️ GUÍA DE DELAYS

```
Entrada rápida:    0s
Entrada normal:    0.1s - 0.2s
Entrada escalonada: 0.05s - 0.15s entre items
Entrada lenta:     0.3s - 0.5s

Recomendación: Para cascadas, usa 0.08s - 0.1s
```

---

## 🔧 PERSONALIZACIÓN

### Cambiar duración global:
```jsx
<AnimationWrapper type="fadeUp" duration={1.5}>
  {/* Más lento */}
</AnimationWrapper>
```

### Escala de HoverScale:
```jsx
// Suave
<HoverScale scale={1.01}> {/* +1% */}

// Normal
<HoverScale scale={1.05}> {/* +5% */}

// Agresiva
<HoverScale scale={1.15}> {/* +15% */}
```

### Colores de GlowEffect:
```jsx
// En enhancements.css, edita:
--grad-gold: linear-gradient(...)
--grad-red: linear-gradient(...)
--grad-blue: linear-gradient(...)
```

---

## 📱 RESPONSIVE

Todos los componentes son responsive automáticamente. Si necesitas desabilitar en mobile:

```jsx
import { useMediaQuery } from 'react-responsive'

export function MyComponent() {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' })
  
  return (
    <AnimationWrapper type={isMobile ? "fadeIn" : "slideLeft"}>
      {/* Animación diferente en mobile */}
    </AnimationWrapper>
  )
}
```

---

## ♿ ACCESIBILIDAD

Automáticamente respeta `prefers-reduced-motion`:

```jsx
// Si el usuario tiene "Reducir movimiento" activado,
// AnimationWrapper mostrará el contenido sin animación

// Si necesitas lógica personalizada:
import { useReducedMotion } from 'framer-motion'

export function MyComponent() {
  const shouldReduce = useReducedMotion()
  
  return (
    <AnimationWrapper 
      duration={shouldReduce ? 0 : 0.6}
    >
      Content
    </AnimationWrapper>
  )
}
```

---

## 🐛 TROUBLESHOOTING

### "Animación no aparece"
✅ Verifica que el elemento entra en viewport  
✅ Usa `triggerOnce={false}` en desarrollador para debugging  
✅ Abre DevTools → Inspect → verifica que el elemento existe  

### "Performance lenta"
✅ Usa `transform` y `opacity` (GPU-accelerated)  
✅ Evita animar `width`, `height`, `left`, `top`  
✅ Limita el número de StaggerContainers en pantalla  

### "Animación dura / no smooth"
✅ Aumenta `duration`  
✅ Usa `ease: 'easeOut'` en lugar de lineal  
✅ Verifica que no hay conflictos CSS  

### "GlowEffect no se ve"
✅ Verifica que el color está configurado: `color="gold"`  
✅ El elemento debe estar visible (no hidden)  
✅ En mobile, reduce la intensidad si es necesario  

---

## 📚 RECURSOS

- **Documentación Framer Motion:** https://www.framer.com/motion/
- **React Intersection Observer:** https://www.npmjs.com/package/react-intersection-observer
- **Tailwind CSS:** https://tailwindcss.com
- **Proyecto local:** `/src/components/AnimationWrapper.jsx`

---

**Última actualización:** 2026-05-28  
**Versión:** 1.0  
**Autor:** Claude + Vibe Coding Team  

💡 **Tip:** Abre este archivo desde VS Code para acceder rápidamente a los ejemplos.
