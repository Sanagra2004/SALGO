# SALGO

**Dónde salir esta noche, cerca tuyo.** Boliches, bares, ofertas del día y
afluencia en vivo, según dónde estés parado.

Arrancamos por Mar del Plata, con 30 lugares cargados. La app está pensada para
crecer ciudad por ciudad.

---

## 📍 En qué estado está

Esto es una **Etapa 0**: la app funciona, se ve bien y se puede instalar en el
celular, pero **todavía no tiene servidor**. Es importante tenerlo claro:

| Qué | Cómo funciona hoy |
|---|---|
| Ver lugares cerca tuyo | ✅ **Real.** Usa el GPS y calcula distancias de verdad |
| Mapa | ✅ **Real.** OpenStreetMap, con los lugares en su ubicación exacta |
| Buscar y filtrar | ✅ Real |
| Ofertas por día | ⚠️ Datos de ejemplo, escritos en el código |
| Chat de cada lugar | ⚠️ **Solo en tu teléfono.** Dos usuarios no se ven entre sí |
| "Voy esta noche" | ⚠️ Solo en tu teléfono |
| Afluencia (% lleno) | ⚠️ La carga el admin a mano, no se mide sola |
| Amigos y grupos | ⚠️ Datos de ejemplo |
| Billetera y tarjeta | 🔶 **DEMO. No mueve plata real** |
| Suscripción Pro | 🔶 DEMO. No se puede contratar todavía |
| SALGO IA | ✅ Responde, con un motor local. Sin conexión a una IA externa |

Lo que hace que el chat, el "voy" y la afluencia sean compartidos de verdad es
el backend, y ese es el próximo paso. Ver [docs/ROADMAP.md](docs/ROADMAP.md).

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

docs/                 Para leer antes de seguir. Especialmente ROADMAP
vendor/leaflet/       La librería del mapa, guardada acá a propósito
```

## ⭐ La regla más importante del proyecto

> **Ninguna pantalla toca `localStorage` ni pide datos por su cuenta.
> Todas pasan por `src/js/store.js`.**

`store.js` es una puerta única a los datos. Hoy guarda en el navegador; mañana
va a guardar en Supabase. Cuando llegue ese momento se escribe un archivo nuevo
(`store.supabase.js`) con los mismos métodos y **se cambia una sola línea**. El
resto de la app no se entera.

Si se rompe esta regla, migrar al backend deja de ser un cambio chico y pasa a
ser reescribir la app. Vale la pena respetarla.

## 📖 Documentación

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
