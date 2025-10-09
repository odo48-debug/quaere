import { useUser } from '@clerk/clerk-react';

export type SubscriptionPlan = 'free' | 'plan_1k' | 'plan_10k' | 'plan_20k' | 'plan_30k' | 'plan_50k';

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
    price: 9.99,
  },
  plan_10k: {
    pagesPerMonth: 10000,
    maxPagesPerPdf: 200,
    price: 19,
  },
  plan_20k: {
    pagesPerMonth: 20000,
    maxPagesPerPdf: 200,
    price: 29,
  },
  plan_30k: {
    pagesPerMonth: 30000,
    maxPagesPerPdf: 200,
    price: 69,
  },
  plan_50k: {
    pagesPerMonth: 50000,
    maxPagesPerPdf: 200,
    price: 89,
  },
};

// Mapeo de Plan Keys de Clerk a nombres de planes internos
const CLERK_PLAN_KEY_MAP: Record<string, SubscriptionPlan> = {
  'cplan_30VxITOcfVN0hdOhJXvXuWjspgl': 'plan_1k',
  'cplan_33l2AseFDpR7GMjqvzVPWJNkOSj': 'plan_10k',
  'cplan_33l2ONRsdHgAyPiYJnwXAOdVQxx': 'plan_20k',
  'cplan_33l2VHGf01xpsZmz2dRzXnoNfkd': 'plan_30k',
  'cplan_33l2aMhzclUW6kpY59ctbo1hpcH': 'plan_50k',
  // También soportar los nombres legibles
  '1000_pages': 'plan_1k',
  '10000_pages': 'plan_10k',
  '20000_pages': 'plan_20k',
  '30000_pages': 'plan_30k',
  '50000_pages': 'plan_50k',
};

export const useSubscription = (): SubscriptionInfo => {
  const { user } = useUser();

  // Check if user has subscription plan in their metadata
  const rawPlan = user?.publicMetadata?.subscriptionPlan as string;
  
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
