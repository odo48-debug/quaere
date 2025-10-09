# Configuración de Clerk Billing para Quaere

## 📋 Pasos para configurar Clerk Billing

### 1. Habilitar Clerk Billing en el Dashboard

1. Ve a tu [Dashboard de Clerk](https://dashboard.clerk.com)
2. Selecciona tu aplicación
3. Navega a **"Monetization"** en el menú lateral
4. Haz clic en **"Enable Billing"**
5. Conecta tu cuenta de Stripe (Clerk usa Stripe como procesador de pagos)

### 2. Crear los 6 Planes de Suscripción

En la sección de **"Products"** o **"Plans"**, crea estos planes:

#### Plan 1: Starter
- **Nombre**: Starter
- **ID**: `starter`
- **Precio**: $9/mes
- **Metadata**:
  ```json
  {
    "pagesPerMonth": 1000,
    "maxPagesPerPdf": 50
  }
  ```

#### Plan 2: Basic
- **Nombre**: Basic
- **ID**: `basic`
- **Precio**: $19/mes
- **Metadata**:
  ```json
  {
    "pagesPerMonth": 10000,
    "maxPagesPerPdf": 50
  }
  ```

#### Plan 3: Professional
- **Nombre**: Professional
- **ID**: `professional`
- **Precio**: $29/mes
- **Metadata**:
  ```json
  {
    "pagesPerMonth": 100000,
    "maxPagesPerPdf": 50
  }
  ```

#### Plan 4: Business
- **Nombre**: Business
- **ID**: `business`
- **Precio**: $49/mes
- **Metadata**:
  ```json
  {
    "pagesPerMonth": 200000,
    "maxPagesPerPdf": 50
  }
  ```

#### Plan 5: Enterprise
- **Nombre**: Enterprise
- **ID**: `enterprise`
- **Precio**: $69/mes
- **Metadata**:
  ```json
  {
    "pagesPerMonth": 500000,
    "maxPagesPerPdf": 50
  }
  ```

#### Plan 6: Ultimate
- **Nombre**: Ultimate
- **ID**: `ultimate`
- **Precio**: $89/mes
- **Metadata**:
  ```json
  {
    "pagesPerMonth": 1000000,
    "maxPagesPerPdf": 50
  }
  ```

### 3. Configurar el Free Trial

En cada plan, configura:
- **Trial Period**: 7 días
- **Trial Requires Payment Method**: No (para que no pidan tarjeta)

### 4. Configurar Webhooks

Clerk enviará webhooks cuando:
- Un usuario se suscribe
- Una suscripción se renueva
- Una suscripción se cancela
- Un pago falla

Los webhooks actualizarán automáticamente el `publicMetadata` del usuario con:
```json
{
  "subscriptionPlan": "professional",
  "subscription": {
    "status": "active",
    "planId": "professional",
    "currentPeriodEnd": "2025-11-08T00:00:00Z"
  }
}
```

### 5. Configurar las Rutas de Billing

Clerk proporciona componentes pre-construidos para:

- `/subscribe?plan=professional` - Checkout para suscribirse
- `/billing` - Portal de gestión de suscripción
- `/billing/success` - Página de éxito después del pago
- `/billing/cancel` - Página si el usuario cancela

### 6. Variables de Entorno

Asegúrate de tener estas variables en tu `.env`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

### 7. Componentes de Clerk para Billing

Clerk proporciona componentes React que puedes usar:

```tsx
import { SubscriptionButton, BillingPortal } from '@clerk/clerk-react';

// Botón para suscribirse
<SubscriptionButton planId="professional" />

// Portal de gestión
<BillingPortal />
```

## 🔄 Flujo de Usuario

1. **Usuario nuevo** → Free trial de 7 días automático
2. **Durante trial** → Acceso completo a 1,000 páginas/mes
3. **Día 7** → Notificación de que el trial termina pronto
4. **Día 8** → Si no se suscribió, se bloquea el acceso
5. **Usuario elige plan** → Click en "Start 7-day free trial"
6. **Clerk maneja el checkout** → Sin tarjeta durante trial
7. **Día 14** → Se cobra automáticamente si no cancela
8. **Usuario activo** → Acceso según su plan

## 📊 Gestión de Suscripciones

Los usuarios pueden:
- Ver su plan actual en el sidebar
- Cambiar de plan (upgrade/downgrade)
- Cancelar su suscripción
- Ver historial de pagos
- Actualizar método de pago

Todo esto se maneja en `/billing` que Clerk proporciona automáticamente.

## 🧪 Modo de Prueba

Durante el desarrollo:
1. Usa las claves de test de Clerk
2. Usa las tarjetas de prueba de Stripe:
   - `4242 4242 4242 4242` - Pago exitoso
   - `4000 0000 0000 0002` - Pago rechazado
3. Los webhooks funcionan igual en modo test

## 🚀 Pasar a Producción

1. Cambia a las claves de producción en Clerk
2. Verifica que Stripe esté en modo live
3. Configura los webhooks de producción
4. Prueba el flujo completo con una tarjeta real
5. Monitorea los pagos en el dashboard de Stripe

## 📚 Recursos

- [Documentación de Clerk Billing](https://clerk.com/docs/billing)
- [Clerk + Stripe Integration](https://clerk.com/docs/integrations/stripe)
- [Webhooks de Clerk](https://clerk.com/docs/webhooks)
