import { useUser, useClerk } from '@clerk/clerk-react';
import { useSubscription } from './useSubscription';

export const useClerkBilling = () => {
  const { user, isSignedIn } = useUser();
  const { openSignUp } = useClerk();
  const { isPaidUser } = useSubscription();

  // Get the user's active subscription
  const activeSubscription = user?.publicMetadata?.subscription as any;

  // Check if they have an active subscription
  const hasActiveSubscription = activeSubscription?.status === 'active';

  // Get current plan
  const currentPlan = activeSubscription?.planId || 'free';

  // Function to redirect to Clerk's billing portal
  const openBillingPortal = () => {
    // Redirect to Clerk user portal where they can manage their subscription
    // In development: https://blessed-snapper-43.accounts.dev/user
    // In production: https://accounts.clerk.com/user (or custom domain)
    // 
    // In this portal the user can:
    // - View current plan
    // - Change plan (upgrade/downgrade)
    // - Subscribe if they don't have a plan
    // - See next renewal date
    // - Update payment method
    // - Cancel subscription
    // - View billing history
    window.location.href = 'https://blessed-snapper-43.accounts.dev/user';
  };

  // Function to start a plan checkout
  const subscribeToPlan = (planId: string) => {
    if (!isSignedIn) {
      // If not logged in, open signup with plan in metadata
      openSignUp({
        afterSignUpUrl: `/?subscribe=${planId}`,
        unsafeMetadata: {
          selectedPlan: planId,
        },
      });
    } else {
      // If already logged in, go directly to Clerk checkout
      // Note: Clerk handles the subscription route automatically
      window.location.href = `https://accounts.clerk.com/subscribe?plan=${planId}`;
    }
  };

  return {
    hasActiveSubscription,
    currentPlan,
    activeSubscription,
    openBillingPortal,
    subscribeToPlan,
  };
};
