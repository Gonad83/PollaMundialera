// src/services/emailService.js
// Instalar: npm install nodemailer node-cron

const nodemailer = require('nodemailer')
const cron = require('node-cron')
const prisma = require('../utils/prisma')

// ─── Configuración del transporter ───────────────────────────────────────────
// Soporta Gmail, SendGrid, Resend, o cualquier SMTP

const createTransporter = () => {
  // Opción A: Gmail (para desarrollo/personal)
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Contraseña de aplicación de Google
      },
    })
  }

  // Opción B: Resend (recomendado para producción, gratis hasta 3000/mes)
  if (process.env.EMAIL_PROVIDER === 'resend') {
    return nodemailer.createTransporter({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })
  }

  // Opción C: SMTP genérico
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const transporter = createTransporter()
const FROM = `"Polla Mundial 2026 ⚽" <${process.env.EMAIL_FROM || 'noreply@polla2026.com'}>`
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ─── Templates HTML ───────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #09090b; font-family: 'DM Sans', Arial, sans-serif; color: #e4e4e7; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; }
    .header { background: #16a34a; padding: 24px 28px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: 800; color: white; letter-spacing: 2px; }
    .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
    .body { padding: 28px; }
    .match-card { background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; margin: 12px 0; }
    .teams { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 18px; font-weight: 700; }
    .vs { color: #52525b; font-size: 12px; font-weight: 400; }
    .time { text-align: center; color: #71717a; font-size: 12px; margin-top: 6px; font-family: monospace; }
    .deadline { background: #7f1d1d; border: 1px solid #991b1b; border-radius: 8px; padding: 10px 14px; margin: 12px 0; font-size: 13px; color: #fca5a5; }
    .btn { display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 16px 0; }
    .footer { text-align: center; padding: 20px; color: #52525b; font-size: 12px; }
    .points-badge { display: inline-block; background: #713f12; color: #fbbf24; border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>⚽ MUNDIAL 2026</h1>
        <p>Polla del torneo</p>
      </div>
      <div class="body">${content}</div>
    </div>
    <div class="footer">
      <p>© 2026 Polla Mundial · <a href="${APP_URL}/unsubscribe" style="color:#52525b">Cancelar suscripción</a></p>
    </div>
  </div>
</body>
</html>
`

// Template: recordatorio de partido
const matchReminderTemplate = ({ username, match, hoursLeft }) => {
  const deadlineText = hoursLeft === 1
    ? '⚠️ ¡Solo queda 1 hora para apostar!'
    : `Tienes ${hoursLeft} horas para hacer tu pronóstico`

  return baseTemplate(`
    <p style="font-size:16px; margin-bottom:8px;">Hola <strong>${username}</strong> 👋</p>
    <p style="color:#a1a1aa; font-size:14px; margin-bottom:16px;">
      ${deadlineText}. No te quedes sin apostar este partido:
    </p>

    <div class="match-card">
      <div class="teams">
        <span>${match.teamHome.flagUrl || '🏴'} ${match.teamHome.name}</span>
        <span class="vs">VS</span>
        <span>${match.teamAway.name} ${match.teamAway.flagUrl || '🏴'}</span>
      </div>
      <div class="time">
        ${new Date(match.dateUtc).toLocaleString('es', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago'
        })}
      </div>
    </div>

    <div class="deadline">
      🔒 El formulario cierra 5 minutos antes del partido
    </div>

    <p style="color:#a1a1aa; font-size:13px; margin-bottom:16px;">
      Recordá: acertar el marcador exacto vale <span class="points-badge">5 pts</span>,
      el ganador <span class="points-badge">1 pt</span>, y hay bonos por goleador y BTTS.
    </p>

    <div style="text-align:center">
      <a href="${APP_URL}/matches/${match.id}" class="btn">
        ⚽ Hacer mi pronóstico →
      </a>
    </div>
  `)
}

// Template: bienvenida
const welcomeTemplate = ({ username }) => baseTemplate(`
  <p style="font-size:18px; font-weight:700; margin-bottom:8px;">¡Bienvenido a la Polla del Mundial 2026, ${username}! 🎉</p>
  <p style="color:#a1a1aa; font-size:14px; margin-bottom:20px;">
    Ya estás listo para competir. El torneo empieza el <strong style="color:#e4e4e7">11 de junio de 2026</strong>.
  </p>

  <div style="background:#09090b; border:1px solid #27272a; border-radius:12px; padding:16px; margin-bottom:16px;">
    <p style="font-weight:700; margin-bottom:10px;">¿Qué puedes hacer ahora?</p>
    <p style="color:#a1a1aa; font-size:13px; margin-bottom:6px;">🏆 Llenar tus <strong style="color:#e4e4e7">pronósticos del torneo</strong> (campeón, goleador, premios)</p>
    <p style="color:#a1a1aa; font-size:13px; margin-bottom:6px;">👥 Crear un <strong style="color:#e4e4e7">grupo privado</strong> con amigos</p>
    <p style="color:#a1a1aa; font-size:13px;">⚽ Apostar a cada partido antes del kick-off</p>
  </div>

  <div style="text-align:center">
    <a href="${APP_URL}/tournament" class="btn">🏆 Hacer mis pronósticos →</a>
  </div>
`)

// Template: resumen de jornada
const matchSummaryTemplate = ({ username, results }) => {
  const totalPoints = results.reduce((s, r) => s + r.pointsTotal, 0)
  const rows = results.map(r => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #27272a; font-size:13px;">
      <span style="color:#a1a1aa">${r.teamHome} ${r.scoreHome}–${r.scoreAway} ${r.teamAway}</span>
      <span style="color:#a1a1aa">Aposté: ${r.predHome}–${r.predAway}</span>
      <span style="color:${r.pointsTotal > 0 ? '#fbbf24' : '#52525b'}; font-weight:700;">+${r.pointsTotal} pts</span>
    </div>
  `).join('')

  return baseTemplate(`
    <p style="font-size:16px; margin-bottom:4px;">Hola <strong>${username}</strong>,</p>
    <p style="color:#a1a1aa; font-size:14px; margin-bottom:20px;">Aquí está tu resumen de la última jornada:</p>

    <div style="background:#09090b; border:1px solid #27272a; border-radius:12px; padding:16px; margin-bottom:16px;">
      ${rows}
      <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; margin-top:4px; font-weight:700;">
        <span>Total de la jornada</span>
        <span style="color:#fbbf24; font-size:18px;">+${totalPoints} pts</span>
      </div>
    </div>

    <div style="text-align:center">
      <a href="${APP_URL}/leaderboard" class="btn">📊 Ver el ranking →</a>
    </div>
  `)
}

// ─── Funciones de envío ───────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_PROVIDER && !process.env.SMTP_HOST) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
    console.log(`✉️  Email enviado a ${to}: ${subject}`)
  } catch (err) {
    console.error(`❌ Error enviando email a ${to}:`, err.message)
  }
}

const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: '⚽ ¡Bienvenido a la Polla del Mundial 2026!',
    html: welcomeTemplate({ username: user.username }),
  })
}

const sendMatchReminder = async (user, match, hoursLeft) => {
  await sendEmail({
    to: user.email,
    subject: `⏰ ${hoursLeft}h para cerrar: ${match.teamHome.name} vs ${match.teamAway.name}`,
    html: matchReminderTemplate({ username: user.username, match, hoursLeft }),
  })
}

const sendMatchSummary = async (user, results) => {
  await sendEmail({
    to: user.email,
    subject: `📊 Resumen de la jornada — ${results.reduce((s, r) => s + r.pointsTotal, 0)} puntos ganados`,
    html: matchSummaryTemplate({ username: user.username, results }),
  })
}

// ─── Cron jobs ────────────────────────────────────────────────────────────────

const startEmailCrons = () => {
  console.log('⏰ Iniciando cron jobs de email...')

  // Cada hora: verificar partidos que cierran en 24h y en 1h
  cron.schedule('0 * * * *', async () => {
    const now = new Date()

    // Partidos que cierran en ~24 horas
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000)

    // Partidos que cierran en ~1 hora
    const in1h = new Date(now.getTime() + 61 * 60 * 1000)
    const in59m = new Date(now.getTime() + 59 * 60 * 1000)

    const [matches24h, matches1h] = await Promise.all([
      prisma.match.findMany({
        where: {
          status: 'SCHEDULED',
          dateUtc: { gte: in23h, lte: in24h },
        },
        include: { teamHome: true, teamAway: true },
      }),
      prisma.match.findMany({
        where: {
          status: 'SCHEDULED',
          dateUtc: { gte: in59m, lte: in1h },
        },
        include: { teamHome: true, teamAway: true },
      }),
    ])

    // Para cada partido, buscar usuarios que AÚN NO apostaron
    for (const match of [...matches24h, ...matches1h]) {
      const hoursLeft = matches24h.includes(match) ? 24 : 1

      // Usuarios registrados que no tienen predicción para este partido
      const usersWithoutPred = await prisma.user.findMany({
        where: {
          role: 'USER',
          predictions: {
            none: { matchId: match.id },
          },
        },
        select: { id: true, email: true, username: true },
      })

      console.log(`📧 Enviando ${usersWithoutPred.length} recordatorios para ${match.teamHome.name} vs ${match.teamAway.name} (${hoursLeft}h)`)

      // Enviar en lotes para no saturar el SMTP
      for (let i = 0; i < usersWithoutPred.length; i += 10) {
        const batch = usersWithoutPred.slice(i, i + 10)
        await Promise.all(batch.map(user => sendMatchReminder(user, match, hoursLeft)))
        if (i + 10 < usersWithoutPred.length) {
          await new Promise(r => setTimeout(r, 1000)) // Pausa entre lotes
        }
      }
    }
  })

  // Cada día a las 23:00: resumen de partidos jugados hoy
  cron.schedule('0 23 * * *', async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const finishedToday = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
        dateUtc: { gte: todayStart, lte: todayEnd },
      },
      include: { teamHome: true, teamAway: true },
    })

    if (finishedToday.length === 0) return

    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, email: true, username: true },
    })

    for (const user of users) {
      const preds = await prisma.prediction.findMany({
        where: {
          userId: user.id,
          matchId: { in: finishedToday.map(m => m.id) },
        },
        include: { match: { include: { teamHome: true, teamAway: true } } },
      })

      if (preds.length === 0) continue

      const results = preds.map(p => ({
        teamHome: p.match.teamHome.name,
        teamAway: p.match.teamAway.name,
        scoreHome: p.match.scoreHome,
        scoreAway: p.match.scoreAway,
        predHome: p.predHome,
        predAway: p.predAway,
        pointsTotal: p.pointsTotal,
      }))

      await sendMatchSummary(user, results)
    }
  })

  console.log('✅ Cron jobs activos: recordatorios (hourly) + resumen diario (23:00)')
}

module.exports = {
  sendWelcomeEmail,
  sendMatchReminder,
  sendMatchSummary,
  startEmailCrons,
}
