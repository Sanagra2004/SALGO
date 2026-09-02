# SALGO — qué encontramos y qué hicimos

*Escrito para leer sin saber programar. Septiembre 2026.*

---

## Resumen en tres frases

El prototipo tenía **mucho más trabajo hecho de lo que parece a simple vista**:
13 pantallas, un diseño cuidado y una idea de producto clara. Pero tres cosas lo
dejaban a mitad de camino: **no tenía servidor**, **no usaba la ubicación del
celular** (que es justamente la premisa de la app), y **tenía cosas que
aparentaban funcionar sin funcionar**.

Esta primera etapa arregló lo segundo y lo tercero, y dejó todo preparado para
que lo primero — el servidor — sea el próximo paso y no una reescritura.

---

## Lo que estaba bien y se conservó

No hubo que empezar de cero. Se aprovechó:

- **El diseño entero.** Los colores, las tarjetas, los degradados, la barra de
  navegación: todo quedó igual. Es la parte más difícil de conseguir y estaba
  resuelta.
- **Las 13 pantallas** y su navegación.
- **Los 30 lugares de Mar del Plata**, con sus precios, horarios y géneros
  musicales. Es información de valor y no se toca en ningún lado gratis.
- **El motor de SALGO IA**, que responde preguntas sobre los lugares cargados.
- **Las ofertas por día de la semana**, bien pensadas y realistas.

---

## Los tres problemas de fondo

### 1. La app no usaba el GPS

Este era el más grave, porque es la promesa central: *"te muestra dónde salir
según dónde estás"*.

El prototipo **nunca le pedía la ubicación al celular**. Las distancias
("1.2km", "900m") estaban escritas a mano en los datos, una por lugar, y no
cambiaban nunca. Alguien parado en Buenos Aires veía "a 900m" en un bar de Mar
del Plata.

Además, **la ciudad era decorativa**: elegías Madrid y seguías viendo los mismos
30 boliches marplatenses.

**Qué se hizo:** ahora la app pide la ubicación, calcula la distancia real a
cada lugar y ordena la lista por cercanía. Se agregó un filtro "Cerca mío" que
muestra solo lo que está a menos de 2 km. Y el selector de ciudad filtra de
verdad: si elegís Madrid, la app te dice honestamente que todavía no llegó ahí,
en vez de mostrarte lugares de otra ciudad.

Para que esto funcione hubo que **buscar las coordenadas exactas de los 30
lugares**, una por una, a partir de sus direcciones. 25 dieron ubicación
exacta; 5 (los de playa, que no tienen dirección de calle) quedaron con una
ubicación aproximada, marcada como tal para poder corregirla a mano después.

### 2. Los datos no se comparten entre personas

El chat de cada lugar, el "voy esta noche" y el porcentaje de gente se guardaban
**en el teléfono de cada usuario**.

Es decir: escribías en el chat de un boliche y nadie más lo veía nunca. Marcabas
que ibas y nadie se enteraba. El panel de administración cargaba lugares que
solo existían en la computadora donde se cargaron.

La app *parecía* multiusuario, pero cada persona estaba sola en su propia copia.
Y son justo las funciones que hacen distinta a SALGO.

**Qué se hizo:** esto **no se resuelve en esta etapa** — hace falta un servidor.
Lo que sí se hizo es preparar el terreno: se creó una "puerta única" a los datos
(`store.js`) por la que ahora pasa toda la app. El día que se conecte la base de
datos, se cambia esa puerta y todas las pantallas empiezan a compartir datos sin
tocarlas.

Sin eso, conectar el servidor habría significado reescribir la app entera.

Mientras tanto, la app **avisa en pantalla** que el chat se guarda solo en tu
teléfono, para que nadie crea que está hablando con alguien.

### 3. Había cosas que aparentaban funcionar

Tres casos, en orden de gravedad:

**La contraseña del panel de administración no protegía nada.** Se comparaba
dentro del navegador, contra un valor guardado en el mismo navegador en texto
plano. Cualquier persona con conocimientos básicos entraba en 30 segundos. Lo
peligroso no es que fuera débil: es que *parecía* seguro.
→ Se sacó el login. El panel se movió a una página aparte (`admin.html`) y dice
claramente que es una herramienta local. El acceso real, por usuario y
contraseña de verdad, llega con el servidor.

**La billetera mostraba un saldo de AR$ 12.450 que no existía.** Los movimientos
eran una lista fija. Se podía "transferir" y "pagar" sin que pasara nada.
→ Las pantallas se conservan porque muestran bien la visión del producto, pero
ahora llevan un cartel naranja: **"DEMO · no se mueve dinero real"**. Lo mismo
en la tarjeta SALGO y en la suscripción Pro.

**SALGO IA intentaba conectarse a una inteligencia artificial externa sin la
clave para hacerlo.** La llamada fallaba siempre, en silencio, y caía a un motor
local. Peor: si se hubiera puesto la clave ahí, quedaba a la vista de cualquiera
que abriera las herramientas del navegador — y las llamadas se cobran.
→ Se sacó esa llamada. Quedó solo el motor local, que responde bastante bien
sobre los lugares cargados. La IA real se conecta en la Etapa 1, con la clave
guardada del lado del servidor, donde nadie la puede ver.

---

## Errores de programación que se corrigieron

Estos son problemas concretos que se encontraron leyendo el código:

| Qué pasaba | Efecto para el usuario |
|---|---|
| Al marcar "voy esta noche", se marcaba **otro lugar** | Abrías Samsara, marcabas que ibas, y quedaba marcado Luna Disco |
| Compartir un lugar compartía **otro lugar** | Mismo problema, en el botón de compartir |
| La vista previa de la tarjeta se rompía al escribir | El número nunca aparecía en la tarjeta dibujada |
| Al volver a la app desde otra pestaña, tiraba error | La lista de lugares no se actualizaba |
| El chat no filtraba lo que se escribía | Un mensaje con código adentro se ejecutaba en el teléfono de todos los que abrieran ese chat |
| Cuatro funciones de la IA estaban escritas dos veces | Código muerto, difícil de mantener |
| Un lugar cargado sin categoría rompía el buscador | La lista quedaba vacía |
| Dos lugares distintos donde se guardaban los mismos datos | Se pisaban entre sí; cambios que se perdían |

El del chat merece un párrafo aparte: es el único que era un **agujero de
seguridad real**. Alguien podía escribir un mensaje preparado y ejecutar código
en el teléfono de cualquiera que abriera ese chat. Ya está cerrado: todo texto
que escribe una persona se muestra como texto, nunca como código.

---

## Cómo quedó organizado

El proyecto era **un solo archivo de 4.548 líneas** con todo mezclado adentro:
diseño, contenido y programación.

Ahora está separado en archivos por tema (el mapa, el chat, las ofertas, los
lugares…). Suena a detalle técnico, pero tiene una consecuencia práctica: se
puede tocar una parte sin miedo a romper otra, y dos personas pueden trabajar en
cosas distintas al mismo tiempo.

Se mantuvo a propósito la decisión de **no usar herramientas de compilación**: el
proyecto se abre y se edita directo, sin instalar nada. Para un equipo chico es
la elección correcta.

---

## Lo que la app ya puede hacer hoy

Se puede instalar en el celular como una app normal (sin pasar por App Store ni
Google Play, sin pagar nada, sin esperar aprobación). Abre aunque no haya señal
— algo que importa más de lo que parece, porque adentro de un boliche la
conexión suele ser mala y es justo cuando se usa.

---

## Lo que falta, en orden

1. **El servidor** (Etapa 1). Es lo que convierte a SALGO en una app de verdad:
   chat compartido, "voy" compartido, afluencia en vivo, cuentas de usuario, y
   el panel de administración accesible desde cualquier lado.
2. **Los pagos** (Etapa 2). La suscripción de AR$ 1.500 y los descuentos. Acá
   hay que hablar con un contador antes de escribir una línea de código: mover
   plata de terceros en Argentina tiene obligaciones concretas.
3. **Las tiendas** (Etapa 3). App Store y Google Play, si conviene.

El detalle de cada una, con tiempos y costos, está en
[ROADMAP.md](ROADMAP.md).

---

## Una recomendación

La idea de arrancar por Mar del Plata en verano es buena y conviene sostenerla.
Pero para que el verano sirva de prueba real, **hace falta el servidor**: sin él
la app se ve bien pero no genera lo que la hace valiosa — gente hablando entre
sí y datos de afluencia reales.

Si hay que elegir dónde poner el esfuerzo primero, es ahí. Todo lo demás —
tiendas, pagos, publicidad — funciona mejor después.
