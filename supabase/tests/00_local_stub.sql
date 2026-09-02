-- Imita las piezas de Supabase que la migración necesita, para poder aplicarla
-- y testearla contra un Postgres común. NO se sube al proyecto real: allá
-- todo esto ya existe.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  is_anonymous boolean not null default false,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Misma implementación que usa Supabase: lee el usuario del JWT que viaja en
-- la petición. En los tests lo seteamos a mano con set_config().
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;

do $$ begin
  create publication supabase_realtime;
exception when duplicate_object then null; end $$;
