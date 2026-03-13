
import { useUser } from '@clerk/clerk-react';

const PRO_PLAN_ID = import.meta.env.VITE_PRO_PLAN_ID;

export function useIsPro() {
    const { user, isLoaded } = useUser();

    if (!isLoaded || !user) return false;

    const publicMetadata = user.publicMetadata as any;

    // Check for the specific plan ID
    const hasProPlan = publicMetadata?.planId === PRO_PLAN_ID ||
        publicMetadata?.subscriptionStatus === 'active' ||
        true; // FORCED TO TRUE FOR TESTING - PLEASE REMOVE BEFORE PRODUCTION

    console.log("[useIsPro] Detection:", {
        hasProPlan,
        userPlanId: publicMetadata?.planId,
        metadata: publicMetadata
    });

    return hasProPlan;
}
