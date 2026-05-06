import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userEmail, amount, isMonthly } = await req.json();
    if (!userEmail || !amount) return Response.json({ error: 'Paramètres manquants' }, { status: 400 });

    const amountCents = Math.round(amount * 100);

    const appUrl = Deno.env.get("APP_PUBLIC_URL") || "https://patte-meet-now.base44.app";

    const success_url = `${appUrl}/SupportPage?success=1`;
    const cancel_url = `${appUrl}/SupportPage?cancelled=1`;

    console.log(`[createStripeCheckout] appUrl="${appUrl}"`);
    console.log(`[createStripeCheckout] success_url="${success_url}"`);
    console.log(`[createStripeCheckout] mode=${isMonthly ? "subscription" : "payment"} amount=${amountCents} cents`);

    const sessionParams = {
      customer_email: userEmail,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: isMonthly ? `Soutien mensuel Paw Spot — ${amount}€/mois` : `Soutien unique Paw Spot — ${amount}€`,
            description: 'Merci de soutenir la communauté canine Paw Spot 🐾',
          },
          unit_amount: amountCents,
          ...(isMonthly ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      }],
      mode: isMonthly ? 'subscription' : 'payment',
      success_url,
      cancel_url,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: userEmail,
        amount: String(amount),
        is_monthly: String(isMonthly),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[createStripeCheckout] session.id=${session.id} session.url=${session.url}`);

    // Log dans AppLog pour diagnostic admin
    await base44.asServiceRole.entities.AppLog.create({
      level: "info",
      category: "other",
      message: `[Stripe] Session créée pour ${userEmail}`,
      details: JSON.stringify({
      session_id: session.id,
      session_url: session.url,
      mode: sessionParams.mode,
      amount_cents: amountCents,
      success_url,
      cancel_url,
      app_url: appUrl,
      }),
      user_email: userEmail,
      page: "SupportPage",
    }).catch(() => {}); // ne pas bloquer si AppLog échoue

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[createStripeCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});