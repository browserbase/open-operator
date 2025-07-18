import { User } from "firebase/auth";

export interface SubscriptionStatus {
  status: 'active' | 'trialing' | 'past_due' | 'no_active_subscription';
  subscriptionId?: string;
  currentPeriodEnd?: Date;
}

export const checkSubscriptionStatus = async (user: User): Promise<SubscriptionStatus> => {
  console.log('🔄 Checking subscription status for user:', user.uid);
  try {
    const response = await fetch('/api/checkSubscriptionStatus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email,
      }),
    });

    if (!response.ok) {
      console.error('❌ API response not ok:', response.status, response.statusText);
      throw new Error('Failed to check subscription status');
    }

    const data = await response.json();
    return {
      status: data.status,
      subscriptionId: data.subscriptionId,
      currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : undefined,
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { status: 'no_active_subscription' };
  }
};

export const hasActiveSubscription = (subscriptionStatus: SubscriptionStatus): boolean => {
  return subscriptionStatus.status === 'active' || subscriptionStatus.status === 'trialing';
};
