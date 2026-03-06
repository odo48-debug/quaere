import { IncomingMessage, ServerResponse } from 'http';
import { Webhook } from 'svix';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Function to read request body
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
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const rawBody = await getRawBody(req);

    // Verify webhook signature (security)
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
        console.error('❌ Error verifying webhook:', err);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        return;
      }
    }

    const payload = JSON.parse(rawBody);

    console.log('📨 Webhook received:', {
      type: payload.type,
      data: payload.data
    });

    // Handle different event types
    switch (payload.type) {
      // Subscription events
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active':
        await handleSubscriptionUpdate(payload);
        break;

      case 'subscription.pastDue':
        await handleSubscriptionPastDue(payload);
        break;

      // Subscription item events
      case 'subscriptionItem.created':
      case 'subscriptionItem.updated':
        await handleSubscriptionUpdate(payload);
        break;

      case 'subscriptionItem.canceled':
      case 'subscriptionItem.ended':
        await handleSubscriptionCancellation(payload);
        break;

      default:
        console.log('ℹ️ Unhandled event:', payload.type);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ received: true }));
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function handleSubscriptionUpdate(payload: any) {
  const userId = payload.data.user_id;
  const planId = payload.data.plan_id;

  console.log('✅ Updating subscription:', { userId, planId });

  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        subscriptionPlan: planId
      }
    });
    console.log('✅ Metadata updated successfully');
  } catch (error) {
    console.error('❌ Error updating metadata:', error);
    throw error;
  }
}

async function handleSubscriptionPastDue(payload: any) {
  const userId = payload.data.user_id;

  console.log('⚠️ Subscription past due (pastDue):', { userId });

  // For now we just log, you could send an email or keep plan active temporarily
  // Optionally, you could change to 'free' after X days
  console.log('ℹ️ Subscription marked as past due, but maintaining temporary access');
}

async function handleSubscriptionCancellation(payload: any) {
  const userId = payload.data.user_id;

  console.log('❌ Canceling subscription:', { userId });

  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        subscriptionPlan: 'free'
      }
    });
    console.log('✅ Subscription canceled, metadata updated to free');
  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    throw error;
  }
}
