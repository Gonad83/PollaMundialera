// ─── INSTRUCCIONES DE INTEGRACIÓN ────────────────────────────────────────────
// Agrega estas líneas al archivo src/index.js del backend

// 1. Instalar dependencias:
//    npm install nodemailer node-cron
//    (Para Football API): npm install  (ya tienes axios)

// 2. Copiar emailService.js y footballApiService.js a src/services/

// 3. En src/index.js, después de crear el httpServer, agregar:

/*
const { startEmailCrons }       = require('./services/emailService')
const { startFootballApiCrons } = require('./services/footballApiService')

// Arrancar crons (dentro del httpServer.listen callback)
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)

  // Emails
  if (process.env.EMAIL_PROVIDER || process.env.SMTP_HOST) {
    startEmailCrons()
  }

  // Football API
  if (process.env.FOOTBALL_API_KEY) {
    startFootballApiCrons(io)
  }
})
*/

// 4. En authController.js, después de crear el usuario en register(), agregar:
/*
const { sendWelcomeEmail } = require('../services/emailService')
// ... después de crear user:
await sendWelcomeEmail(user).catch(console.error) // No bloquear si falla
*/

// 5. Agregar a .env:
/*
# ─── EMAIL ────────────────────────────────────────────────────────────────────
EMAIL_PROVIDER=resend            # gmail | resend | smtp
EMAIL_FROM=noreply@tupolla.com

# Para Resend (recomendado, gratis hasta 3000/mes):
RESEND_API_KEY=re_xxxxxxxxxxxx

# Para Gmail:
# EMAIL_USER=tu@gmail.com
# EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  (generar en myaccount.google.com/apppasswords)

# Para SMTP genérico:
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=user
# SMTP_PASS=pass

# ─── FOOTBALL API ─────────────────────────────────────────────────────────────
# Obtener gratis en: https://dashboard.api-football.com/register
FOOTBALL_API_KEY=tu_api_key_aqui
WC_2026_LEAGUE_ID=1              # Se actualizará cuando esté disponible el Mundial 2026

# Alternativa gratuita: football-data.org
# FOOTBALL_DATA_KEY=tu_api_key_aqui
*/

module.exports = {}
