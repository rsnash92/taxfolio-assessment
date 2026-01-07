import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Use service role for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // Require webhook secret in production
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { planId, planName, discountCode, discountAmount, originalPrice } =
        paymentIntent.metadata;

      console.log('Payment succeeded:', paymentIntent.id);

      // Store payment record in database
      const { error } = await supabase.from('assessment_payments').insert({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer as string | null,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'succeeded',
        plan_id: planId,
        plan_name: planName,
        discount_code: discountCode || null,
        discount_amount: discountAmount ? parseInt(discountAmount) : 0,
        original_price: originalPrice ? parseInt(originalPrice) : paymentIntent.amount,
        receipt_email: paymentIntent.receipt_email,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to store payment record:', error);
        // Don't fail the webhook - Stripe will retry
      }

      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', paymentIntent.id);
      console.log('Error:', paymentIntent.last_payment_error?.message);

      // Optionally store failed payment attempts
      await supabase.from('assessment_payments').insert({
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'failed',
        plan_id: paymentIntent.metadata.planId,
        error_message: paymentIntent.last_payment_error?.message,
        created_at: new Date().toISOString(),
      });

      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
