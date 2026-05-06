import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("[stripeWebhook] Signature validation failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email || session.customer_email;
      const amount = parseFloat(session.metadata?.amount || "0");
      const isMonthly = session.metadata?.is_monthly === "true";
      const customerId = session.customer;
      const subscriptionId = session.subscription || null;

      if (!userEmail) {
        console.warn("[stripeWebhook] No user_email in session metadata");
        return Response.json({ received: true });
      }

      const existing = await base44.asServiceRole.entities.UserSupport.filter({ user_email: userEmail });

      if (existing.length > 0 && existing[0].last_stripe_event_id === event.id) {
        console.log(`[stripeWebhook] Événement ${event.id} déjà traité — ignoré (idempotence)`);
        return Response.json({ received: true });
      }

      if (existing.length > 0) {
        const s = existing[0];
        await base44.asServiceRole.entities.UserSupport.update(s.id, {
          status: "soutien_actif",
          amount,
          is_monthly: isMonthly,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          started_at: s.started_at || new Date().toISOString(),
          total_paid: (s.total_paid || 0) + amount,
          payment_count: (s.payment_count || 0) + 1,
          last_stripe_event_id: event.id,
        });
      } else {
        await base44.asServiceRole.entities.UserSupport.create({
          user_email: userEmail,
          status: "soutien_actif",
          amount,
          is_monthly: isMonthly,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          started_at: new Date().toISOString(),
          total_paid: amount,
          payment_count: 1,
          last_stripe_event_id: event.id,
        });
      }
      console.log(`[stripeWebhook] Soutien activé pour ${userEmail} — ${amount}€${isMonthly ? "/mois" : " unique"}`);

      // Pour les paiements UNIQUES : invoice.paid ne se déclenche pas → mettre à jour l'objectif ici
      if (!isMonthly && amount > 0) {
        const configs = await base44.asServiceRole.entities.SupportConfig.list();
        if (configs.length > 0) {
          const cfg = configs[0];
          const currentReached = parseFloat(cfg.monthly_goal_reached || 0);
          const newReached = Math.round((currentReached + amount) * 100) / 100;
          await base44.asServiceRole.entities.SupportConfig.update(cfg.id, {
            monthly_goal_reached: newReached,
          });
          console.log(`[stripeWebhook] (one-time) monthly_goal_reached: ${currentReached} + ${amount} = ${newReached}€`);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const customerId = sub.customer;
      const existing = await base44.asServiceRole.entities.UserSupport.filter({ stripe_customer_id: customerId });
      if (existing.length > 0) {
        if (existing[0].last_cancel_event_id === event.id) {
          console.log(`[stripeWebhook] Événement annulation ${event.id} déjà traité — ignoré (idempotence)`);
          return Response.json({ received: true });
        }
        const expiresAt = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : new Date().toISOString();
        await base44.asServiceRole.entities.UserSupport.update(existing[0].id, {
          status: "soutien_expire",
          last_cancel_event_id: event.id,
          expires_at: expiresAt,
        });
        console.log(`[stripeWebhook] Abonnement expiré pour customer ${customerId}`);
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const amountPaid = (invoice.amount_paid || 0) / 100; // centimes → euros
      if (amountPaid > 0) {
        const configs = await base44.asServiceRole.entities.SupportConfig.list();
        if (configs.length > 0) {
          const cfg = configs[0];
          const currentReached = parseFloat(cfg.monthly_goal_reached || 0);
          const newReached = Math.round((currentReached + amountPaid) * 100) / 100;
          await base44.asServiceRole.entities.SupportConfig.update(cfg.id, {
            monthly_goal_reached: newReached,
          });
          console.log(`[stripeWebhook] monthly_goal_reached: ${currentReached} + ${amountPaid} = ${newReached}€`);
        }
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("[stripeWebhook] Processing error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});