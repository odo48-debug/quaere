# Planes Configurados en Clerk

## 📊 Resumen de Planes

Has creado 6 planes en Clerk (1 free + 5 de pago):

| Plan | Páginas/mes | Precio | Plan Key (Clerk) | Plan ID (Nombre) |
|------|-------------|--------|------------------|------------------|
| **Free Trial** | 1,000 | $0 (7 días) | - | `free` |
| **1000 Pages** | 1,000 | $9.99/mes | `cplan_30VxITOcfVN0hdOhJXvXuWjspgl` | `1000_pages` |
| **10000 Pages** | 10,000 | $19/mes | `cplan_33l2AseFDpR7GMjqvzVPWJNkOSj` | `10000_pages` |
| **20000 Pages** | 20,000 | $29/mes | `cplan_33l2ONRsdHgAyPiYJnwXAOdVQxx` | `20000_pages` |
| **30000 Pages** | 30,000 | $69/mes | `cplan_33l2VHGf01xpsZmz2dRzXnoNfkd` | `30000_pages` |
| **50000 Pages** | 50,000 | $89/mes | `cplan_33l2aMhzclUW6kpY59ctbo1hpcH` | `50000_pages` |

## 🔧 Configuración en Clerk

### Para cada plan en Clerk, asegúrate de configurar:

#### 1. Plan 1K
```json
{
  "name": "Plan 1K",
  "planId": "plan_1k",
  "price": 9.99,
  "interval": "month",
  "metadata": {
    "pagesPerMonth": 1000,
    "maxPagesPerPdf": 50
  }
}
```

#### 2. Plan 10K
```json
{
  "name": "Plan 10K",
  "planId": "plan_10k",
  "price": 19,
  "interval": "month",
  "metadata": {
    "pagesPerMonth": 10000,
    "maxPagesPerPdf": 50
  }
}
```

#### 3. Plan 20K
```json
{
  "name": "Plan 20K",
  "planId": "plan_20k",
  "price": 29,
  "interval": "month",
  "metadata": {
    "pagesPerMonth": 20000,
    "maxPagesPerPdf": 50
  }
}
```

#### 4. Plan 30K
```json
{
  "name": "Plan 30K",
  "planId": "plan_30k",
  "price": 69,
  "interval": "month",
  "metadata": {
    "pagesPerMonth": 30000,
    "maxPagesPerPdf": 50
  }
}
```

#### 5. Plan 50K
```json
{
  "name": "Plan 50K",
  "planId": "plan_50k",
  "price": 89,
  "interval": "month",
  "metadata": {
    "pagesPerMonth": 50000,
    "maxPagesPerPdf": 50
  }
}
```

## 🎯 Cómo usar los Plan IDs y Plan Keys

### Plan ID
El **Plan ID** es el identificador único que usas en tu código para referenciar el plan:
```typescript
subscribeToPlan('plan_20k'); // Suscribir al plan de 20K páginas
```

### Plan Key
El **Plan Key** es la clave de API que Clerk usa internamente para identificar el plan en Stripe.

## 🔄 Actualización de Metadata del Usuario

Cuando un usuario se suscribe, Clerk actualiza automáticamente su `publicMetadata` con el **Plan Key**:

```json
{
  "subscriptionPlan": "cplan_33l2ONRsdHgAyPiYJnwXAOdVQxx"
}
```

O con el **Plan ID** (nombre):

```json
{
  "subscriptionPlan": "20000_pages"
}
```

Tu aplicación automáticamente convierte cualquiera de estos formatos al plan interno correcto y aplica los límites correspondientes.

### Mapeo Automático

El código convierte automáticamente:
- `cplan_33l2ONRsdHgAyPiYJnwXAOdVQxx` → `plan_20k` (20,000 páginas/mes)
- `20000_pages` → `plan_20k` (20,000 páginas/mes)
- `plan_20k` → `plan_20k` (20,000 páginas/mes)

Todos funcionan correctamente.

## 🧪 Probar los Planes

### En modo desarrollo:
1. Crea un usuario de prueba
2. En el dashboard de Clerk, ve al usuario
3. Edita el `publicMetadata` manualmente:
   ```json
   {
     "subscriptionPlan": "plan_20k"
   }
   ```
4. Refresca tu app y verás que el usuario tiene acceso a 20,000 páginas/mes

### En producción:
1. Usuario hace clic en "Start 7-day free trial"
2. Selecciona el plan con el slider
3. Clerk redirige a `/subscribe?plan=plan_20k`
4. Usuario completa el checkout
5. Clerk actualiza el metadata automáticamente

## 📱 URLs de Clerk

- **Checkout**: `/subscribe?plan=plan_20k`
- **Portal de gestión**: `/billing`
- **Éxito**: `/billing/success`
- **Cancelación**: `/billing/cancel`

## 💰 Precios Actuales

- **1K páginas**: $9.99/mes
- **10K páginas**: $19/mes
- **20K páginas**: $29/mes
- **30K páginas**: $69/mes
- **50K páginas**: $89/mes

Todos los planes incluyen:
- ✅ 7 días de prueba gratis
- ✅ PDFs ilimitados
- ✅ Hasta 50 páginas por PDF
- ✅ Context caching para PDFs grandes
- ✅ Chat AI ilimitado

## 🔐 Variables de Entorno

Asegúrate de tener en tu `.env`:

```env
GEMINI_API_KEY="tu_api_key"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

## 📊 Monitoreo

Puedes ver en el dashboard de Clerk:
- Usuarios activos por plan
- Ingresos mensuales recurrentes (MRR)
- Tasa de conversión del trial
- Cancelaciones (churn)
