import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    // Verify webhook signature
    const crypto = await import('node:crypto');
    const timestamp = signature.split(',').find(s => s.startsWith('t=')).split('=')[1];
    const signatureHash = signature.split(',').find(s => s.startsWith('v1=')).split('=')[1];
    
    const signedPayload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(signedPayload, 'utf8')
      .digest('hex');

    if (signatureHash !== expectedSignature) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Initialize Base44 client with service role for admin operations
    const base44 = createClientFromRequest(req);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_email || session.customer_details?.email;

      if (!customerEmail) {
        return Response.json({ error: 'No customer email found' }, { status: 400 });
      }

      // Find user by email and upgrade to Pro
      const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });

      if (users.length > 0) {
        const user = users[0];
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'pro',
          stripe_customer_id: session.customer,
          subscription_start_date: new Date().toISOString()
        });

        return Response.json({ success: true, message: 'User upgraded to Pro' });
      } else {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: customerId });

      if (users.length > 0) {
        const user = users[0];
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'free'
        });

        return Response.json({ success: true, message: 'Subscription cancelled' });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});