import { useUser, useClerk } from '@clerk/clerk-react';
import { useSubscription } from './useSubscription';

export const useClerkBilling = () => {
  const { user, isSignedIn } = useUser();
  const { openSignUp } = useClerk();
  const { isPaidUser } = useSubscription();

  // Obtener la suscripción activa del usuario
  const activeSubscription = user?.publicMetadata?.subscription as any;
  
  // Verificar si tiene una suscripción activa
  const hasActiveSubscription = activeSubscription?.status === 'active';
  
  // Obtener el plan actual
  const currentPlan = activeSubscription?.planId || 'free';
  
  // Función para redirigir al portal de billing de Clerk
  const openBillingPortal = () => {
    // Redirigir al portal de usuario de Clerk donde puede gestionar su suscripción
    // En desarrollo: https://blessed-snapper-43.accounts.dev/user
    // En producción: https://accounts.clerk.com/user (o tu dominio personalizado)
    // 
    // En este portal el usuario puede:
    // - Ver su plan actual
    // - Cambiar de plan (upgrade/downgrade)
    // - Suscribirse si no tiene plan
    // - Ver próxima fecha de renovación
    // - Actualizar método de pago
    // - Cancelar suscripción
    // - Ver historial de pagos
    window.location.href = 'https://blessed-snapper-43.accounts.dev/user';
  };

  // Función para iniciar el checkout de un plan
  const subscribeToPlan = (planId: string) => {
    if (!isSignedIn) {
      // Si no está logueado, abrir signup con el plan en los metadatos
      openSignUp({
        afterSignUpUrl: `/?subscribe=${planId}`,
        unsafeMetadata: {
          selectedPlan: planId,
        },
      });
    } else {
      // Si ya está logueado, ir directamente al checkout de Clerk
      // Nota: Clerk maneja la ruta de suscripción automáticamente
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
