# Deployment Guide - Quaere PDF Analyzer

## Pre-requisitos

1. **Cuenta en Render.com** (o Netlify/Vercel)
2. **Repositorio Git** con el código
3. **Clerk Account** en modo Producción
4. **Google Gemini API Key**

## Configuración de Planes en Clerk (Producción)

Antes de desplegar, asegúrate de tener los planes configurados en Clerk:

### Planes Actuales (Producción)

| Plan | Páginas/Mes | Precio | Plan ID |
|------|-------------|--------|---------|
| 1K   | 1,000       | $9     | `cplan_319hW2htCwc28QLuofa6V11jwmf` |
| 5K   | 5,000       | $19    | `cplan_33qFJk5cGYUXNFYDawgsXWarwXj` |
| 10K  | 10,000      | $29    | `cplan_33qNbCHvQp2wAZkzNniwqmX1exZ` |
| 20K  | 20,000      | $39    | `cplan_33qNlc6TwLpUh3BdqMYBJbdYLQZ` |
| 40K  | 40,000      | $49    | `cplan_33qOHQx7ztKhoaJeipqwfkt4TuY` |

## Despliegue en Render

### 1. Preparar el Repositorio

```bash
# Asegúrate de que .env esté en .gitignore
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Crear Static Site en Render

1. Ve a https://render.com/dashboard
2. Click en **"New +"** → **"Static Site"**
3. Conecta tu repositorio de GitHub/GitLab
4. Configura:
   - **Name**: `quaere-pdf-analyzer`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### 3. Configurar Variables de Entorno

En la sección **Environment**, añade:

```
GEMINI_API_KEY=tu_gemini_api_key_aqui
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_PLAN_1K=cplan_319hW2htCwc28QLuofa6V11jwmf
VITE_PLAN_5K=cplan_33qFJk5cGYUXNFYDawgsXWarwXj
VITE_PLAN_10K=cplan_33qNbCHvQp2wAZkzNniwqmX1exZ
VITE_PLAN_20K=cplan_33qNlc6TwLpUh3BdqMYBJbdYLQZ
VITE_PLAN_40K=cplan_33qOHQx7ztKhoaJeipqwfkt4TuY
```

### 4. Deploy

Click en **"Create Static Site"**. Render automáticamente:
- Instalará las dependencias
- Ejecutará el build
- Desplegará en un CDN global
- Asignará un dominio HTTPS

## Configurar Webhook de Clerk

Después del despliegue, configura el webhook para sincronizar suscripciones:

1. En Clerk Dashboard → **Webhooks**
2. Añade endpoint: `https://tu-app.onrender.com/api/webhooks/clerk`
3. Selecciona eventos:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`

## Verificación Post-Despliegue

- [ ] La landing page carga correctamente
- [ ] El login con Clerk funciona
- [ ] Los planes de pricing se muestran correctamente
- [ ] El procesamiento de PDFs funciona
- [ ] El chat con Gemini responde
- [ ] Las suscripciones se pueden crear

## Dominios Personalizados

Para añadir un dominio personalizado:

1. En Render Dashboard → tu sitio → **Settings**
2. **Custom Domains** → **Add Custom Domain**
3. Sigue las instrucciones para configurar DNS

## Monitoreo

Render proporciona:
- Logs en tiempo real
- Métricas de tráfico
- Alertas de errores
- Deploy automático en cada push

## Troubleshooting

### Error: Variables de entorno no definidas
- Verifica que todas las variables estén configuradas en Render
- Recuerda que Vite requiere el prefijo `VITE_` para variables del cliente

### Error: Clerk authentication failed
- Verifica que uses la Publishable Key de **Producción** (pk_live_)
- Asegúrate de que el dominio esté en la whitelist de Clerk

### Error: Gemini API no responde
- Verifica que la API key sea válida
- Revisa los límites de cuota de la API
