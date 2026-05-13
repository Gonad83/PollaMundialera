const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const prisma = require('../utils/prisma');

// Configuración de Mercado Pago (Chile)
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-6805174154446487-030214-722744838-TEST', // Placeholder para dev
});

const Tiers = {
  tier1: {
    title: 'Plan Capitán (15 personas)',
    price: 2990,
    limit: 15,
    plan: 'CLASICO',
    name: 'TIER1'
  },
  tier2: {
    title: 'Plan DT (3 grupos de 15)',
    price: 4990,
    limit: 15,
    plan: 'DT',
    name: 'TIER2'
  },
  tier3: {
    title: 'Plan Elite (150 personas)',
    price: 9990,
    limit: 150,
    plan: 'PRO',
    name: 'TIER3'
  }
};

/**
 * POST /api/payments/create-preference
 * Body: { groupId, tierId }
 */
const createPreference = async (req, res) => {
  const { groupId, tierId } = req.body;
  const tier = Tiers[tierId];

  if (!tier) return res.status(400).json({ error: 'Tier inválido' });

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
    if (group.creatorId !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede mejorar la liga' });

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: tierId,
            title: `Mundial 2026: ${tier.title}`,
            quantity: 1,
            unit_price: tier.price,
            currency_id: 'CLP',
          }
        ],
        external_reference: JSON.stringify({ groupId, tierId }), // Para identificar en el webhook
        back_urls: {
          success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?groupId=${groupId}`,
          failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/groups/${groupId}`,
          pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/groups/${groupId}`,
        },
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhooks/mercadopago`,
      }
    });

    return res.json({ id: result.id, initPoint: result.init_point });
  } catch (error) {
    console.error('Error creando preferencia MP:', error);
    return res.status(500).json({ error: 'Error al procesar el pago' });
  }
};

/**
 * POST /api/webhooks/mercadopago
 * Notificaciones IPN/Webhooks
 */
const handleWebhook = async (req, res) => {
  const { type, data } = req.body;

  try {
    if (type === 'payment') {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: data.id });

      if (paymentData.status === 'approved') {
        const { groupId, tierId } = JSON.parse(paymentData.external_reference);
        const tier = Tiers[tierId];

        const group = await prisma.group.findUnique({ where: { id: groupId }, select: { creatorId: true } });

        await prisma.$transaction([
          prisma.group.update({
            where: { id: groupId },
            data: {
              isPremium: true,
              maxMembers: tier.limit,
              activePlan: tier.name,
              paymentId: String(paymentData.id),
              paymentStatus: 'approved',
            },
          }),
          prisma.user.update({
            where: { id: group.creatorId },
            data: { plan: tier.plan },
          }),
        ]);
        
        console.log(`[PAYMENT] Grupo ${groupId} mejorado a ${tier.name} ($${tier.price} CLP)`);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook MP:', error);
    return res.status(500).send('Webhook Error');
  }
};

module.exports = { createPreference, handleWebhook };
