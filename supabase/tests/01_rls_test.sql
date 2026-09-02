-- Tests de las reglas de acceso (RLS).
--
-- Por qué existen: en Supabase el navegador habla DIRECTO con la base de datos,
-- usando una clave pública que cualquiera puede leer del código de la app. Lo
-- único que impide que un usuario lea o escriba lo que no le corresponde son
-- las políticas RLS. Una política mal escrita es una filtración de datos — y no
-- se nota mirando la app, hay que probarla.
--
-- Correr con:  psql -d salgo -f supabase/tests/01_rls_test.sql
-- Cualquier fallo aborta con error.

\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ───────────── helpers ─────────────

-- Se hace pasar por un usuario, igual que hace Supabase con el token del login.
create or replace function actuar_como(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true);
  execute 'set local role authenticated';
end $$;

-- Alguien que abre la app sin haber entrado nunca.
create or replace function visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

create or replace function chequear(descripcion text, condicion boolean) returns void
language plpgsql as $$
begin
  if condicion then
    raise notice '  OK   %', descripcion;
  else
    raise exception 'FALLA: %', descripcion;
  end if;
end $$;

-- Cuántas filas tocó una sentencia. Clave para entender los tests: cuando RLS
-- filtra un UPDATE o un DELETE no da error, simplemente no encuentra la fila.
-- Por eso "0 filas afectadas" ES el bloqueo.
create or replace function filas(sentencia text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute sentencia;
  get diagnostics n = row_count;
  return n;
end $$;

-- En cambio un INSERT que viola una política sí tira error. Esto lo captura.
create or replace function rechazado(sentencia text) returns boolean
language plpgsql as $$
begin
  execute sentencia;
  return false;
exception
  when insufficient_privilege then return true;
  when check_violation then return true;
  when others then
    if sqlstate in ('42501','23514') then return true; end if;
    raise;
end $$;

-- ───────────── datos de prueba (como dueño, sin RLS) ─────────────
truncate public.going, public.messages, public.venue_admins, public.places cascade;
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, email, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'ana@test.com',   false),
  ('22222222-2222-2222-2222-222222222222', 'beto@test.com',  false),
  ('33333333-3333-3333-3333-333333333333', null,             true),
  ('99999999-9999-9999-9999-999999999999', 'admin@test.com', false);

update public.profiles set is_admin = true
 where id = '99999999-9999-9999-9999-999999999999';

insert into public.places (id, name, city, capacity) overriding system value
  values (1, 'Bruto', 'Mar del Plata', 100),
         (2, 'Antares', 'Mar del Plata', 200);

-- Beto es encargado de Antares (2). NO de Bruto (1).
insert into public.venue_admins values (2, '22222222-2222-2222-2222-222222222222');

-- Permisos de tabla: en Supabase estos roles ya los tienen. RLS es lo que filtra.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage on all sequences in schema public to anon, authenticated;

\echo ''
\echo '=== PERFILES ==='
begin;
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana ve su propio perfil',
    (select count(*) from public.profiles) = 1);
  select chequear('Ana NO ve el perfil de Beto',
    (select count(*) from public.profiles
      where id = '22222222-2222-2222-2222-222222222222') = 0);
  select chequear('Ana SI puede cambiar su nombre',
    filas($$update public.profiles set name = 'Ana'
             where id = '11111111-1111-1111-1111-111111111111'$$) = 1);
  -- La politica `with check` corta esto con error, no devolviendo 0 filas.
  select chequear('Ana NO puede autoascenderse a administradora',
    rechazado($$update public.profiles set is_admin = true
                 where id = '11111111-1111-1111-1111-111111111111'$$));
rollback;

\echo ''
\echo '=== LUGARES ==='
begin;
  select visitante();
  select chequear('Un visitante sin cuenta VE el catalogo de lugares',
    (select count(*) from public.places) = 2);
  select chequear('Un visitante sin cuenta NO puede crear lugares',
    rechazado($$insert into public.places (name) values ('Trucho')$$));
rollback;

begin;
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Un usuario comun NO puede crear lugares',
    rechazado($$insert into public.places (name) values ('Trucho')$$));
  select chequear('Un usuario comun NO puede editar un lugar',
    filas($$update public.places set name = 'Hackeado' where id = 1$$) = 0);
  select chequear('Un usuario comun NO puede borrar un lugar',
    filas($$delete from public.places where id = 1$$) = 0);
rollback;

begin;
  select actuar_como('22222222-2222-2222-2222-222222222222');
  select chequear('El encargado SI edita la afluencia de SU local (Antares)',
    filas($$update public.places set crowd_manual = 90, crowd_manual_at = now()
             where id = 2$$) = 1);
  select chequear('El encargado NO puede tocar OTRO local (Bruto)',
    filas($$update public.places set crowd_manual = 5 where id = 1$$) = 0);
  select chequear('El encargado NO puede borrar su local',
    filas($$delete from public.places where id = 2$$) = 0);
rollback;

begin;
  select actuar_como('99999999-9999-9999-9999-999999999999');
  select chequear('El administrador SI puede crear lugares',
    filas($$insert into public.places (name) values ('Nuevo')$$) = 1);
  select chequear('El administrador SI puede editar cualquier lugar',
    filas($$update public.places set horario = '22-06h' where id = 1$$) = 1);
rollback;

\echo ''
\echo '=== QUIEN VA ==='
begin;
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana puede marcar que va',
    filas($$insert into public.going (place_id, user_id)
             values (1, '11111111-1111-1111-1111-111111111111')$$) = 1);
  select chequear('Ana NO puede anotar a Beto',
    rechazado($$insert into public.going (place_id, user_id)
                 values (1, '22222222-2222-2222-2222-222222222222')$$));
rollback;

begin;
  reset role;
  insert into public.going (place_id, user_id)
    values (1, '22222222-2222-2222-2222-222222222222');
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana NO puede desanotar a Beto',
    filas($$delete from public.going
             where user_id = '22222222-2222-2222-2222-222222222222'$$) = 0);
rollback;

\echo ''
\echo '=== AFLUENCIA AUTOMATICA ==='
begin;
  reset role;
  insert into public.going (place_id, user_id) values
    (1, '11111111-1111-1111-1111-111111111111'),
    (1, '22222222-2222-2222-2222-222222222222');
  select chequear('Marcar "voy" sube el contador del lugar',
    (select going_count from public.places where id = 1) = 2);
  -- Bruto: capacidad 100, van 2 -> 2%
  select chequear('El porcentaje se calcula sobre la capacidad del lugar',
    (select public.crowd_pct(p) from public.places p where p.id = 1) = 2);
  delete from public.going
   where place_id = 1 and user_id = '11111111-1111-1111-1111-111111111111';
  select chequear('Desmarcar baja el contador',
    (select going_count from public.places where id = 1) = 1);
rollback;

begin;
  reset role;
  update public.places set crowd_manual = 95, crowd_manual_at = now() where id = 1;
  select chequear('La carga manual del local le gana al calculo automatico',
    (select public.crowd_pct(p) from public.places p where p.id = 1) = 95);
  update public.places set crowd_manual_at = now() - interval '7 hours' where id = 1;
  select chequear('Una carga manual vieja (7h) se ignora y vuelve el automatico',
    (select public.crowd_pct(p) from public.places p where p.id = 1) = 0);
rollback;

begin;
  reset role;
  select chequear('Un porcentaje manual fuera de rango (150) se rechaza',
    rechazado($$update public.places set crowd_manual = 150 where id = 1$$));
rollback;

\echo ''
\echo '=== QUE NOCHE ES "ESTA NOCHE" ==='
begin;
  reset role;
  -- El corte es a las 6 AM: salir de madrugada sigue siendo la noche anterior.
  select chequear('Sabado 23:00 cuenta como la noche del sabado',
    public.salgo_night('2026-01-10 23:00-03'::timestamptz) = '2026-01-10'::date);
  select chequear('Domingo 03:00 TAMBIEN cuenta como la noche del sabado',
    public.salgo_night('2026-01-11 03:00-03'::timestamptz) = '2026-01-10'::date);
  select chequear('Domingo 07:00 ya es la noche del domingo',
    public.salgo_night('2026-01-11 07:00-03'::timestamptz) = '2026-01-11'::date);
  insert into public.going (place_id, user_id, night)
    values (2, '11111111-1111-1111-1111-111111111111', public.salgo_night() - 1);
  select chequear('Un "voy" de anoche NO cuenta para la afluencia de hoy',
    (select going_count from public.places where id = 2) = 0);
  insert into public.going (place_id, user_id)
    values (2, '22222222-2222-2222-2222-222222222222');
  select chequear('Un "voy" de esta noche SI cuenta',
    (select going_count from public.places where id = 2) = 1);
rollback;

\echo ''
\echo '=== MENSAJES ==='
begin;
  select visitante();
  select chequear('Un visitante sin cuenta puede LEER el chat',
    (select count(*) from public.messages) = 0);
  select chequear('Un visitante sin cuenta NO puede escribir',
    rechazado($$insert into public.messages (place_id, user_id, txt)
                 values (1, '11111111-1111-1111-1111-111111111111', 'hola')$$));
rollback;

begin;
  select actuar_como('33333333-3333-3333-3333-333333333333');
  select chequear('Un usuario ANONIMO si puede escribir (ya entro a la app)',
    filas($$insert into public.messages (place_id, user_id, txt)
             values (1, '33333333-3333-3333-3333-333333333333', 'buenas')$$) = 1);
rollback;

begin;
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana NO puede escribir haciendose pasar por Beto',
    rechazado($$insert into public.messages (place_id, user_id, txt)
                 values (1, '22222222-2222-2222-2222-222222222222', 'soy beto')$$));
  select chequear('Un mensaje vacio se rechaza',
    rechazado($$insert into public.messages (place_id, user_id, txt)
                 values (1, '11111111-1111-1111-1111-111111111111', '   ')$$));
  select chequear('Un mensaje de mas de 500 caracteres se rechaza',
    rechazado($$insert into public.messages (place_id, user_id, txt)
                 values (1, '11111111-1111-1111-1111-111111111111', repeat('x', 501))$$));
rollback;

begin;
  reset role;
  insert into public.messages (place_id, user_id, txt)
    values (1, '22222222-2222-2222-2222-222222222222', 'de beto');
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana NO puede borrar el mensaje de Beto',
    filas($$delete from public.messages
             where user_id = '22222222-2222-2222-2222-222222222222'$$) = 0);
  select chequear('NADIE puede editar un mensaje ya publicado',
    filas($$update public.messages set txt = 'cambiado'$$) = 0);
rollback;

begin;
  reset role;
  insert into public.messages (place_id, user_id, txt)
    values (1, '22222222-2222-2222-2222-222222222222', 'de beto');
  select actuar_como('99999999-9999-9999-9999-999999999999');
  select chequear('El administrador SI puede borrar mensajes (moderacion)',
    filas($$delete from public.messages
             where user_id = '22222222-2222-2222-2222-222222222222'$$) = 1);
rollback;

\echo ''
\echo '=== ENCARGADOS DE LOCAL ==='
begin;
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana NO ve quien es encargado de otros locales',
    (select count(*) from public.venue_admins) = 0);
  select chequear('Ana NO puede nombrarse encargada',
    rechazado($$insert into public.venue_admins
                 values (1, '11111111-1111-1111-1111-111111111111')$$));
rollback;

begin;
  select actuar_como('22222222-2222-2222-2222-222222222222');
  select chequear('Beto SI ve que es encargado de Antares',
    (select count(*) from public.venue_admins) = 1);
rollback;

\echo ''
\echo '=== COBERTURA ==='
select chequear('RLS activo en las 5 tablas', (
  select count(*) = 5 from pg_tables t
   join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
  where t.schemaname = 'public' and c.relrowsecurity
));

\echo ''
\echo '  TODOS LOS TESTS DE ACCESO PASARON'
