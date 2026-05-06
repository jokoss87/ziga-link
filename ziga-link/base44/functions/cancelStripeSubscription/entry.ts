import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { userEmail } = await req.json();
    if (!userEmail) return Response.json({ error: 'userEmail requis' }, { status: 400 });

    const supports = await base44.asServiceRole.entities.UserSupport.filter({ user_email: userEmail });
    const support = supports[0];

    if (!support) return Response.json({ error: 'Aucun soutien trouvé' }, { status: 404 });
    if (!support.stripe_subscription_id) return Response.json({ error: 'Aucun abonnement actif' }, { status: 400 });

    try {
      await stripe.subscriptions.cancel(support.stripe_subscription_id);
    } catch (stripeErr) {
      // Si l'abonnement n'existe pas (ex: créé en test mode), on continue quand même
      console.warn('[cancelStripeSubscription] Stripe cancel warning:', stripeErr.message);
    }
    await base44.asServiceRole.entities.UserSupport.update(support.id, { status: 'soutien_expire', stripe_subscription_id: null });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[cancelStripeSubscription] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});