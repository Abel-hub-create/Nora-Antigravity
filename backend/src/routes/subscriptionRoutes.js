import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middlewares/auth.js';
import * as planRepo from '../services/planRepository.js';

const router = express.Router();

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

// ─── Public: get all active plans with limits ────────────────────────────────

router.get('/plans', async (req, res, next) => {
  try {
    const plans = await planRepo.getActivePlans();
    res.json({ plans });
  } catch (error) { next(error); }
});

// ─── Public: validate a promo code ───────────────────────────────────────────

router.post('/promo/validate', express.json(), async (req, res, next) => {
  try {
    const { code, plan } = req.body;
    if (!code) return res.status(400).json({ error: 'Code requis' });
    const result = await planRepo.validatePromoCode(code, plan || 'premium');
    if (!result.valid) return res.status(400).json({ error: result.error });
    res.json({
      valid: true,
      discount_type: result.promo.discount_type,
      discount_value: Number(result.promo.discount_value)
    });
  } catch (error) { next(error); }
});

// ─── Public: school contact request ──────────────────────────────────────────

router.post('/school/contact', express.json(), async (req, res, next) => {
  try {
    const { school_name, contact_email, contact_name, student_count, message } = req.body;
    if (!school_name || !contact_email) {
      return res.status(400).json({ error: 'Nom de l\'école et email requis' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    await planRepo.createSchoolRequest({ school_name, contact_email, contact_name, student_count, message });
    res.status(201).json({ message: 'Demande envoyée avec succès' });
  } catch (error) { next(error); }
});

// ─── Auth required: get current user plan & limits ───────────────────────────

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const planData = await planRepo.getUserPlanLimits(req.user.id);
    const subscription = await planRepo.getActiveSubscription(req.user.id);
    res.json({ ...planData, subscription });
  } catch (error) { next(error); }
});

// ─── Auth required: create Stripe checkout session ───────────────────────────

router.post('/checkout', authenticate, express.json(), async (req, res, next) => {
  try {
    const stripe = getStripe();
    const { plan_slug, promo_code } = req.body;

    if (!plan_slug || plan_slug === 'free') {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    const plan = await planRepo.getPlanBySlug(plan_slug);
    if (!plan || !plan.stripe_price_id) {
      return res.status(400).json({ error: 'Plan non configuré pour le paiement' });
    }

    // Check for existing active subscription
    const existing = await planRepo.getActiveSubscription(req.user.id);
    if (existing && existing.plan_slug === plan_slug) {
      return res.status(400).json({ error: 'Vous avez déjà ce plan' });
    }

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?checkout=canceled`,
      client_reference_id: String(req.user.id),
      metadata: { user_id: String(req.user.id), plan_slug },
      customer_email: req.user.email,
    };

    // Apply promo code if provided
    if (promo_code) {
      const promoResult = await planRepo.validatePromoCode(promo_code, plan_slug);
      if (promoResult.valid && promoResult.promo.stripe_coupon_id) {
        sessionParams.discounts = [{ coupon: promoResult.promo.stripe_coupon_id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (error) { next(error); }
});

// ─── Auth required: create Stripe customer portal session ────────────────────

router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const subscription = await planRepo.getActiveSubscription(req.user.id);
    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'Pas d\'abonnement actif' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/settings`,
    });
    res.json({ url: session.url });
  } catch (error) { next(error); }
});

// ─── Stripe Webhook ──────────────────────────────────────────────────────────

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.user_id || session.client_reference_id);
        const planSlug = session.metadata?.plan_slug || 'premium';
        const plan = await planRepo.getPlanBySlug(planSlug);
        if (!plan || !userId) break;

        // Create subscription record
        await planRepo.createSubscription({
          user_id: userId,
          plan_id: plan.id,
          status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          current_period_start: new Date(),
          current_period_end: null,
        });
        await planRepo.setUserPlan(userId, planSlug);
        console.log(`[Stripe] User ${userId} subscribed to ${planSlug}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await planRepo.updateSubscriptionByStripeId(sub.id, {
          status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status,
          current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          cancel_at_period_end: sub.cancel_at_period_end ? 1 : 0,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const dbSub = await planRepo.getSubscriptionByStripeId(sub.id);
        if (dbSub) {
          await planRepo.updateSubscription(dbSub.id, {
            status: 'canceled',
            canceled_at: new Date(),
          });
          await planRepo.setUserPlan(dbSub.user_id, 'free');
          console.log(`[Stripe] User ${dbSub.user_id} subscription canceled`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await planRepo.updateSubscriptionByStripeId(invoice.subscription, {
            status: 'past_due',
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error handling event:', err);
  }

  res.json({ received: true });
});

export default router;
