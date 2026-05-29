# 🎨 Guía de Componentes - shadcn/ui + Framer Motion

Todos tus componentes están en `src/components/ui/`

---

## 📦 Componentes Instalados

### 1️⃣ Button
**Uso básico:**
```jsx
import { Button } from "@/components/ui/button";

<Button>Click aquí</Button>
<Button variant="outline">Outline</Button>
<Button size="lg">Grande</Button>
```

**Variantes:** `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
**Tamaños:** `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

---

### 2️⃣ Card
**Uso básico:**
```jsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    Contenido aquí
  </CardContent>
</Card>
```

**Ideal para:** Tarjetas de equipos, predicciones, estadísticas

---

### 3️⃣ Input
**Uso básico:**
```jsx
import { Input } from "@/components/ui/input";

<Input placeholder="Escribe aquí..." />
<Input type="number" placeholder="Ingresa un número..." />
<Input type="email" placeholder="correo@ejemplo.com" />
```

**Tipos soportados:** `text`, `email`, `password`, `number`, `date`, `file`, etc.

---

### 4️⃣ Tabs
**Uso básico:**
```jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Pestaña 1</TabsTrigger>
    <TabsTrigger value="tab2">Pestaña 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Contenido 1</TabsContent>
  <TabsContent value="tab2">Contenido 2</TabsContent>
</Tabs>
```

**Ideal para:** Grupos, equipos, predicciones por fase

---

### 5️⃣ Table
**Uso básico:**
```jsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Encabezado 1</TableHead>
      <TableHead>Encabezado 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Dato 1</TableCell>
      <TableCell>Dato 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Ideal para:** Tabla de posiciones, resultados, estadísticas

---

### 6️⃣ Dialog
**Uso básico:**
```jsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function MyDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Abrir Modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título del Modal</DialogTitle>
          <DialogDescription>Descripción aquí</DialogDescription>
        </DialogHeader>
        {/* Contenido aquí */}
      </DialogContent>
    </Dialog>
  );
}
```

**Ideal para:** Confirmaciones, formularios, detalles

---

## 🎬 Combinando con Framer Motion

### Card + Animación Hover
```jsx
import { motion } from "framer-motion";

<motion.div
  whileHover={{ scale: 1.05, y: -5 }}
  transition={{ duration: 0.3 }}
>
  <Card>
    {/* contenido */}
  </Card>
</motion.div>
```

### Table + Animación Row
```jsx
<motion.tr
  whileHover={{ backgroundColor: "rgba(255, 215, 0, 0.1)" }}
  className="hover:bg-mundial-gold/5"
>
  <TableCell>Dato</TableCell>
</motion.tr>
```

### Dialog + Animación
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
>
  <DialogContent>
    {/* contenido */}
  </DialogContent>
</motion.div>
```

---

## 🎨 Ejemplo Completo: ComponentsShowcase.jsx

He creado un archivo que muestra todos los componentes en acción:

```bash
# Para verlo, simplemente importa en tu App.jsx:
import ComponentsShowcase from '@/components/ComponentsShowcase';

export default function App() {
  return <ComponentsShowcase />;
}
```

---

## 🔧 Personalización con Tailwind

Usa clases de Tailwind para personalizar:

```jsx
{/* Button custom */}
<Button className="bg-mundial-gold text-mundial-navy hover:bg-mundial-red">
  Click
</Button>

{/* Card custom */}
<Card className="bg-mundial-navyLight border-mundial-gold">
  Contenido
</Card>

{/* Input custom */}
<Input className="bg-mundial-navy border-mundial-gold text-white" />
```

---

## 💡 Prompts Útiles para Claude

```
"Crea un formulario de predicciones con:
- Card como contenedor
- Input para nombre del equipo
- Input número para pronóstico
- Button para enviar
- Animación Framer Motion en la entrada
- Colores según CLAUDE.md"
```

```
"Mejora la tabla de posiciones:
- Usa el componente Table de shadcn
- Agrega animación hover en filas
- Colores personalizados (oro, azul, rojo)
- Haz que sea responsive"
```

```
"Crea un modal de confirmación con:
- Dialog de shadcn
- Mensaje de confirmación
- Botones confirmar/cancelar
- Animación suave"
```

---

## 🚀 Próximos Pasos

1. ✅ Instala más componentes si necesitas:
   ```bash
   npx shadcn@4.7.0 add dropdown-menu
   npx shadcn@4.7.0 add select
   npx shadcn@4.7.0 add textarea
   npx shadcn@4.7.0 add checkbox
   ```

2. ✅ Personaliza los componentes con Tailwind
3. ✅ Combina con Framer Motion para animaciones
4. ✅ Pide a Claude que mejore el diseño

---

**Última actualización**: 2026-05-28
**Proyecto**: Mundial 2026 Frontend
