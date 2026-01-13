import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { calculatePrice, getPlanById } from '@/lib/config/pricing';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { planId, discountCode, email, taxYear } = await request.json();

    // Get user ID from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Validate plan
    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Calculate final price
    const pricing = calculatePrice(planId, discountCode);
    if (!pricing) {
      return NextResponse.json(
        { error: 'Unable to calculate price' },
        { status: 400 }
      );
    }

    // Don't create intent for zero-amount (shouldn't happen, but safety check)
    if (pricing.finalPrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.finalPrice,
      currency: 'gbp',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        planId,
        planName: plan.name,
        discountCode: discountCode || '',
        discountAmount: pricing.discountAmount.toString(),
        originalPrice: pricing.originalPrice.toString(),
        userId: userId || '',
        taxYear: taxYear || '2024-25',
      },
      receipt_email: email || undefined,
      description: `TaxFolio Assessment - ${plan.name} Plan`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: pricing.finalPrice,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
