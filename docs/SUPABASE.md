# Poner el servidor en marcha

Esta guía deja SALGO funcionando de verdad: el chat compartido, el "voy" que
ven todos y la afluencia en vivo.

Son unos 20 minutos. No hace falta saber programar, pero sí seguir los pasos en
orden. **No cuesta nada**: el plan gratuito de Supabase alcanza y sobra para
arrancar.

Mientras no hagas esto, la app funciona igual pero en **modo local**: cada
persona ve solo sus propios datos. No se rompe nada.

---

## 1. Crear el proyecto (5 minutos)

1. Entrá a **[supabase.com](https://supabase.com)** y creá una cuenta (podés
   usar tu cuenta de GitHub).
2. Tocá **New project**.
3. Completá:
   - **Name**: `salgo`
   - **Database Password**: generá una y **guardala en un lugar seguro**. No la
     vas a usar en el día a día, pero si la perdés no se puede recuperar.
   - **Region**: `South America (São Paulo)` — es la más cercana a Argentina y
     la que va a hacer que la app responda más rápido.
4. Tocá **Create new project** y esperá un par de minutos.

---

## 2. Crear las tablas (5 minutos)

1. En el menú de la izquierda, entrá a **SQL Editor**.
2. Tocá **New query**.
3. Abrí el archivo `supabase/migrations/0001_init.sql` de este proyecto,
   copiá **todo** su contenido y pegalo en el editor.
4. Tocá **Run** (o Ctrl+Enter). Tiene que decir *Success*.
5. Repetí lo mismo con `supabase/migrations/0002_seed_mdp.sql`. Ese carga los
   30 lugares de Mar del Plata.

Para confirmar que salió bien: andá a **Table Editor** y fijate que estén las
tablas `places` (con 30 filas), `profiles`, `going`, `messages` y
`venue_admins`.

---

## 3. Activar el ingreso sin registro (2 minutos)

La app crea una cuenta anónima apenas alguien la abre, así puede usarla sin
tener que registrarse. Hay que habilitarlo:

1. Andá a **Authentication** → **Sign In / Providers**.
2. Buscá **Anonymous sign-ins** y activalo.

> Si te olvidás de este paso, la app abre igual pero nadie va a poder chatear ni
> marcar que va, y en la consola del navegador vas a ver
> *"no pude crear la sesión anónima"*.

---

## 4. Conectar la app (3 minutos)

1. En Supabase, andá a **Project Settings** (el engranaje) → **API Keys**.
2. Copiá estos dos valores:
   - **Project URL** — algo como `https://abcdefgh.supabase.co`
   - **anon public** — un texto largo que arranca con `eyJ...`
3. Abrí el archivo **`src/js/config.js`** de este proyecto y pegalos:

```js
export const SUPABASE_URL = 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

4. Guardá, recargá la app y listo.

### ¿Y esa clave no es un problema que esté a la vista?

No. La clave `anon` es **pública por diseño**: viaja al navegador de cada
usuario y cualquiera la puede leer. Va al repositorio sin ningún problema.

Lo que protege los datos son las **reglas de acceso** que se instalaron en el
paso 2: aunque alguien tenga la clave, la base no lo va a dejar leer perfiles
ajenos, editar lugares ni escribir mensajes en nombre de otro. Esas reglas están
probadas: `supabase/test.sh` corre 41 verificaciones sobre ellas.

> ⚠️ La que **NUNCA** va en un archivo del proyecto es la clave
> **`service_role`**. Esa saltea todas las reglas de acceso. Vive solo en el
> panel de Supabase. Si alguna vez la pegás en el código o se la pasás a
> alguien por chat, rotala inmediatamente desde ese mismo panel.

---

## 5. Darte permisos de administrador (2 minutos)

El panel de carga (`admin.html`) necesita una cuenta con permisos. Como recién
arranca, hay que crearla a mano una sola vez:

1. En Supabase, andá a **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Poné tu email y una contraseña. Marcá **Auto Confirm User** para no tener que
   confirmar por mail.
3. Copiá el **User UID** que aparece en la lista.
4. Andá a **SQL Editor** y corré esto, reemplazando el UID por el tuyo:

```sql
update public.profiles
   set is_admin = true
 where id = 'pegá-acá-tu-User-UID';
```

Ahora entrás a `admin.html` con ese email y contraseña.

> Esto se hace desde el panel de Supabase a propósito. **Ninguna regla de la
> base permite que alguien se marque como administrador desde la app**, ni
> siquiera editando su propio perfil. Hay un test que lo verifica.

---

## 6. Dar de alta al encargado de un local (opcional)

Si el dueño de un boliche quiere cargar la afluencia de **su** local (y solo el
suyo), se hace así:

1. Que se cree una cuenta desde la app (Perfil → crear cuenta).
2. Buscá su User UID en **Authentication** → **Users**.
3. Corré en el SQL Editor:

```sql
insert into public.venue_admins (place_id, user_id)
values (5, 'el-User-UID-de-esa-persona');   -- 5 = id del lugar
```

Esa persona va a poder editar ese lugar y ninguno más. Está probado.

---

## Cómo saber que quedó funcionando

Abrí la app y mirá la consola del navegador (F12). Tiene que decir:

```
[salgo] modo de datos: servidor
```

Si dice `local`, las claves del paso 4 no quedaron bien cargadas.

**La prueba de verdad**, la que importa: abrí la app en **dos teléfonos
distintos** (o en tu celular y en la computadora). Escribí un mensaje en el chat
de un boliche desde uno. Tiene que aparecer en el otro **solo, sin recargar**.

Eso es lo que no se podía hacer antes.

---

## Cómo se prueban las reglas de acceso

Sin necesidad de tocar el proyecto real, se puede levantar una base local y
correr las 41 verificaciones:

```bash
./supabase/test.sh
```

Conviene correrlo cada vez que se toque un archivo de `supabase/migrations/`.
Una regla mal escrita no se nota mirando la app: se nota cuando alguien lee
datos que no debería.

---

## Qué esperar de los costos

El plan gratuito incluye 500 MB de base, 5 GB de tráfico por mes y 50.000
usuarios activos. Para arrancar en Mar del Plata sobra bastante.

El plan pago arranca en **USD 25 por mes** y recién haría falta con la app ya
funcionando con bastante gente. Un aviso: el plan gratuito **pausa el proyecto
si pasa una semana sin actividad** — se reactiva solo entrando al panel, pero
conviene tenerlo en cuenta si la app queda dormida entre temporadas.

---

## Si algo no funciona

| Qué ves | Qué pasó |
|---|---|
| La consola dice `modo de datos: local` | Las claves del paso 4 no están bien pegadas |
| `no pude crear la sesión anónima` | Falta activar el ingreso anónimo (paso 3) |
| Entro al panel y dice que no tengo permisos | Falta el paso 5, o pusiste mal el User UID |
| `No tenés permiso para hacer eso` al guardar | La cuenta no es administradora, o el lugar no es tuyo |
| Los mensajes no llegan al otro teléfono | Faltó correr el final de `0001_init.sql`, que activa el tiempo real |
| La app abre pero está vacía y dice "No pude conectarme" | Sin internet, o la URL del paso 4 está mal escrita |
