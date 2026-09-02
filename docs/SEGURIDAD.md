# Seguridad de SALGO — lista de control

Este documento vivía dentro de la app, como una pantalla más que veía cualquier
usuario. No corresponde: es material técnico interno, con fragmentos de código
de autenticación y configuración de servidores. Se movió acá tal cual estaba.

**Nada de esta lista está implementado todavía**, porque en la Etapa 0 no hay
servidor: la app corre entera en el navegador. La lista es la agenda de trabajo
para cuando se levante el backend (Etapa 1) — ver [ROADMAP.md](ROADMAP.md).

Los estados que figuran abajo son los que traía el prototipo. Conviene
revisarlos de nuevo al empezar la Etapa 1.

---


## 1. Autenticación y cuentas

### 🔐 Hashing de contraseñas (bcrypt)

**Estado:** 🔴 Falta — crítico · Pendiente de implementar · Prioridad: Crítico

Las contraseñas nunca se guardan en texto plano. Se usa bcrypt con salt rounds >= 12.

```js
// Node.js + bcrypt
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// Al crear usuario:
const hash = await bcrypt.hash(password, SALT_ROUNDS);
await db.users.create({ email, password: hash });

// Al hacer login:
const valid = await bcrypt.compare(inputPass, user.password);
if (!valid) throw new Error('Credenciales inválidas');
```

> Con Firebase Auth esto se maneja automáticamente. Si usás tu propio backend, implementá bcrypt antes del lanzamiento.

### 📱 Autenticación de dos factores (2FA)

**Estado:** ⚠️ Pendiente / parcial · Opcional por ahora, recomendado para Pro · Prioridad: Alto

OTP por SMS o app (Google Authenticator) para cuentas con billetera activa.

```js
// Firebase Auth ya incluye phone verification:
import { signInWithPhoneNumber } from 'firebase/auth';

const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
// El usuario ingresa el código SMS:
await result.confirm(smsCode);
```

> Activalo primero solo para usuarios con saldo en la billetera > AR$ 5.000.

### ⏱️ Rate limiting en login

**Estado:** 🔴 Falta — crítico · Pendiente · Prioridad: Crítico

Máximo 5 intentos fallidos por IP. Después bloqueo temporal de 15 minutos.

```js
// Express.js + express-rate-limit:
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // intentos máximos
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' },
  standardHeaders: true,
});

app.post('/api/login', loginLimiter, loginHandler);
```

> Firebase Auth tiene rate limiting básico incorporado. Para tu backend, instalá express-rate-limit.

### 🎫 JWT con expiración corta

**Estado:** ⚠️ Pendiente / parcial · Parcialmente implementado · Prioridad: Alto

Tokens de sesión con expiración de 15 min + refresh token de 7 días.

```js
// Al generar el token:
const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
// Guardá el refreshToken en httpOnly cookie, no en localStorage.
```

> Con Firebase Auth los tokens se manejan automáticamente. Si usás JWT propio, nunca lo guardes en localStorage.


## 2. Datos y transporte

### 🔒 HTTPS forzado (SSL/TLS)

**Estado:** ✅ Listo · Activo en Netlify automáticamente · Prioridad: Listo

Todo el tráfico va por HTTPS. HTTP redirige automáticamente a HTTPS.

```js
// Netlify lo hace automáticamente.
// Si usás tu propio servidor (Express):
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

> Netlify y Firebase Hosting incluyen HTTPS con certificado gratuito. Ya estás cubierto para el frontend.

### 🧹 Sanitización de inputs

**Estado:** 🔴 Falta — crítico · Implementar antes del lanzamiento · Prioridad: Crítico

Todo dato ingresado por el usuario se valida y sanitiza antes de procesar o guardar.

```js
// En el frontend (antes de enviar):
function sanitize(str) {
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 500);
}

// En el backend con validator.js:
const { escape, isEmail } = require('validator');
const cleanEmail = escape(isEmail(email) ? email : '');

// Firebase Rules para proteger la DB:
"users": {
  "$uid": {
    ".write": "$uid === auth.uid",
    ".validate": "newData.child('name').val().length < 50"
  }
}
```

> Los mensajes del chat son el área más vulnerable. Implementá DOMPurify en el frontend para evitar XSS.

### 🗄️ Reglas de Firestore / Firebase

**Estado:** ⚠️ Pendiente / parcial · Configurar antes de ir a producción · Prioridad: Alto

La base de datos tiene reglas que impiden leer/escribir datos de otros usuarios.

```js
// firestore.rules:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lugares: lectura pública, escritura solo admin
    match /places/{placeId} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
    // Chats: solo usuarios autenticados
    match /chats/{chatId}/messages/{msgId} {
      allow read, write: if request.auth != null;
    }
    // Billetera: solo el dueño
    match /wallets/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

> Corrí firebase deploy --only firestore:rules para aplicar estas reglas.

### 🔑 Variables de entorno seguras

**Estado:** 🔴 Falta — crítico · Revisar el código ahora · Prioridad: Crítico

Las API keys nunca están hardcodeadas en el código. Se usan variables de entorno.

```js
// .env (NUNCA subir a GitHub):
FIREBASE_API_KEY=tu_clave_aqui
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=string_aleatorio_largo

// En el código:
const apiKey = process.env.FIREBASE_API_KEY;

// En Netlify: Settings > Environment Variables
// En GitHub: Settings > Secrets and variables

// .gitignore obligatorio:
.env
.env.local
.env.production
```

> Revisá si hay alguna API key en el código fuente ANTES de hacer el repo público.


## 3. Pagos, infraestructura y operación

### 🪖 Cabeceras HTTP de seguridad

**Estado:** ⚠️ Pendiente / parcial · Configurar en Netlify · Prioridad: Alto

Content-Security-Policy, X-Frame-Options, HSTS y otras cabeceras de protección.

```js
# netlify.toml:
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      connect-src 'self' https://*.firebaseio.com https://api.anthropic.com;
    """
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

> Creá el archivo netlify.toml en la raíz del proyecto y commitealo. Netlify lo aplica automáticamente.

### 🚫 CORS configurado correctamente

**Estado:** ⚠️ Pendiente / parcial · Configurar en el backend · Prioridad: Alto

Solo los dominios de SALGO pueden hacer requests a la API. No dominios externos.

```js
// Express.js:
const cors = require('cors');

const allowedOrigins = [
  'https://salgo.app',
  'https://salgo-admin.netlify.app',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS no permitido: ' + origin));
  },
  credentials: true,
}));
```

> Firebase Cloud Functions ya maneja CORS. Configuralo en functions/index.js si usás Cloud Functions.

### 📊 Logging y monitoreo de errores

**Estado:** 🔴 Falta — crítico · No implementado aún · Prioridad: Medio

Errores de producción registrados y alertas ante comportamientos anómalos.

```js
// Sentry (gratis hasta 5k errores/mes):
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Firebase Crashlytics para la app móvil:
import crashlytics from '@react-native-firebase/crashlytics';
crashlytics().log('Usuario abrió la app');

// Alerta si una IP hace > 100 requests/min:
// Implementar en Firebase Cloud Functions
```

> Instalá Sentry antes del lanzamiento. Te avisa por email cuando hay errores en producción.

### 💾 Backups automáticos de la DB

**Estado:** ⚠️ Pendiente / parcial · Configurar en Google Cloud · Prioridad: Alto

Backup diario de Firestore. Retención de 30 días. Restore en menos de 1 hora.

```js
# Google Cloud Firestore export automático:
# 1. Habilitá Cloud Scheduler en GCP Console
# 2. Creá una Cloud Function:

exports.scheduledFirestoreExport = functions.pubsub
  .schedule('every 24 hours').onRun(async (ctx) => {
    const client = new v1.FirestoreAdminClient();
    const name = client.databasePath(PROJECT_ID, '(default)');
    await client.exportDocuments({
      name,
      outputUriPrefix: 'gs://salgo-backups/' + new Date().toISOString(),
      collectionIds: ['users','places','wallets','chats'],
    });
  });
```

> Firebase en plan Blaze (pago) incluye export a Cloud Storage. Activalo cuando pasés al plan de pago.
