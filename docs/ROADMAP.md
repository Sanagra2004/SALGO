# SALGO — camino hasta el lanzamiento

*Las estimaciones de tiempo suponen una persona trabajando part-time. Los costos
son en dólares, a septiembre de 2026, y hay que confirmarlos antes de gastar.*

---

## ✅ Etapa 0 — Base técnica (hecha)

Sacar el prototipo del archivo único, arreglar los errores, implementar la
geolocalización real, poner un mapa de verdad, quitar del navegador lo que no
puede estar ahí, y dejarlo instalable en el celular.

**Resultado:** un link que se abre en el celular y muestra lugares reales
ordenados por distancia real.

**Costo:** $0. Todo lo que se usa es gratuito (OpenStreetMap para el mapa,
Netlify para publicar).

---

## ✅ Etapa 1 — El servidor (hecha, falta enchufarla)

Es la que convierte a SALGO en una app de verdad: sin esto, cada usuario está
solo en su propia copia.

**Qué quedó listo:**

- **Base de datos completa** con las tablas de lugares, perfiles, mensajes,
  quién va y encargados de local (`supabase/migrations/`).
- **Reglas de acceso probadas.** 41 verificaciones automáticas que confirman que
  nadie puede leer perfiles ajenos, escribir en nombre de otro, editar lugares
  que no le corresponden ni marcarse como administrador. Se corren con
  `./supabase/test.sh`.
- **Chat compartido y en vivo.** Escribís y aparece en el teléfono de los demás
  sin recargar.
- **"Voy esta noche" compartido**, con la afluencia calculándose sola.
- **Cuentas sin registro obligatorio.** Cuenta anónima al entrar; el email se
  pide solo cuando hace falta.
- **Panel de administración con acceso real**, por email y contraseña, con
  permisos que se aplican del lado del servidor.
- **Modo local intacto.** Si el servidor no está configurado o se cae, la app
  sigue andando con lo que tenga guardado en el navegador.

**Lo que falta:** crear el proyecto de Supabase y pegar dos claves. Son unos
20 minutos y está explicado paso a paso en **[SUPABASE.md](SUPABASE.md)**.

⏱️ **20 minutos de configuración** · 💰 **$0/mes**; unos **$25/mes** recién
cuando el uso crezca.

---

## 💳 Etapa 2 — Cobrar

La suscripción de AR$ 1.500 y los descuentos en los locales.

**Antes de escribir código, hay que resolver esto:**

- **Hablar con un contador.** Cobrar una suscripción es una cosa; guardar plata
  de los usuarios en una billetera es otra muy distinta, con obligaciones
  legales concretas. Conviene arrancar solo por la suscripción.
- **Redactar términos y condiciones y política de privacidad.** No es opcional:
  Apple y Google no aprueban apps sin eso, y además se maneja la ubicación de
  las personas, que es un dato sensible.
- **Cerrar acuerdos con los locales.** Un descuento que el local no reconoce en
  la puerta quema la credibilidad de la app entera. Esto es trabajo comercial,
  no técnico, y conviene empezarlo ya — puede avanzar en paralelo con la
  Etapa 1.

**Con qué:** **Mercado Pago**, que es lo que la gente usa en Argentina y lo que
mejor resuelve los pagos recurrentes.

**Recomendación:** dejar la billetera como demo por ahora. La suscripción sola
ya da el ingreso, y sin la complejidad legal de custodiar dinero de terceros.

⏱️ **2 a 3 semanas** de programación (más lo legal y comercial, en paralelo)
💰 comisión de Mercado Pago (~6% por transacción) + honorarios del contador y
del abogado.

---

## 📱 Etapa 3 — Las tiendas *(opcional, y no urgente)*

Hoy la app ya se instala en el celular sin pasar por ninguna tienda: se abre el
link, "Agregar a pantalla de inicio", y queda con su ícono como cualquier otra
app.

**Vale la pena esperar**, por tres razones:

1. **Apple rechaza** con frecuencia las apps que son solo un sitio web
   empaquetado. Hay que darle algo que justifique ser app nativa: notificaciones
   push, por ejemplo — que además es muy útil acá ("tu boliche está al 90%").
2. **Cuesta plata y tiempo:** USD 99 por año Apple, USD 25 una vez Google, más
   días o semanas de revisión en cada actualización.
3. **La versión web se actualiza al instante.** Durante el verano, cuando haya
   que corregir cosas rápido, eso vale oro.

**Cuándo hacerlo:** cuando la app ya tenga usuarios usándola y valga la pena la
visibilidad de la tienda.

**Con qué:** **Capacitor**, que empaqueta la misma app que ya existe. No hay que
programarla de nuevo.

⏱️ **1 a 2 semanas** · 💰 **USD 99/año** (Apple) + **USD 25** una vez (Google).

---

## Resumen

| Etapa | Qué desbloquea | Tiempo | Costo |
|---|---|---|---|
| ✅ 0 — Base técnica | App instalable con datos reales | hecho | $0 |
| ✅ 1 — Servidor | Chat, "voy" y afluencia compartidos de verdad | hecho | $0 → $25/mes |
| 💳 2 — Pagos | Ingresos por suscripción | 2–3 sem | ~6% + honorarios |
| 📱 3 — Tiendas | Visibilidad en App Store y Play | 1–2 sem | USD 99/año + 25 |

---

## Tres cosas que conviene decidir pronto

**1. El verano de Mar del Plata ya es alcanzable.** Con la Etapa 1 lista, lo
que falta para la temporada no es técnico: es cargar bien los lugares y
conseguir los primeros usuarios. Conviene empezar a probar la app con gente
real cuanto antes, aunque sean veinte personas.

**2. Cargar los lugares es trabajo manual y lleva más de lo que parece.** Los 30
de Mar del Plata están, pero cada ciudad nueva son horas de buscar direcciones,
coordenadas, horarios y precios. Antes de prometer una ciudad, conviene medir
cuánto cuesta cargarla.

**3. La afluencia ya se mide sola, pero depende de dos cosas.** Se calcula
dividiendo la gente que marcó que va por la capacidad del lugar. Entonces:

- **La capacidad de cada lugar tiene que estar bien cargada.** Hoy son
  estimaciones por tipo de local. Con el dato real de cada boliche el número
  mejora mucho.
- **Con pocos usuarios el porcentaje va a ser bajo.** Es esperable y no es un
  error: mientras tanto, el admin o el encargado del local pueden pisarlo a
  mano desde el panel. Esa carga manual dura 6 horas y después vuelve el
  automático.
