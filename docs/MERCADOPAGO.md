# Cobrar la suscripción Pro

Esta guía explica cómo encender el cobro cuando llegue el momento.

**Hoy el cobro está APAGADO a propósito.** La pantalla Pro junta interesados en
una lista de espera, pero no le pide la tarjeta a nadie. Antes de encenderlo hay
tres cosas que resolver, y ninguna es de programación.

---

## Antes de encender el cobro

### 1. Tener algo que dar a cambio

De los beneficios que promete Pro, **casi todos dependen de acuerdos con los
locales**:

| Beneficio | De qué depende |
|---|---|
| Prioridad de ingreso | Que el local reconozca el QR en la puerta |
| Descuento en consumiciones | Que el local acepte el descuento |
| Preventas exclusivas | Acuerdo + sistema de entradas |
| Canjear puntos por tragos | Que el local entregue el trago |
| Aviso antes de que se llene | Notificaciones push — es trabajo nuestro, no depende de nadie |

Si alguien paga AR$ 1.500 y en la puerta del boliche el descuento no existe, el
problema no es devolverle la plata: es que esa persona no vuelve ni recomienda
la app. **Con un solo local adherido ya se puede empezar**, siempre que la
pantalla diga cuáles son.

### 2. Hablar con un contador

Cobrar una suscripción implica facturar. Hay que definir bajo qué figura
cobrás (monotributo, sociedad) y cómo emitís los comprobantes.

Esto es distinto —y mucho más simple— que la billetera, que implicaría
**custodiar plata de terceros** y tiene obligaciones bastante más pesadas. Por
eso la billetera sigue siendo una demo y la recomendación es dejarla así.

### 3. Términos y condiciones + política de privacidad

No es opcional:

- Apple y Google no aprueban apps sin eso.
- La app maneja **la ubicación de las personas**, que es un dato sensible.
- Cobrar una suscripción recurrente exige explicar cómo se cancela.

---

## Cómo se conecta Mercado Pago

### 1. Sacar las credenciales

1. Entrá a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
   con tu cuenta.
2. **Tus integraciones** → **Crear aplicación**. Nombre: `SALGO`. Elegí
   *Suscripciones* / pagos recurrentes.
3. En **Credenciales** vas a ver dos juegos:
   - **Credenciales de prueba** — para probar sin plata real. Empezá por acá.
   - **Credenciales de producción** — cobran de verdad.

De cada juego hay dos valores:

| Valor | Qué es | Dónde va |
|---|---|---|
| **Public Key** | Pública, identifica tu cuenta | Puede ir en el código |
| **Access Token** | **SECRETO.** Permite cobrar y mover plata | Solo en Supabase |

> ⚠️ **El Access Token no va nunca en el código de la app, ni en el repositorio,
> ni por chat.** Si estuviera en el código, cualquiera lo lee abriendo las
> herramientas del navegador y podría cobrar en tu nombre. Si alguna vez se te
> escapa, entrá a Mercado Pago y regeneralo enseguida.

### 2. Guardar el secreto en Supabase

El Access Token vive en los secretos de Supabase, donde solo lo lee la función
del servidor:

1. Supabase → **Edge Functions** → **Secrets** (o **Project Settings → Edge
   Functions**).
2. Agregá:

| Nombre | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | El Access Token de Mercado Pago |
| `MP_WEBHOOK_SECRET` | La clave secreta del webhook (paso 4) |
| `APP_ORIGIN` | `https://salgooficial.netlify.app` |
| `PRO_COBRO_ACTIVO` | `false` — el interruptor. Ver abajo |

### 3. Publicar la función

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) instalada:

```bash
supabase functions deploy pro --project-ref xpsybuxkfpslnbobfeec
```

Para comprobar que quedó publicada:

```bash
curl -X POST https://xpsybuxkfpslnbobfeec.supabase.co/functions/v1/pro/estado \
  -H "apikey: <la Publishable key>"
# Tiene que responder: {"cobro_activo":false}
```

### 4. Configurar el aviso de pagos (webhook)

Mercado Pago avisa a la app cuando alguien paga, cuando el débito falla o
cuando alguien cancela. Sin esto, un pago se cobra pero la persona nunca
aparece como Pro.

1. En tu aplicación de Mercado Pago → **Webhooks** → **Configurar
   notificaciones**.
2. URL: `https://xpsybuxkfpslnbobfeec.supabase.co/functions/v1/pro/webhook`
3. Evento: **Suscripciones** (`subscription_preapproval`).
4. Mercado Pago te muestra una **clave secreta**: copiala y guardala en
   Supabase como `MP_WEBHOOK_SECRET` (paso 2).

> Esa clave es lo que permite verificar que el aviso viene de verdad de Mercado
> Pago. Sin ella, cualquiera podría mandar un mensaje diciendo "este usuario
> pagó" y volverse Pro gratis. La función rechaza todo aviso que no venga
> firmado — y además, cuando recibe uno, **le vuelve a preguntar a Mercado Pago
> cuál es el estado real** en vez de creerle al mensaje.

### 5. Probar sin plata real

1. Poné las credenciales **de prueba** en `MP_ACCESS_TOKEN`.
2. Poné `PRO_COBRO_ACTIVO` en `true`.
3. En la app, entrá a Pro y tocá "Activar SALGO Pro".
4. Mercado Pago te lleva a su pantalla de pago. Usá una
   [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/test/cards)
   (por ejemplo Visa `4509 9535 6623 3704`, cualquier vencimiento futuro,
   código `123`).
5. Al volver, la pantalla tiene que mostrarte como Pro **sola, sin recargar**.

Si no pasa: Supabase → **Edge Functions** → **Logs** de la función `pro`. Ahí
figura si el aviso llegó y si la firma se validó.

---

## El interruptor

`PRO_COBRO_ACTIVO` decide todo:

| Valor | Qué pasa |
|---|---|
| `false` (hoy) | La pantalla Pro junta emails. El botón de contratar no aparece. Si alguien intentara llamar a la función igual, responde que el cobro está apagado |
| `true` | Aparece el botón y se puede contratar de verdad |

Vive en el servidor, no en la app: nadie lo puede encender desde su navegador.

**Cuando pases a cobrar de verdad**, acordate de cambiar también
`MP_ACCESS_TOKEN` por el de producción. Con el de prueba, los pagos no son
reales aunque el botón funcione.

---

## Cómo se protege la suscripción

Lo más importante del diseño: **la tabla de suscripciones no acepta escrituras
desde la app**. Ni una. Ninguna persona puede marcarse como Pro, ni siquiera en
su propia fila.

La única forma de activar una suscripción es que la función del servidor lo
haga, y solo después de que Mercado Pago confirmó el pago. Hay tests que lo
verifican:

```bash
./supabase/test.sh
```

Entre las 62 verificaciones están:

- Ana no puede crearse una suscripción activa
- Ana no puede estirar su fecha de vencimiento
- Ana no puede borrar su suscripción para evitar el cobro
- Beto no ve la suscripción de Ana
- Una suscripción vencida no da Pro, aunque figure activa
- Una suscripción cancelada no da Pro aunque el período siga vigente

---

## Precios

Están en el servidor (`supabase/functions/pro/index.ts`), no en la app: si
estuvieran en el navegador, se podrían cambiar desde las herramientas de
desarrollo antes de pagar.

| Plan | Por mes | Total |
|---|---|---|
| 1 mes | AR$ 1.500 | AR$ 1.500 |
| 3 meses | AR$ 1.350 | AR$ 4.050 |
| 12 meses | AR$ 1.200 | AR$ 14.400 |

Es **débito automático**: Mercado Pago cobra solo cada período hasta que la
persona cancele. Cancelar no le saca lo que ya pagó — sigue siendo Pro hasta
que termine el período.

Mercado Pago cobra una comisión por cada transacción (rondaba el 6%, conviene
confirmarlo en su sitio porque cambia).

---

## Si algo no funciona

| Qué ves | Qué pasó |
|---|---|
| El botón de contratar no aparece | `PRO_COBRO_ACTIVO` no está en `true` |
| "El cobro todavía no está habilitado" | Lo mismo, pero la función sí responde |
| Se paga pero la persona no queda como Pro | El webhook no está configurado, o la clave secreta no coincide |
| "Firma inválida" en los logs | `MP_WEBHOOK_SECRET` no coincide con la de Mercado Pago |
| "No pude crear la suscripción" | El Access Token está mal, o es de prueba mientras la cuenta espera producción |
| Cobra de verdad cuando querías probar | Estás con credenciales de producción; volvé a las de prueba |
