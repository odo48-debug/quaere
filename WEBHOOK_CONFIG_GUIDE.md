# 🔗 Guía de Configuración de Webhooks de Clerk

Esta guía te ayudará a configurar webhooks para que Clerk actualice automáticamente el metadata de los usuarios cuando se suscriban a un plan.

## 📦 Paso 1: Instalar Dependencias

Ejecuta en tu terminal:

```bash
npm install @clerk/backend svix
```

Esto instalará:
- `@clerk/backend`: SDK de Clerk para Node.js (para actualizar metadata)
- `svix`: Librería para verificar firmas de webhooks (seguridad)

## 🔐 Paso 2: Configurar Variables de Entorno

### En tu archivo `.env` local:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsu...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### En Vercel (Settings → Environment Variables):

Agrega las mismas variables:
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` (lo obtendrás en el siguiente paso)

## 🌐 Paso 3: Configurar Webhook en Clerk Dashboard

1. **Ve a Clerk Dashboard**: https://dashboard.clerk.com
2. **Selecciona tu aplicación**
3. **Ve a "Webhooks"** en el menú lateral
4. **Click en "Add Endpoint"**

### Configuración del Endpoint:

**Endpoint URL:**
```
https://quaere.es/api/webhooks/clerk
```
(O tu dominio de Vercel si aún no tienes dominio custom)

**Eventos a suscribirse:**

**Eventos de Subscription:**
- ✅ `subscription.created`
- ✅ `subscription.updated`
- ✅ `subscription.active`
- ✅ `subscription.pastDue`

**Eventos de SubscriptionItem:**
- ✅ `subscriptionItem.created`
- ✅ `subscriptionItem.updated`
- ✅ `subscriptionItem.canceled`
- ✅ `subscriptionItem.ended`

5. **Guarda el endpoint**
6. **Copia el "Signing Secret"** (empieza con `whsec_...`)
7. **Agrega el secret** a tus variables de entorno como `CLERK_WEBHOOK_SECRET`

## 🚀 Paso 4: Desplegar

1. **Commit y push** tus cambios:
```bash
git add .
git commit -m "Add Clerk webhooks support"
git push
```

2. **Vercel desplegará automáticamente**

3. **Verifica** que las variables de entorno estén configuradas en Vercel

## 🧪 Paso 5: Probar el Webhook

### Opción A: Probar en Clerk Dashboard

1. Ve a **Webhooks** → Tu endpoint
2. Click en **"Send test event"**
3. Selecciona `subscription.created`
4. Envía el evento
5. Verifica los logs en Vercel

### Opción B: Hacer una suscripción real

1. Crea un usuario de prueba
2. Suscríbete a un plan
3. Verifica que el metadata se actualice automáticamente

## 🔍 Verificar que Funciona

1. **Ve a Clerk Dashboard** → **Users** → Tu usuario
2. **Public metadata** debería mostrar:
```json
{
  "subscriptionPlan": "cplan_319hW2htCwc28QLuofa6V11jwmf"
}
```

3. **En tu app**, el usuario debería ver su plan correcto (no "Free Trial")

## 📊 Estructura de Eventos

### `subscription.created` / `subscription.updated`

```json
{
  "type": "subscription.created",
  "data": {
    "user_id": "user_xxx",
    "plan_id": "cplan_319hW2htCwc28QLuofa6V11jwmf",
    "status": "active"
  }
}
```

### `subscription.deleted`

```json
{
  "type": "subscription.deleted",
  "data": {
    "user_id": "user_xxx"
  }
}
```

## 🐛 Troubleshooting

### El webhook no se ejecuta

1. **Verifica la URL** del endpoint en Clerk Dashboard
2. **Revisa los logs** en Vercel → Deployments → Functions
3. **Verifica** que `CLERK_WEBHOOK_SECRET` esté configurado

### Error 400: Invalid signature

- El `CLERK_WEBHOOK_SECRET` es incorrecto
- Cópialo nuevamente desde Clerk Dashboard

### El metadata no se actualiza

1. **Verifica** que `CLERK_SECRET_KEY` esté configurado
2. **Revisa los logs** del webhook en Vercel
3. **Verifica** que el `plan_id` esté en el mapeo de `CLERK_PLAN_KEY_MAP`

## 🔄 Mapeo de Planes

Asegúrate de que estos Plan IDs coincidan con los de tu Clerk Dashboard:

```typescript
const CLERK_PLAN_KEY_MAP = {
  'cplan_319hW2htCwc28QLuofa6V11jwmf': 'plan_1k',   // 1,000 pages
  'cplan_33qFJk5cGYUXNFYDawgsXWarwXj': 'plan_5k',   // 5,000 pages
  'cplan_33qNbCHvQp2wAZkzNniwqmX1exZ': 'plan_10k',  // 10,000 pages
  'cplan_33qNlc6TwLpUh3BdqMYBJbdYLQZ': 'plan_20k',  // 20,000 pages
  'cplan_33qOHQx7ztKhoaJeipqwfkt4TuY': 'plan_40k',  // 40,000 pages
};
```

## ✅ Checklist Final

- [ ] Instaladas dependencias (`@clerk/backend`, `svix`)
- [ ] Variables de entorno configuradas (local y Vercel)
- [ ] Webhook creado en Clerk Dashboard
- [ ] Signing Secret copiado y configurado
- [ ] Código desplegado en Vercel
- [ ] Webhook probado (test event o suscripción real)
- [ ] Metadata del usuario actualizado correctamente

## 📝 Notas

- Los webhooks solo funcionan en **producción** (no en localhost)
- Para desarrollo local, usa **ngrok** o actualiza el metadata manualmente
- El webhook se ejecuta **automáticamente** cuando un usuario se suscribe
- No necesitas intervención manual una vez configurado

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel
2. Verifica la configuración en Clerk Dashboard
3. Asegúrate de que todas las variables de entorno estén configuradas
