# 🎨 Setup Shadcn/UI + Framer Motion - Mundial 2026

## ✅ Configuración Completada

Tu proyecto ahora tiene todo listo para usar:

- ✅ **Framer Motion** v12.40.0 (animaciones)
- ✅ **shadcn/ui** (componentes premium)
- ✅ **Tailwind CSS** (estilos)
- ✅ **TypeScript** + Path aliases configurados
- ✅ **CLAUDE.md** (guías de diseño)

---

## 📦 Instalando Componentes

Ahora puedes instalar cualquier componente de shadcn que necesites:

```bash
# Botón
npx shadcn-ui@latest add button

# Cards
npx shadcn-ui@latest add card

# Dialog / Modal
npx shadcn-ui@latest add dialog

# Input
npx shadcn-ui@latest add input

# Tabs
npx shadcn-ui@latest add tabs

# Dropdown Menu
npx shadcn-ui@latest add dropdown-menu

# Avatar
npx shadcn-ui@latest add avatar
```

> **Nota**: Si da error de versión, usa `npx shadcn@4.7.0 add button`

---

## 🚀 Ejemplo: Crear un Button animado

### 1. Instala el componente
```bash
npx shadcn@4.7.0 add button
```

### 2. Úsalo en tu componente
```jsx
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function AnimatedButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Button 
        className="bg-mundial-gold hover:bg-mundial-red"
      >
        Haz tu Pronóstico
      </Button>
    </motion.div>
  );
}
```

---

## 🎬 Ejemplos Prácticos para Mundial

### Hero Section
```bash
npx shadcn@4.7.0 add button card
```

### Tabla de Posiciones
```bash
npx shadcn@4.7.0 add table card
```

### Panel de Predicciones
```bash
npx shadcn@4.7.0 add tabs card input button
```

---

## 🎯 Prompts Recomendados para Claude

Una vez tengas los componentes instalados:

```
Crea una sección Hero para Mundial 2026 con:
- Logo y título principal
- Descripción corta
- Botón CTA con animación Framer Motion
- Fondo con gradiente azul-rojo
- Responsive mobile-first
Usa los componentes de shadcn y Framer Motion
```

```
Mejora la tabla de posiciones con:
- Tabla con shadcn
- Animación al scroll
- Highlights en el equipo seleccionado
- Colores según CLAUDE.md
```

---

## 📁 Estructura Actual

```
src/
├── components/
│   ├── ui/          ← Componentes de shadcn (generados automáticamente)
│   ├── common/
│   └── sections/
├── lib/
│   └── utils.ts     ← Utilidades de shadcn
├── hooks/
├── pages/
├── styles/
└── App.jsx
```

---

## 🔧 Troubleshooting

### Si da error: "Could not find..."
```bash
npm install --legacy-peer-deps clsx tailwind-merge
```

### Si shadcn no funciona
```bash
# Usa versión anterior
npx shadcn@4.7.0 init -d
```

### Para resetear todo
```bash
rm -rf src/components/ui components.json
npx shadcn@4.7.0 init -d
```

---

## ✨ Next Steps

1. **Instala un componente** de prueba (ej: `button`, `card`)
2. **Crea un componente** que use Framer Motion + shadcn
3. **Lee los ejemplos** en la sección de Framer Motion en CLAUDE.md
4. **Pide a Claude** que mejore el diseño del proyecto

---

**Última actualización**: 2026-05-28
**Proyecto**: Mundial 2026 Frontend
