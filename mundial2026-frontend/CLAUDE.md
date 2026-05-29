# UI/UX Guidelines - Mundial 2026 Frontend

## 🎨 Filosofía de Diseño
- Diseño moderno, premium, a nivel agencia
- Layouts limpios con espacios en blanco generosos
- Animaciones suaves con Framer Motion en todos los elementos clave
- Diseño mobile-first responsive
- Tema de colores energético: azul, rojo, dorado (colores de fútbol)
- Experiencia inmersiva para torneo de fútbol

## 🛠️ Stack Tecnológico
- **React** + **Vite** + **TypeScript**
- **Tailwind CSS** para estilos
- **Framer Motion** para animaciones
- Componentes reutilizables en `/src/components`

## 📋 Reglas de Componentes

### Animaciones Obligatorias
- **Entrada**: fade-in + slide-up (300ms)
- **Scroll**: elementos animan al scroll (scroll-triggered)
- **Hover**: todos los botones e interactivos tienen efecto hover suave
- **Transiciones**: use `transition` de Framer Motion, nunca CSS puro

### Tipografía
- **Headlines**: Google Font "Geist" o "DM Sans" (bold, 2xl-4xl)
- **Body**: "Inter" o "Roboto" (regular, base-lg)
- **Buttons**: Uppercase, weight 600, tamaño 14px

### Colores
Definir en `src/styles/globals.css`:
```css
:root {
  --primary: #1e40af; /* Azul fútbol */
  --secondary: #dc2626; /* Rojo intenso */
  --accent: #f59e0b; /* Dorado */
  --dark: #0f172a;
  --light: #f8fafc;
}
```

### Espaciado (Tailwind)
- Usar escala 4px: 4, 8, 12, 16, 24, 32, 48, 64
- Padding: `p-4`, `p-6`, `p-8`
- Margin: `m-4`, `m-6`, `m-8`
- Gaps: `gap-4`, `gap-6`, `gap-8`

### Componentes UI
- Bordes redondeados: `rounded-lg` (8px) como estándar
- Shadows: `shadow-lg` para depth, `shadow-xl` para énfasis
- Backdrop blur: `backdrop-blur-md` en modales/navbars
- Opacity para overlays: `bg-black/50`, `bg-white/20`

## 📱 Breakpoints Responsive
```
sm: 640px   (mobile)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large)
2xl: 1536px (ultra-wide)
```

## 🎬 Ejemplos de Animaciones con Framer Motion

### Fade In + Slide Up
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Contenido aquí
</motion.div>
```

### Scroll Trigger
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  whileInView={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.6 }}
  viewport={{ once: false, amount: 0.2 }}
>
  Contenido al scroll
</motion.div>
```

### Hover Effect
```jsx
<motion.button
  whileHover={{ scale: 1.05, y: -2 }}
  whileTap={{ scale: 0.95 }}
>
  Click aquí
</motion.button>
```

## 🏗️ Estructura de Carpetas
```
src/
├── components/
│   ├── common/        (Navbar, Footer, etc.)
│   ├── sections/      (Hero, Features, Teams, etc.)
│   ├── ui/           (Buttons, Cards, Inputs)
│   └── animations/   (Componentes reutilizables con Framer Motion)
├── pages/
├── styles/
│   └── globals.css
├── utils/
└── App.jsx
```

## ✨ Checklist Antes de Implementar
- [ ] ¿Tiene animación de entrada (fade-in)?
- [ ] ¿Responsive en mobile, tablet y desktop?
- [ ] ¿Colores usan variables CSS definidas?
- [ ] ¿Espaciado sigue la escala 4px?
- [ ] ¿Tiene hover effects en elementos interactivos?
- [ ] ¿Accesibilidad considerada (alt text, aria labels)?
- [ ] ¿Rendimiento optimizado (lazy load si aplica)?

## 🚀 Prompts Recomendados para Claude

```
"Crea un [COMPONENTE] con:
- Animación de entrada fade-in + slide-up
- Responsive mobile-first
- Hover effects suaves
- Sigue las guías de colores en CLAUDE.md
- Usa Framer Motion para animaciones"
```

---

**Última actualización**: 2026-05-28
**Proyecto**: Mundial 2026 Frontend
**Stack**: Vite + React + Tailwind + Framer Motion
