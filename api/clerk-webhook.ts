
import { Webhook } from 'svix';
import { createClerkClient } from '@clerk/backend';

const secretKey = process.env.CLERK_SECRET_KEY;
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

const clerk = createClerkClient({ secretKey });

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    if (!webhookSecret) {
        console.error('Missing CLERK_WEBHOOK_SECRET');
        return new Response('Server configuration error', { status: 500 });
    }

    // 1. Get headers for verification
    const svix_id = req.headers.get("svix-id");
    const svix_timestamp = req.headers.get("svix-timestamp");
    const svix_signature = req.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400
        });
    }

    // 2. Get the body as text
    const payload = await req.text();
    const wh = new Webhook(webhookSecret);

    let evt: any;

    // 3. Verify the webhook
    try {
        evt = wh.verify(payload, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as any;
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured', {
            status: 400
        });
    }

    // 4. Handle the event
    const { type, data } = evt;
    console.log(`[Clerk Webhook] Event Type: ${type}`);

    // Listen for billing events or user updates
    // common event when using Clerk Billing: 'subscription.created'
    // or when Stripe connects to Clerk: 'user.updated'
    if (type === 'subscription.created' || type === 'organizationSubscription.created') {
        const userId = data.user_id || data.userId;

        if (userId) {
            console.log(`[Clerk Webhook] Upgrading user ${userId} to PRO plan...`);
            await clerk.users.updateUserMetadata(userId, {
                publicMetadata: {
                    plan: 'pro'
                }
            });
        }
    }

    // If you are using standard Stripe -> Clerk sync, you might want to listen to user.updated
    // and check if Clerk's internal billing state changed.

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
