import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

export type SubscriptionPlan = 'free' | 'plan_100' | 'plan_500' | 'plan_2000';

export interface SubscriptionLimits {
  pagesPerMonth: number;
  maxPagesPerPdf: number;
  price: number;
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  limits: SubscriptionLimits;
  isPaidUser: boolean;
  isFreeTrialActive: boolean;
}

const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  free: {
    pagesPerMonth: 100, // Free trial: 100 pages or 7 days
    maxPagesPerPdf: 5,
    price: 0,
  },
  plan_100: {
    pagesPerMonth: 100,
    maxPagesPerPdf: 200,
    price: 9.99,
  },
  plan_500: {
    pagesPerMonth: 500,
    maxPagesPerPdf: 200,
    price: 19.99,
  },
  plan_2000: {
    pagesPerMonth: 2000,
    maxPagesPerPdf: 200,
    price: 29.99,
  },
};

// Map Clerk Plan Keys to internal plan names (Production and Dev)
const CLERK_PLAN_KEY_MAP: Record<string, SubscriptionPlan> = {
  // Prod keys
  'cplan_319hW2htCwc28QLuofa6V11jwmf': 'plan_100',
  'cplan_33qFJk5cGYUXNFYDawgsXWarwXj': 'plan_500',
  'cplan_33qNbCHvQp2wAZkzNniwqmX1exZ': 'plan_2000',
  // Dev keys
  'cplan_30VxITOcfVN0hdOhJXvXuWjspgl': 'plan_100',
  'cplan_33l2AseFDpR7GMjqvzVPWJNkOSj': 'plan_500',
  'cplan_33l2ONRsdHgAyPiYJnwXAOdVQxx': 'plan_2000',
  // Also support readable or generic names
  '100_pages': 'plan_100',
  '500_pages': 'plan_500',
  '2000_pages': 'plan_2000',
};

export const useSubscription = (): SubscriptionInfo => {
  const { user } = useUser();

  // Force-refresh user data from Clerk on mount to pick up plan changes
  useEffect(() => {
    if (user) {
      user.reload().catch(console.error);
    }
  }, [user?.id]);

  // Clerk can store the plan in different metadata fields depending on webhook setup
  const rawPlan = (
    user?.publicMetadata?.subscriptionPlan ||
    user?.publicMetadata?.planId ||
    (user?.publicMetadata?.subscription as any)?.planId
  ) as string | undefined;

  console.log('🔍 Subscription metadata:', user?.publicMetadata);

  // Convert Clerk Plan Key to our internal name
  let userPlan: SubscriptionPlan = 'free';
  if (rawPlan) {
    userPlan = CLERK_PLAN_KEY_MAP[rawPlan] || (rawPlan as SubscriptionPlan) || 'free';
  }

  const isPaidUser = userPlan !== 'free';

  // Check if free trial is active (7 days from account creation)
  const accountCreatedAt = user?.createdAt ? new Date(user.createdAt) : null;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const isFreeTrialActive = !isPaidUser && !!(accountCreatedAt && accountCreatedAt > sevenDaysAgo);

  return {
    plan: userPlan,
    limits: PLAN_LIMITS[userPlan],
    isPaidUser,
    isFreeTrialActive,
  };
};
