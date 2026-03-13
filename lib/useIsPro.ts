
import { useUser } from '@clerk/clerk-react';

const PRO_PLAN_ID = import.meta.env.VITE_PRO_PLAN_ID;

export function useIsPro() {
    const { user, isLoaded } = useUser();

    if (!isLoaded || !user) return false;

    const publicMetadata = user.publicMetadata as any;

    // Check for the specific plan ID or status
    const hasProPlan =
        publicMetadata?.plan === 'pro' ||
        publicMetadata?.planId === PRO_PLAN_ID ||
        publicMetadata?.subscriptionStatus === 'active' ||
        publicMetadata?.subscription === 'active' ||
        publicMetadata?.stripe_subscription_status === 'active';

    console.log("[useIsPro] Detection:", {
        hasProPlan,
        userPlanId: publicMetadata?.planId,
        plan: publicMetadata?.plan,
        subscriptionStatus: publicMetadata?.subscriptionStatus || publicMetadata?.subscription,
        metadata: publicMetadata
    });

    return hasProPlan;
}
