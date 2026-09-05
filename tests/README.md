# Pruebas

Dos grupos, que prueban cosas distintas:

## Base de datos — `../supabase/test.sh`

Levanta un Postgres local, aplica las migraciones y verifica las **reglas de
acceso**: que nadie pueda leer perfiles ajenos, escribir mensajes en nombre de
otro, editar lugares que no le corresponden ni marcarse como administrador.

No hace falta tener el proyecto de Supabase creado.

**Corré esto cada vez que toques un archivo de `supabase/migrations/`.** Una
regla mal escrita no se nota mirando la app: se nota cuando alguien lee lo que
no debería.

```bash
./supabase/test.sh
```

## Aplicación — `./run.sh`

Abre la app en un navegador real y verifica que funcione de punta a punta.

```bash
npm install playwright   # una sola vez
./tests/run.sh
```

Las pruebas corren la app en **modo local** (sin servidor): `run.sh` vacía las
claves de `src/js/config.js` mientras dura la corrida y las restaura al salir,
aunque algo falle. Así el resultado no depende de la red ni del estado del
proyecto de Supabase. Si corrés un archivo suelto con `node tests/01-app.mjs`
en vez de usar `run.sh`, hacelo con la config vacía o vas a ver la pantalla
"No pude conectarme" en lugar de los lugares.

| Archivo | Qué prueba |
|---|---|
| `01-app.mjs` | Navegación, detalle, "voy", XSS del chat, filtro de ciudad, IA |
| `02-admin.mjs` | Panel de carga: alta, edición y borrado de lugares |
| `03-servidor.mjs` | Que la app no explote con el servidor configurado pero caído |
| `04-pwa.mjs` | Instalable, funciona sin conexión y sin permiso de ubicación |

Si Chromium no está donde Playwright lo busca, pasale la ruta:

```bash
CHROME_PATH=/ruta/al/chrome ./tests/run.sh
```
