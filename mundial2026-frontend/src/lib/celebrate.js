import confetti from 'canvas-confetti'

const CHAMPION_COLORS = ['#FFD700', '#B8860B', '#ffffff']

// Ráfaga de confeti dorado para celebrar al campeón de una polla (grupo o ranking global).
function fireChampionConfetti() {
  confetti({
    particleCount: 130,
    spread: 100,
    startVelocity: 45,
    ticks: 220,
    origin: { y: 0.55 },
    colors: CHAMPION_COLORS,
  })

  const duration = 2000
  const end = Date.now() + duration
  ;(function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 65, origin: { x: 0, y: 0.65 }, colors: CHAMPION_COLORS })
    confetti({ particleCount: 3, angle: 120, spread: 65, origin: { x: 1, y: 0.65 }, colors: CHAMPION_COLORS })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

// Dispara la celebración una sola vez por sesión de navegador por cada "scope"
// (ej: un grupo puntual o el ranking global), para no repetirla en cada visita a la pestaña.
export function celebrateChampionOnce(scopeKey) {
  const storageKey = `celebrated_champion_${scopeKey}`
  if (sessionStorage.getItem(storageKey)) return
  sessionStorage.setItem(storageKey, '1')
  fireChampionConfetti()
}
