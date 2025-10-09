# Quaere - Setup Guide

## 🚀 Configuración con Clerk

### 1. Variables de Entorno

Tu archivo `.env` ya está configurado con las credenciales de Clerk:

```env
GEMINI_API_KEY=TU_API_KEY_DE_GEMINI

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
```

### 2. Configuración de Planes en Clerk

Para que el sistema de suscripciones funcione, necesitas configurar los metadatos de usuario en Clerk:

#### En el Dashboard de Clerk:

1. Ve a **Users** → Selecciona un usuario
2. En **Public Metadata**, agrega:
   ```json
   {
     "subscriptionPlan": "free"
   }
   ```
3. Para usuarios Pro:
   ```json
   {
     "subscriptionPlan": "pro"
   }
   ```

### 3. Integración con Stripe (Opcional - Para Pagos)

Para habilitar pagos reales:

1. Ve a Clerk Dashboard → **Integrations** → **Stripe**
2. Conecta tu cuenta de Stripe
3. Configura los productos:
   - **Free Plan**: $0
   - **Pro Plan**: $99/mes

4. Configura webhooks de Stripe para actualizar `subscriptionPlan` en los metadatos del usuario cuando se complete un pago.

### 4. Instalación de Dependencias

```bash
npm install
```

### 5. Ejecutar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📋 Características Implementadas

### ✅ Autenticación con Clerk
- Sign In / Sign Up modal
- Gestión de sesiones
- Botón de usuario con dropdown

### ✅ Sistema de Suscripciones
- **Plan FREE**: 5 PDFs/día, máx 10 páginas
- **Plan PRO**: PDFs ilimitados, máx 50 páginas

### ✅ Límites de Uso
- Tracking de PDFs procesados por día
- Reset automático diario
- Mensajes de error cuando se alcanzan límites

### ✅ Landing Page Moderna
- Hero section con gradientes
- Features section
- Pricing section con planes FREE y PRO
- Navegación sticky con auth buttons

### ✅ Privacidad Mantenida
- Procesamiento 100% en el navegador
- PDFs nunca se suben a servidor
- Solo texto extraído se envía a Gemini API

## 🔧 Próximos Pasos

1. **Configurar Stripe** para pagos reales
2. **Crear webhook** para actualizar metadatos de usuario tras pago
3. **Agregar analytics** para tracking de uso
4. **Implementar dashboard** de usuario con estadísticas

## 📝 Notas

- Los límites de uso se almacenan en `localStorage` por usuario
- El plan del usuario se lee de `user.publicMetadata.subscriptionPlan`
- Para testing, puedes cambiar manualmente el plan en Clerk Dashboard
