# Portal de Gestión de Suscripciones - Clerk

## 🎯 Funcionalidades del UserButton

El botón de usuario ahora incluye:

### 📊 Información de Suscripción
- **Free Trial**: Muestra "Free Trial Active" con días restantes
- **Usuario de Pago**: Muestra precio mensual y páginas incluidas
- **Trial Terminado**: Mensaje para elegir un plan

### 🔧 Opciones del Menú
1. **Manage Subscription** (usuarios de pago):
   - Ver plan actual
   - Cambiar de plan (upgrade/downgrade)
   - Ver próxima renovación
   - Actualizar método de pago
   - Cancelar suscripción
   - Ver historial de pagos

2. **Choose a Plan** (usuarios sin plan):
   - Redirige a la página de pricing
   - Permite seleccionar un plan

3. **Sign Out**: Cerrar sesión

## 🔐 Configuración en Clerk Dashboard

### Paso 1: Habilitar el Portal de Usuario

1. Ve a tu [Dashboard de Clerk](https://dashboard.clerk.com)
2. Selecciona tu aplicación
3. Ve a **"User & Authentication"** → **"User Profile"**
4. Habilita **"User Profile"**
5. Asegúrate de que esté habilitado **"Subscription Management"**

### Paso 2: Configurar Billing Portal

1. Ve a **"Monetization"** → **"Settings"**
2. En **"Customer Portal"**, habilita:
   - ✅ Allow customers to update payment method
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to cancel subscription
   - ✅ Allow customers to change plans

### Paso 3: Configurar URLs de Retorno

En **"Monetization"** → **"Settings"** → **"URLs"**:

```
Success URL: https://tu-dominio.com/?billing=success
Cancel URL: https://tu-dominio.com/?billing=cancel
```

Para desarrollo:
```
Success URL: http://localhost:3000/?billing=success
Cancel URL: http://localhost:3000/?billing=cancel
```

## 📱 Cómo Funciona

### Para Usuarios con Suscripción Activa:

1. **Click en el avatar** → Menú desplegable se abre
2. **Ver información**:
   - Nombre y email
   - Plan actual ($X/mes)
   - Páginas incluidas
3. **Click en "Manage Subscription"**
4. **Portal de Clerk se abre** con opciones:
   - 📊 **Plan actual**: Detalles del plan
   - 🔄 **Cambiar plan**: Upgrade o downgrade
   - 📅 **Próxima renovación**: Fecha y monto
   - 💳 **Método de pago**: Actualizar tarjeta
   - 🗑️ **Cancelar**: Cancelar suscripción
   - 📄 **Facturas**: Ver historial

### Para Usuarios sin Suscripción:

1. **Click en el avatar** → Menú desplegable
2. **Ver mensaje**: "Trial ended - Subscribe to continue"
3. **Click en "Choose a Plan"**
4. **Redirige a pricing** para seleccionar plan

## 🎨 Diseño del Menú

```
┌─────────────────────────────┐
│ John Doe                    │
│ john@example.com            │
├─────────────────────────────┤
│ $29/month                   │
│ 20,000 pages/month          │
├─────────────────────────────┤
│ Manage Subscription         │
│ Sign Out                    │
└─────────────────────────────┘
```

## 🔄 Flujo de Cambio de Plan

### Upgrade (ej: de 10K a 20K páginas):

1. Usuario click en "Manage Subscription"
2. Portal de Clerk muestra planes disponibles
3. Usuario selecciona plan superior
4. Clerk calcula prorrateado
5. Cobra diferencia inmediatamente
6. Actualiza metadata del usuario
7. Usuario tiene acceso instantáneo al nuevo límite

### Downgrade (ej: de 20K a 10K páginas):

1. Usuario click en "Manage Subscription"
2. Portal de Clerk muestra planes disponibles
3. Usuario selecciona plan inferior
4. Cambio se aplica en la próxima renovación
5. Usuario mantiene plan actual hasta entonces
6. En la fecha de renovación, se actualiza automáticamente

### Cancelación:

1. Usuario click en "Manage Subscription"
2. Click en "Cancel Subscription"
3. Clerk pregunta confirmación
4. Usuario confirma
5. Suscripción se cancela al final del período actual
6. Usuario mantiene acceso hasta la fecha de vencimiento
7. Después del vencimiento, vuelve a free (sin acceso)

## 📊 Información Visible para el Usuario

En el portal de Clerk, el usuario puede ver:

- **Plan actual**: Nombre y precio
- **Próxima renovación**: Fecha exacta
- **Monto a cobrar**: En la próxima renovación
- **Método de pago**: Últimos 4 dígitos de la tarjeta
- **Historial de pagos**: Todas las facturas
- **Uso actual**: Páginas procesadas este mes (si lo configuras)

## 🧪 Probar en Desarrollo

1. Inicia sesión en tu app
2. Click en tu avatar (esquina superior derecha)
3. Click en "Manage Subscription"
4. Se abrirá el portal de Clerk en modo test
5. Prueba cambiar de plan, actualizar pago, etc.
6. Todo es simulado (no se cobran cargos reales)

## 🚀 En Producción

Una vez en producción:
1. Cambia las claves de Clerk a producción
2. Configura Stripe en modo live
3. El portal funcionará igual pero con pagos reales
4. Los usuarios verán sus suscripciones reales

## 💡 Ventajas de Usar el Portal de Clerk

✅ **Sin código adicional**: Clerk maneja todo el UI
✅ **Seguro**: PCI compliant automáticamente
✅ **Actualización automática**: Metadata se actualiza solo
✅ **Webhooks incluidos**: Notificaciones automáticas
✅ **Responsive**: Funciona en móvil y desktop
✅ **Internacionalización**: Múltiples idiomas
✅ **Cumplimiento**: GDPR y otras regulaciones

## 🔗 Enlaces Útiles

- [Documentación de Clerk Billing](https://clerk.com/docs/billing)
- [Portal de Usuario](https://clerk.com/docs/components/user-button)
- [Webhooks de Suscripción](https://clerk.com/docs/webhooks/subscription-events)
