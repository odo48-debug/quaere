import { IncomingMessage, ServerResponse } from 'http';
import { Webhook } from 'svix';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Función para leer el body del request
async function getRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Solo aceptar POST requests
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const rawBody = await getRawBody(req);
    
    // Verificar la firma del webhook (seguridad)
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const svixHeaders = {
        'svix-id': (req.headers as any)['svix-id'] || '',
        'svix-timestamp': (req.headers as any)['svix-timestamp'] || '',
        'svix-signature': (req.headers as any)['svix-signature'] || '',
      };

      const wh = new Webhook(webhookSecret);
      
      try {
        wh.verify(rawBody, svixHeaders);
      } catch (err) {
        console.error('❌ Error verificando webhook:', err);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        return;
      }
    }

    const payload = JSON.parse(rawBody);

    console.log('📨 Webhook recibido:', {
      type: payload.type,
      data: payload.data
    });

    // Manejar diferentes tipos de eventos
    switch (payload.type) {
      // Eventos de suscripción
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active':
        await handleSubscriptionUpdate(payload);
        break;
      
      case 'subscription.pastDue':
        await handleSubscriptionPastDue(payload);
        break;
      
      // Eventos de items de suscripción
      case 'subscriptionItem.created':
      case 'subscriptionItem.updated':
        await handleSubscriptionUpdate(payload);
        break;
      
      case 'subscriptionItem.canceled':
      case 'subscriptionItem.ended':
        await handleSubscriptionCancellation(payload);
        break;
      
      default:
        console.log('ℹ️ Evento no manejado:', payload.type);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ received: true }));
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function handleSubscriptionUpdate(payload: any) {
  const userId = payload.data.user_id;
  const planId = payload.data.plan_id;

  console.log('✅ Actualizando suscripción:', { userId, planId });

  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        subscriptionPlan: planId
      }
    });
    console.log('✅ Metadata actualizado correctamente');
  } catch (error) {
    console.error('❌ Error actualizando metadata:', error);
    throw error;
  }
}

async function handleSubscriptionPastDue(payload: any) {
  const userId = payload.data.user_id;

  console.log('⚠️ Suscripción vencida (pastDue):', { userId });

  // Por ahora solo logueamos, podrías enviar un email o mantener el plan activo temporalmente
  // Opcionalmente, podrías cambiar a 'free' después de X días
  console.log('ℹ️ Suscripción marcada como vencida, pero manteniendo acceso temporal');
}

async function handleSubscriptionCancellation(payload: any) {
  const userId = payload.data.user_id;

  console.log('❌ Cancelando suscripción:', { userId });

  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        subscriptionPlan: 'free'
      }
    });
    console.log('✅ Suscripción cancelada, metadata actualizado a free');
  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    throw error;
  }
}
