# Configurar Webhooks de Clerk para Actualizar Suscripciones

## 🎯 Problema

Cuando un usuario se suscribe a un plan en Clerk, el `publicMetadata` no se actualiza automáticamente. Necesitas configurar webhooks para que esto suceda.

## 📋 Pasos para Configurar Webhooks

### 1. Crear un Endpoint de Webhook

Clerk enviará eventos a tu servidor cuando:
- Un usuario se suscribe
- Un usuario cambia de plan
- Un usuario cancela su suscripción
- Un pago se procesa

### 2. En el Dashboard de Clerk

1. Ve a **Webhooks** en el menú lateral
2. Click en **"Add Endpoint"**
3. **Endpoint URL**: 
   - Desarrollo: `https://tu-ngrok-url.ngrok.io/api/webhooks/clerk`
   - Producción: `https://tu-dominio.com/api/webhooks/clerk`

4. **Eventos a suscribirse**:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

5. Copia el **Signing Secret** (lo necesitarás)

### 3. Solución Temporal (Sin Backend)

Si no tienes un backend, puedes actualizar el metadata manualmente:

#### En el Dashboard de Clerk:

1. **Users** → Selecciona el usuario
2. **Metadata** → **Public metadata**
3. Agrega:

```json
{
  "subscriptionPlan": "cplan_30VxITOcfVN0hdOhJXvXuWjspgl"
}
```

4. Guarda

#### Automatizar con Clerk Actions (Recomendado):

Clerk permite ejecutar acciones automáticas cuando ocurren eventos. Puedes configurar una acción que actualice el metadata cuando un usuario se suscribe.

1. Ve a **Actions** en el dashboard
2. Crea una nueva acción
3. Trigger: `subscription.created`
4. Acción: Actualizar `publicMetadata` del usuario

## 🔄 Flujo Completo con Webhooks

```
Usuario se suscribe
    ↓
Clerk procesa el pago
    ↓
Clerk envía webhook a tu servidor
    ↓
Tu servidor actualiza el metadata del usuario
    ↓
Tu app lee el nuevo metadata
    ↓
Badge se actualiza automáticamente
```

## 💡 Alternativa: Usar Clerk Billing Integrado

Si usas Clerk Billing (la funcionalidad de monetización de Clerk), esto se maneja automáticamente:

1. **Habilita Clerk Billing** en el dashboard
2. **Conecta Stripe** a Clerk
3. **Crea tus planes** en Clerk Billing
4. Clerk actualiza el metadata automáticamente

## 🧪 Para Probar Ahora (Manual)

Mientras configuras los webhooks, actualiza manualmente:

1. Dashboard → Users → Tu usuario
2. Public metadata:

```json
{
  "subscriptionPlan": "cplan_30VxITOcfVN0hdOhJXvXuWjspgl"
}
```

3. Refresca tu app
4. Deberías ver "$9.99/mo" en lugar de "Free Trial"

## 📝 Mapeo de Planes

Asegúrate de que el Plan Key coincida:

| Plan | Plan Key | Precio |
|------|----------|--------|
| 1K páginas | `cplan_30VxITOcfVN0hdOhJXvXuWjspgl` | $9.99 |
| 10K páginas | `cplan_33l2AseFDpR7GMjqvzVPWJNkOSj` | $19 |
| 20K páginas | `cplan_33l2ONRsdHgAyPiYJnwXAOdVQxx` | $29 |
| 30K páginas | `cplan_33l2VHGf01xpsZmz2dRzXnoNfkd` | $69 |
| 50K páginas | `cplan_33l2aMhzclUW6kpY59ctbo1hpcH` | $89 |

## 🚀 En Producción

Una vez en producción:
1. Configura webhooks con tu URL real
2. Verifica el signing secret
3. Los metadata se actualizarán automáticamente
4. No necesitarás intervención manual
