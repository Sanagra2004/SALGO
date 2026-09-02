-- SALGO — esquema inicial (Etapa 1).
--
-- Objetivo: que el chat, el "voy esta noche" y la afluencia sean compartidos
-- de verdad entre usuarios, en vez de vivir en el teléfono de cada uno.
--
-- Todo lo importante de este archivo son las políticas RLS del final. En
-- Supabase el navegador habla directo con la base usando una clave PÚBLICA:
-- cualquiera puede leerla del código de la app. Lo único que impide que un
-- usuario lea o modifique lo que no le corresponde son esas políticas. Si una
-- está mal, se filtran datos. Hay tests en supabase/tests/ que lo verifican.

-- ─────────────────────────────────────────────────────────────
-- PERFILES
-- ─────────────────────────────────────────────────────────────
-- Una fila por usuario. Se crea sola cuando alguien entra (ver el trigger de
-- abajo), incluso si entra de forma anónima.
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  city        text not null default 'Mar del Plata',
  avatar_color text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on column public.profiles.is_admin is
  'Da acceso al panel de carga. Solo se puede cambiar desde el panel de Supabase, nunca desde la app: ninguna política RLS permite escribir esta columna.';

-- ─────────────────────────────────────────────────────────────
-- LUGARES
-- ─────────────────────────────────────────────────────────────
create table public.places (
  id          bigint generated always as identity primary key,
  name        text not null,
  city        text not null default 'Mar del Plata',
  type        text not null default 'Bar',
  genre       text,
  badge       text,
  addr        text,
  lat         double precision,
  lng         double precision,
  geo         text not null default 'exacta' check (geo in ('exacta','aprox')),
  entrada     text not null default 'Sin entrada',
  consumo     text not null default '-',
  horario     text not null default '-',
  rating      numeric(2,1) not null default 4.0 check (rating between 0 and 5),
  icon        text not null default '📍',
  cat         text[] not null default '{}',
  color1      text not null default '#ff2d78',
  color2      text not null default '#b44dff',
  is_open     boolean not null default true,
  instagram   text,

  -- AFLUENCIA
  -- Se calcula sola a partir de cuánta gente marcó que va esta noche
  -- (going_count) contra la capacidad del lugar. Un admin o el propio local
  -- pueden pisarla con crowd_manual cuando saben mejor que el cálculo.
  capacity      integer not null default 200 check (capacity > 0),
  going_count   integer not null default 0 check (going_count >= 0),
  crowd_manual  integer check (crowd_manual between 0 and 100),
  crowd_manual_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index places_city_idx on public.places (city);
create index places_geo_idx on public.places (lat, lng);

-- El porcentaje que ve el usuario. El override manual gana, pero solo por 6
-- horas: pasado ese rato una carga vieja deja de mentir y vuelve el automático.
create or replace function public.crowd_pct(p public.places)
returns integer language sql stable as $$
  select case
    when p.crowd_manual is not null
         and p.crowd_manual_at > now() - interval '6 hours'
      then p.crowd_manual
    else least(100, (p.going_count * 100) / greatest(p.capacity, 1))
  end;
$$;

-- ─────────────────────────────────────────────────────────────
-- QUIÉN VA
-- ─────────────────────────────────────────────────────────────

-- Qué noche es "esta noche".
--
-- Para SALGO, salir a las 3 de la mañana del domingo sigue siendo la noche del
-- sábado. Si usáramos la fecha del calendario, a las 00:00 se vaciarían todos
-- los "voy" y la afluencia se iría a cero justo cuando la gente está saliendo.
-- Por eso el día arranca a las 6 AM. El cliente usa el mismo corte
-- (nightOf() en src/js/config.js): si cambia uno, hay que cambiar el otro.
create or replace function public.salgo_night(ts timestamptz default now())
returns date language sql stable as $$
  select ((ts at time zone 'America/Argentina/Buenos_Aires') - interval '6 hours')::date;
$$;

-- La noche va en la clave: "voy el sábado" es distinto de "voy el domingo",
-- y permite limpiar lo viejo sin borrar historial.
create table public.going (
  place_id  bigint not null references public.places on delete cascade,
  user_id   uuid   not null references auth.users on delete cascade,
  night     date   not null default public.salgo_night(),
  created_at timestamptz not null default now(),
  primary key (place_id, user_id, night)
);

create index going_place_night_idx on public.going (place_id, night);

-- ─────────────────────────────────────────────────────────────
-- MENSAJES
-- ─────────────────────────────────────────────────────────────
create table public.messages (
  id        bigint generated always as identity primary key,
  place_id  bigint not null references public.places on delete cascade,
  user_id   uuid   not null references auth.users on delete cascade,
  txt       text   not null check (length(btrim(txt)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index messages_place_idx on public.messages (place_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- ENCARGADOS DE LOCAL
-- ─────────────────────────────────────────────────────────────
-- Deja que el dueño de un boliche cargue SU afluencia sin poder tocar la de
-- los demás. Es lo que hace vendible la app a los locales.
create table public.venue_admins (
  place_id bigint not null references public.places on delete cascade,
  user_id  uuid   not null references auth.users on delete cascade,
  primary key (place_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- FUNCIONES DE APOYO
-- ─────────────────────────────────────────────────────────────

-- security definer: corre con permisos del dueño y así puede leer profiles sin
-- quedar atrapada en las políticas de profiles (que la llamarían de vuelta).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.manages_place(pid bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.venue_admins
                 where place_id = pid and user_id = auth.uid());
$$;

-- Mantiene going_count al día. Es la fuente de la afluencia automática.
create or replace function public.sync_going_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid bigint;
begin
  pid := coalesce(new.place_id, old.place_id);
  update public.places p
     set going_count = (select count(*) from public.going g
                         where g.place_id = pid
                           and g.night = public.salgo_night()),
         updated_at = now()
   where p.id = pid;
  return null;
end;
$$;

create trigger going_count_sync
after insert or delete on public.going
for each row execute function public.sync_going_count();

-- Crea el perfil apenas nace el usuario, sea anónimo o registrado.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger places_touch before update on public.places
for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- REGLAS DE ACCESO (RLS)
-- ─────────────────────────────────────────────────────────────
-- Sin esto, la clave pública de la app daría acceso total a la base.
alter table public.profiles     enable row level security;
alter table public.places       enable row level security;
alter table public.going        enable row level security;
alter table public.messages     enable row level security;
alter table public.venue_admins enable row level security;

-- PERFILES: cada uno ve y edita solo el suyo.
-- No hay política de INSERT ni de DELETE a propósito: el perfil lo crea el
-- trigger y se borra en cascada con el usuario.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    -- Impide que alguien se autoascienda a administrador editando su perfil.
    and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid())
  );

-- LUGARES: los ve cualquiera, incluso sin haber entrado (es el catálogo).
-- Los edita solo un admin, o el encargado de ese local puntual.
create policy places_select_all on public.places
  for select using (true);

create policy places_insert_admin on public.places
  for insert with check (public.is_admin());

create policy places_update_manager on public.places
  for update using (public.manages_place(id))
  with check (public.manages_place(id));

create policy places_delete_admin on public.places
  for delete using (public.is_admin());

-- QUIÉN VA: se ve quién va (la app lo muestra), pero cada uno solo puede
-- anotarse o desanotarse a sí mismo.
create policy going_select_all on public.going
  for select using (true);

create policy going_insert_own on public.going
  for insert with check (user_id = auth.uid());

create policy going_delete_own on public.going
  for delete using (user_id = auth.uid());

-- MENSAJES: los lee cualquiera. Escribir requiere estar identificado y
-- firmar con el propio usuario: nadie puede publicar en nombre de otro.
create policy messages_select_all on public.messages
  for select using (true);

create policy messages_insert_own on public.messages
  for insert with check (user_id = auth.uid() and auth.uid() is not null);

-- Borrar el propio mensaje, o cualquiera si sos admin (moderación).
create policy messages_delete_own on public.messages
  for delete using (user_id = auth.uid() or public.is_admin());

-- No hay política de UPDATE: un mensaje no se edita. Evita que alguien cambie
-- lo que dijo después de que otros lo leyeron.

-- ENCARGADOS: cada uno ve dónde es encargado; solo un admin reparte permisos.
create policy venue_admins_select_own on public.venue_admins
  for select using (user_id = auth.uid() or public.is_admin());

create policy venue_admins_write_admin on public.venue_admins
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TIEMPO REAL
-- ─────────────────────────────────────────────────────────────
-- Lo que se transmite en vivo a las apps abiertas.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.going;
alter publication supabase_realtime add table public.places;
