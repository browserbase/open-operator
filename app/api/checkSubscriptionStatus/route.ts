import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../firebaseAdmin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET(request: NextRequest) {
  console.log('🔄 GET checkSubscriptionStatus API called');
  return NextResponse.json({ message: 'API is working', timestamp: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  console.log('🔄 checkSubscriptionStatus API called');
  try {
    const { userId, email } = await request.json();
    console.log('📋 Request data:', { userId, email });

    if (!userId || !email) {
      console.log('❌ Missing userId or email');
      return NextResponse.json({ error: 'User ID and email are required.' }, { status: 400 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;

    if (!customerId) {
      const customers = await stripe.customers.list({ email });
      if (customers?.data?.length > 0) {
        customerId = customers.data[0].id;
        await userDocRef.set({ stripeCustomerId: customerId }, { merge: true });
      } else {
        return NextResponse.json({ status: 'no_active_subscription' });
      }
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });

    const activeOrTrialingSubscription = subscriptions.data.find(
      (subscription: Stripe.Subscription) => subscription.status === 'active' || subscription.status === 'trialing'
    );

    if (activeOrTrialingSubscription) {
      return NextResponse.json({
        status: activeOrTrialingSubscription.status,
        subscriptionId: activeOrTrialingSubscription.id,
        currentPeriodEnd: new Date((activeOrTrialingSubscription as any).current_period_end * 1000),
      });
    }

    // Check for past due subscriptions if no active or trialing subscription is found
    const pastDueSubscription = subscriptions.data.find(
      (subscription: Stripe.Subscription) => subscription.status === 'past_due'
    );

    if (pastDueSubscription) {
      return NextResponse.json({
        status: 'past_due',
        subscriptionId: pastDueSubscription.id,
        currentPeriodEnd: new Date((pastDueSubscription as any).current_period_end * 1000),
      });
    }

    return NextResponse.json({ status: 'no_active_subscription' });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
