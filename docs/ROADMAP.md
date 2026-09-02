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

## 🔨 Etapa 1 — El servidor *(la más importante)*

Es la que convierte a SALGO en una app de verdad. Sin esto, cada usuario está
solo en su propia copia.

**Qué se gana:**

- El **chat de cada lugar** pasa a ser real: escribís y los demás lo ven.
- El **"voy esta noche"** se comparte: ves cuánta gente va posta.
- La **afluencia** se actualiza para todos a la vez.
- **Cuentas de usuario** con email y contraseña de verdad.
- El **panel de administración** se puede usar desde cualquier lado, con acceso
  por usuario, y los cambios los ven todos al instante.
- **SALGO IA** se conecta a una IA real, con la clave guardada en el servidor.

**Con qué:** **Supabase**. Base de datos, cuentas de usuario, tiempo real y
almacenamiento de fotos, todo junto. Tiene un plan gratuito que alcanza y sobra
para arrancar, y usa SQL estándar, así que no quedamos atados a esa empresa: si
mañana conviene mudarse, los datos se llevan.

**Trabajo:** ya está la mitad hecha. Como toda la app pasa por `store.js`, hay
que escribir un archivo nuevo con los mismos métodos apuntando a Supabase, y
cambiar una línea. Lo que lleva tiempo es el resto: diseñar las tablas, las
reglas de quién puede ver y escribir qué, las cuentas de usuario y la función
del servidor que habla con la IA.

**Además:** implementar los controles de [SEGURIDAD.md](SEGURIDAD.md), que hasta
ahora no se podían implementar porque no había servidor.

⏱️ **3 a 5 semanas** · 💰 **$0/mes** al principio; unos **$25/mes** cuando el
uso crezca.

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
| 🔨 1 — Servidor | Chat, "voy" y afluencia compartidos de verdad | 3–5 sem | $0 → $25/mes |
| 💳 2 — Pagos | Ingresos por suscripción | 2–3 sem | ~6% + honorarios |
| 📱 3 — Tiendas | Visibilidad en App Store y Play | 1–2 sem | USD 99/año + 25 |

---

## Tres cosas que conviene decidir pronto

**1. El verano de Mar del Plata es la oportunidad, pero solo con la Etapa 1
lista.** Sin servidor la app se ve bien pero no genera lo que la hace valiosa:
gente hablando entre sí y afluencia real. Si la temporada es el objetivo, hay
que contar para atrás desde diciembre.

**2. Cargar los lugares es trabajo manual y lleva más de lo que parece.** Los 30
de Mar del Plata están, pero cada ciudad nueva son horas de buscar direcciones,
coordenadas, horarios y precios. Antes de prometer una ciudad, conviene medir
cuánto cuesta cargarla.

**3. La afluencia no se mide sola.** Hoy la carga el admin a mano. Que sea real
necesita o bien que los locales la reporten (hay que convencerlos), o bien
deducirla de cuánta gente marcó que va (más fácil, menos preciso, pero se puede
empezar por ahí). Es una decisión de producto, no técnica, y conviene tomarla
antes de la Etapa 1 porque cambia el diseño de la base de datos.
