# PROMPT: Auditoría y Rediseño de Arquitectura UX — "Quién Gana" (Polla Mundial 2026)

---

## TU ROL

Eres un **Arquitecto Senior de Producto SaaS** con 15 años de experiencia diseñando web apps B2C y SaaS para mercados hispanos. Has lanzado productos como plataformas de fantasy sports, pollas deportivas y apps de predicción con bases de +100k usuarios. Tu expertise cubre:

- **Information Architecture (IA)** para apps con múltiples tipos de usuario (free vs paid)
- **User Flow Design** y reducción de fricción en onboarding
- **Navigation Design** para apps mobile-first con BottomNav
- **SaaS Freemium UX** — cómo mostrar límites de plan sin frustrar al usuario
- **Feature Discoverability** — que el usuario encuentre las funciones clave en ≤3 clics

---

## CONTEXTO DEL PROYECTO

### Stack tecnológico
- **Frontend:** React + Vite + TailwindCSS + React Router + Framer Motion
- **Backend:** Node.js + Express + Prisma ORM
- **Real-time:** Socket.io
- **Pagos:** Mercado Pago
- **Deploy:** Railway + Docker

### Páginas existentes (rutas actuales)

**Públicas:**
- `/` → `LandingPage` — Página de marketing
- `/login` → `LoginPage`
- `/register` → `RegisterPage`
- `/forgot-password` → `ForgotPasswordPage`
- `/join/:token` → `JoinPage` — Unirse a grupo por link de invitación

**App (con Layout + BottomNav):**
- `/welcome` → `WelcomePage` — Onboarding: elegir plan o crear grupo (FUERA del Layout)
- `/matches` → `MatchesPage` — Lista de partidos + pronósticos
- `/matches/:id` → `MatchDetailPage` — Detalle de partido
- `/tournament` → `TournamentPage` — Pronósticos del torneo (campeón, goleador, etc.)
- `/leaderboard` → `LeaderboardPage` — Ranking general
- `/groups` → `GroupsPage` — Gestor de grupos/ligas
- `/groups/:id` → `GroupDetailPage` — Detalle del grupo
- `/profile/:id` → `ProfilePage` — Perfil de usuario
- `/simulator` → `SimulatorPage` — Simulador de bracket del torneo
- `/rules` → `RulesPage` — Reglas del juego
- `/payment-success` → `PaymentSuccessPage`
- `/admin` → `AdminPage` (solo SUPER_ADMIN)

### Planes de usuario (Freemium SaaS)
| Plan | Precio | Grupos | Miembros/grupo |
|------|--------|--------|----------------|
| FREE (Amateur) | Gratis | 1 | 5 |
| CLASICO (Capitán) | $2.990 | 1 | 15 |
| DT | $4.990 | 3 | 15 |
| PRO (Elite) | $9.990 | Ilimitados | 150 |

### Lógica de restricción actual
- Usuario FREE sin grupos → **solo puede ver `/groups` y `/rules`**
- La app lo redirige a `/groups` si intenta acceder a cualquier otra ruta
- Una vez que pertenece a un grupo → accede a todo el contenido

### Navegación actual

**Header Desktop (sticky):**
- Logo → link a `/matches` (o `/groups` si está restringido)
- Nav pills: `Grupos` | `Reglas` *(solo estos dos en el nav principal)*
- Badge de plan FREE con botón "Subir"
- Avatar/username + puntos + badge plan
- Botón Admin (solo SUPER_ADMIN)
- Botón Logout

**BottomNav Mobile (fixed bottom):**
- Items: `Grupos` | `Reglas` (+ dot animado en Simulador cuando aplica)
- Botón Admin (solo ADMIN)

**Rutas NO en el nav principal** (solo accesibles desde dentro):
- `/matches` y `/matches/:id` — acceso desde GroupDetailPage
- `/tournament` — acceso desde GroupDetailPage
- `/leaderboard` — acceso desde GroupDetailPage
- `/simulator` — acceso desde GroupDetailPage (con dot indicator)
- `/profile/:id` — acceso desde avatar en header

### Problema central descrito por el producto owner
> *"Siento que la estructura está muy enredada. Quiero simplificarla y mejorarla. El flujo debería ser: login con cuenta gratis → crear grupo de la polla mundialista → hacer pronósticos de resultados de partidos → hacer pronósticos del torneo → adecuar dónde van los botones de simulación, etc."*

---

## SÍNTOMAS DETECTADOS (para tu análisis)

1. **Nav fragmentado:** El menú principal tiene solo 2 ítems (`Grupos` y `Reglas`), pero hay 6+ secciones activas en la app. El usuario no sabe que existen `/matches`, `/tournament`, `/leaderboard`, `/simulator` hasta que entra a un grupo.

2. **Duplicidad de flujo de onboarding:** Existe `WelcomePage` para onboarding (fuera del Layout) Y `GroupsPage` que también tiene formularios de "crear/unirse a grupo". Dos caminos para lo mismo.

3. **Simulador huérfano:** `/simulator` está en el código del BottomNav como un ítem con dot dorado, pero en el `MAIN_NAV` definido en `Layout.jsx` solo están `Grupos` y `Reglas`. El simulador aparece y desaparece según el contexto.

4. **Restricción por plan mal comunicada:** El usuario FREE solo ve `Grupos` y `Reglas` hasta tener un grupo, pero esto nunca se explica visualmente. La redirección silenciosa a `/groups` puede confundir.

5. **Header compacto en /groups:** La página de grupos tiene un banner hero gigante (7xl) que duplica información del header. El header ya muestra username + plan badge, y el banner repite eso.

6. **TournamentPage y MatchesPage reciben `groupId` como prop** pero se usan como rutas independientes `/tournament` y `/matches`, lo que genera inconsistencia: si el usuario pertenece a múltiples grupos, ¿qué grupo aplica?

7. **Layout.jsx tiene lógica de negocio pesada:** Maneja la restricción de rutas, el banner dinámico según pathname, la notificación global via Socket, el plan badge, el countdown timer, y la navegación. Es un componente dios.

8. **WelcomePage muestra planes de precio** (su función principal parece ser monetización) pero está nombrada "Welcome", lo que confunde su propósito.

---

## LO QUE NECESITO QUE HAGAS

### 1. DIAGNÓSTICO ARQUITECTÓNICO
Analiza los problemas anteriores y cualquier otro que detectes. Prioriza por impacto en la experiencia del usuario y en la conversión free→paid. Para cada problema indica:
- **Gravedad:** Alta / Media / Baja
- **Impacto en UX:** Descripción concreta
- **Impacto en negocio (SaaS):** Cómo afecta conversión o retención

### 2. USER JOURNEY IDEAL (rediseñado)
Define el flujo completo paso a paso para estos 3 usuarios:

**Usuario A — Nuevo usuario FREE:**
Llega a la landing → se registra → su primer destino → crea un grupo → hace sus primeros pronósticos (partido) → hace pronósticos del torneo → descubre el simulador

**Usuario B — Miembro de grupo (invitado):**
Recibe link `/join/:token` → se registra → llega a su primer destino → hace pronósticos

**Usuario C — Usuario con plan PRO, múltiples grupos:**
Login → su destino principal → cómo navega entre sus grupos → cómo ve el ranking por grupo

### 3. NUEVA ARQUITECTURA DE NAVEGACIÓN
Propón una estructura de navegación clara. Para cada nivel define:

**Nivel 1 — Nav principal (siempre visible)**
¿Qué ítems van aquí? ¿Desktop y mobile iguales o diferentes?

**Nivel 2 — Nav contextual (dentro de una sección)**
Por ejemplo, dentro de un grupo: tabs de Partidos | Torneo | Ranking | Miembros

**Nivel 3 — Acciones secundarias**
Simulador, Reglas, Perfil — ¿dónde viven?

Considera:
- Mobile-first con BottomNav de máximo 5 ítems
- El simulador tiene valor viral (se puede compartir) — ¿debería ser más accesible?
- Las Reglas son de consulta ocasional — ¿necesita estar en el nav principal?

### 4. REDISEÑO DEL FLUJO DE ONBOARDING
El onboarding actual tiene fricción. Propón:
- Qué pantalla/modal/flow ver después del login por primera vez
- Cómo unificar `WelcomePage` y `GroupsPage` (o si deben seguir separadas)
- Cómo comunicar las limitaciones del plan FREE sin frustrar al usuario
- El CTA de "Crear mi primer grupo" — ¿dónde y cómo presentarlo?

### 5. ARQUITECTURA DE COMPONENTES (refactoring)
Identifica qué sacar de `Layout.jsx` y cómo reorganizar:
- ¿Qué lógica pertenece a un `AuthGuard` o `RouteGuard` separado?
- ¿Cómo manejar el `groupId` context para que `MatchesPage` y `TournamentPage` sepan a qué grupo pertenecen?
- ¿El Banner dinámico (hero/compacto) debería ser responsabilidad del Layout o de cada Page?

### 6. QUICK WINS (implementación inmediata)
Lista 5 cambios que se pueden hacer en ≤ 2 horas cada uno y que tendrán el mayor impacto visual/UX inmediato.

---

## RESTRICCIONES Y PREFERENCIAS

- **Mantener el stack actual:** No cambiar React, TailwindCSS, React Router
- **Mobile-first:** La mayoría de usuarios acceden desde celular
- **Sin rediseño visual total:** Los estilos (`mundial-gold`, `mundial-navy`, etc.) se mantienen — solo reorganizar estructura
- **Simplicidad sobre features:** Prefiero quitar complejidad antes que agregar pantallas nuevas
- **El simulador es una feature premium/viral** — debe tener visibilidad pero no ocupar el nav principal si no aporta conversión directa
- **Los pronósticos son el core del producto** — deben estar a 1 clic desde cualquier pantalla

---

## FORMATO DE RESPUESTA ESPERADO

Responde en secciones numeradas (1 al 6) con claridad. Usa tablas para comparar opciones cuando haya trade-offs. Cuando propongas código o estructura de rutas, usa bloques de código. Sé directo y opinionado — no quiero "podría ser X o Y", quiero "recomiendo X porque...".

Al final, incluye un **Roadmap de implementación** con fases ordenadas por prioridad:
- **Fase 1 (Urgente — esta semana):** Quick wins
- **Fase 2 (Importante — próximas 2 semanas):** Refactoring de navegación y onboarding  
- **Fase 3 (Mejora continua):** Arquitectura de componentes

---

*Proyecto: "Quién Gana" — Polla Mundialista FIFA 2026 · Stack: React + Express + Prisma · Mercado Pago · Mayo 2026*
