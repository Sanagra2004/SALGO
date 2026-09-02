# SALGO

**Dónde salir esta noche, cerca tuyo.** Boliches, bares, ofertas del día y
afluencia en vivo, según dónde estés parado.

Arrancamos por Mar del Plata, con 30 lugares cargados. La app está pensada para
crecer ciudad por ciudad.

---

## 📍 En qué estado está

La app tiene **dos modos**, y cuál usa depende de si está configurado el
servidor (ver `src/js/config.js`):

- **Modo local** — anda sin configurar nada, pero cada persona ve solo sus
  propios datos.
- **Modo servidor** — el chat, el "voy" y la afluencia se comparten de verdad.
  Se activa siguiendo **[docs/SUPABASE.md](docs/SUPABASE.md)**, unos 20 minutos.

| Qué | Modo local | Modo servidor |
|---|---|---|
| Ver lugares cerca tuyo | ✅ Real, con GPS y distancias calculadas | ✅ Real |
| Mapa | ✅ Real (OpenStreetMap) | ✅ Real |
| Buscar y filtrar | ✅ Real | ✅ Real |
| Cuentas de usuario | ⚠️ Solo un nombre local | ✅ Reales, sin registro obligatorio |
| Chat de cada lugar | ⚠️ Solo en tu teléfono | ✅ **Compartido y en vivo** |
| "Voy esta noche" | ⚠️ Solo en tu teléfono | ✅ **Lo ven todos** |
| Afluencia (% lleno) | ⚠️ Carga manual | ✅ **Se calcula sola**, el local puede pisarla |
| Panel de carga | ⚠️ Sin login, guarda local | ✅ Con login y permisos reales |
| Ofertas por día | ⚠️ Datos de ejemplo | ⚠️ Datos de ejemplo |
| Amigos y grupos | ⚠️ Datos de ejemplo | ⚠️ Datos de ejemplo |
| Billetera y tarjeta | 🔶 **DEMO. No mueve plata real** | 🔶 DEMO |
| Suscripción Pro | 🔶 DEMO | 🔶 DEMO |
| SALGO IA | ✅ Motor local, sin costo | ✅ Igual (la IA externa es Etapa 2) |

Lo que falta después está en [docs/ROADMAP.md](docs/ROADMAP.md).

### Cómo entra la gente

**Sin registro.** Al abrir la app se crea una cuenta anónima en silencio: ya se
puede mirar todo, marcar que vas y chatear. El email se pide solo cuando hace
falta de verdad (recuperar la cuenta en otro teléfono). Después esa cuenta
anónima se convierte en real **sin perder nada** de lo hecho.

El motivo es concreto: la app se prueba un sábado a la noche, en la calle, con
mala señal. Una pantalla de registro en ese momento pierde a la mayoría.

### Cómo se calcula la afluencia

Sale sola: la gente que marcó que va esta noche, dividido la capacidad del
lugar. El admin o el encargado del local pueden **pisarla a mano** cuando saben
mejor, y esa carga manual vale 6 horas — pasado ese rato vuelve el automático,
para que un número viejo no quede mintiendo.

Ojo con la **capacidad** de cada lugar en el panel: es el divisor de esa cuenta.
Si está mal, el "% lleno" que ve todo el mundo está mal.

## 🚀 Cómo correrla

No hace falta instalar nada ni compilar. Solo un servidor web, porque la app usa
módulos de JavaScript y el navegador los bloquea si abrís el archivo directo.

```bash
python3 -m http.server 8000
```

Y entrás a **http://localhost:8000**

- La app: `http://localhost:8000/index.html`
- El panel para cargar lugares: `http://localhost:8000/admin.html`

## 📁 Cómo está organizado

```
index.html            La app: el HTML de las pantallas
admin.html            Panel interno para cargar lugares
manifest.webmanifest  Datos para que se pueda instalar en el celular
sw.js                 Hace que abra sin señal
netlify.toml          Configuración del servidor (seguridad, cache)

src/
  data/places.mdp.json  Los 30 lugares de Mar del Plata, con coordenadas
  styles/               Los estilos, separados por tema
  js/
    store.js            ⭐ La capa de datos. Ver abajo
    store.local.js      Guarda en el navegador (por ahora)
    geo.js              Ubicación del usuario y distancias
    map.js              El mapa
    places.js           Listado y detalle de lugares
    cities.js           Selector de ciudad
    chat.js             Chat de cada lugar
    ai.js               SALGO IA
    offers.js           Ofertas, stories, amigos, notificaciones
    demo.js             Billetera, tarjeta y Pro (las pantallas de demo)
    profile.js          Perfil del usuario
    admin.js            Panel de carga
    main.js             Arranque y navegación

supabase/
  migrations/           Las tablas y las reglas de acceso. Se corren una vez
  tests/                Verificaciones de las reglas de acceso
  test.sh               Levanta una base local y corre los tests

docs/                 Para leer antes de seguir. Especialmente SUPABASE y ROADMAP
vendor/               Librerías guardadas acá a propósito (mapa y Supabase)
```

Los archivos nuevos de esta etapa dentro de `src/js/`:

```
config.js           Las claves del servidor. Es lo único que hay que completar
auth.js             La sesión del usuario (anónima primero)
store.supabase.js   El mismo store, pero contra el servidor
```

## ⭐ La regla más importante del proyecto

> **Ninguna pantalla toca `localStorage` ni pide datos por su cuenta.
> Todas pasan por `src/js/store.js`.**

`store.js` es una puerta única a los datos. Hay dos implementaciones detrás con
exactamente los mismos métodos: `store.local.js` (navegador) y
`store.supabase.js` (servidor). Cuál se usa lo decide `config.js`.

Esto ya demostró que sirve: pasar del modo local al modo servidor **no obligó a
tocar ninguna pantalla**. Si se rompe la regla, el próximo cambio de este tipo
pasa a ser reescribir la app.

## 📖 Documentación

- **[docs/SUPABASE.md](docs/SUPABASE.md)** — cómo poner el servidor en marcha,
  paso a paso. Unos 20 minutos, sin costo.
- **[docs/AUDITORIA.md](docs/AUDITORIA.md)** — qué encontramos en el prototipo,
  qué se arregló y qué falta. Escrito para leer sin saber programar.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — las etapas hasta el lanzamiento, con
  tiempos y costos.
- **[docs/SEGURIDAD.md](docs/SEGURIDAD.md)** — la lista de controles de
  seguridad a implementar cuando exista el servidor.

## 🌎 Agregar una ciudad

1. Entrá a `admin.html`
2. Cargá los lugares con su **latitud y longitud** (sin eso no salen en el mapa)
3. Poné el nombre de la ciudad en el campo "Ciudad"

La app filtra por ciudad automáticamente. Si una ciudad no tiene lugares
cargados, lo dice en pantalla en vez de mostrar los de otro lado.

## 🔒 Sobre la seguridad

Con el servidor activo, el navegador habla **directo** con la base de datos
usando una clave pública. Eso es normal en Supabase, pero significa que lo único
que protege los datos son las **reglas de acceso** definidas en
`supabase/migrations/0001_init.sql`.

Por eso están probadas. `./supabase/test.sh` levanta una base local y corre 39
verificaciones: que nadie pueda leer perfiles ajenos, escribir mensajes en
nombre de otro, editar lugares que no le corresponden ni marcarse como
administrador.

**Corré esos tests cada vez que toques una migración.** Una regla mal escrita no
se nota mirando la app; se nota cuando alguien lee lo que no debería.
