import { useUser } from '@clerk/clerk-react';

export type SubscriptionPlan = 'free' | 'plan_1k' | 'plan_5k' | 'plan_10k' | 'plan_20k' | 'plan_40k';

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
    pagesPerMonth: 1000,
    maxPagesPerPdf: 50,
    price: 0,
  },
  plan_1k: {
    pagesPerMonth: 1000,
    maxPagesPerPdf: 200,
    price: 9,
  },
  plan_5k: {
    pagesPerMonth: 5000,
    maxPagesPerPdf: 200,
    price: 19,
  },
  plan_10k: {
    pagesPerMonth: 10000,
    maxPagesPerPdf: 200,
    price: 29,
  },
  plan_20k: {
    pagesPerMonth: 20000,
    maxPagesPerPdf: 200,
    price: 39,
  },
  plan_40k: {
    pagesPerMonth: 40000,
    maxPagesPerPdf: 200,
    price: 49,
  },
};

// Mapeo de Plan Keys de Clerk a nombres de planes internos (Producción)
const CLERK_PLAN_KEY_MAP: Record<string, SubscriptionPlan> = {
  'cplan_319hW2htCwc28QLuofa6V11jwmf': 'plan_1k',
  'cplan_33qFJk5cGYUXNFYDawgsXWarwXj': 'plan_5k',
  'cplan_33qNbCHvQp2wAZkzNniwqmX1exZ': 'plan_10k',
  'cplan_33qNlc6TwLpUh3BdqMYBJbdYLQZ': 'plan_20k',
  'cplan_33qOHQx7ztKhoaJeipqwfkt4TuY': 'plan_40k',
  // También soportar los nombres legibles
  '1000_pages': 'plan_1k',
  '5000_pages': 'plan_5k',
  '10000_pages': 'plan_10k',
  '20000_pages': 'plan_20k',
  '40000_pages': 'plan_40k',
};

export const useSubscription = (): SubscriptionInfo => {
  const { user } = useUser();

  // Check if user has subscription plan in their metadata
  const rawPlan = user?.publicMetadata?.subscriptionPlan as string;
  
  // Debug: Log para ver qué está recibiendo
  console.log('🔍 Debug Subscription:', {
    userId: user?.id,
    publicMetadata: user?.publicMetadata,
    rawPlan,
    allMetadata: user
  });
  
  // Convertir el Plan Key de Clerk a nuestro nombre interno
  let userPlan: SubscriptionPlan = 'free';
  if (rawPlan) {
    userPlan = CLERK_PLAN_KEY_MAP[rawPlan] || (rawPlan as SubscriptionPlan) || 'free';
  }
  
  const isPaidUser = userPlan !== 'free';
  
  // Check if free trial is active (7 days from account creation)
  const accountCreatedAt = user?.createdAt ? new Date(user.createdAt) : null;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const isFreeTrialActive = accountCreatedAt ? accountCreatedAt > sevenDaysAgo : false;

  return {
    plan: userPlan,
    limits: PLAN_LIMITS[userPlan],
    isPaidUser,
    isFreeTrialActive,
  };
};
