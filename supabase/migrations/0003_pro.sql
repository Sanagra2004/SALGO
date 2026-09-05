-- SALGO — suscripción Pro (Etapa 2).
--
-- Dos tablas con propósitos muy distintos:
--
--   pro_waitlist   Gente que dejó su email porque le interesa Pro. Es lo que
--                  está activo hoy: todavía NO se cobra nada, porque los
--                  beneficios dependen de acuerdos con los locales que aún no
--                  existen. Sirve para llegar a esos locales con una lista
--                  real de gente dispuesta a pagar.
--
--   subscriptions  Las suscripciones de verdad, para cuando se encienda el
--                  cobro. Ver docs/MERCADOPAGO.md.
--
-- ── LA REGLA MÁS IMPORTANTE DE ESTE ARCHIVO ──────────────────────────────
-- `subscriptions` NO TIENE ninguna política de INSERT, UPDATE ni DELETE.
-- Eso es a propósito: significa que NADIE puede escribirla desde la app, ni
-- siquiera su propia fila. La única forma de crear o activar una suscripción
-- es desde la función del servidor, que usa la clave service_role (que saltea
-- RLS) y solo después de que Mercado Pago confirmó el pago.
--
-- Si esta tabla fuera escribible desde el cliente, cualquiera podría marcarse
-- como Pro gratis abriendo las herramientas del navegador. Hay tests que lo
-- verifican en supabase/tests/.

-- ─────────────────────────────────────────────────────────────
-- LISTA DE ESPERA
-- ─────────────────────────────────────────────────────────────
create table public.pro_waitlist (
  user_id     uuid primary key references auth.users on delete cascade,
  email       text not null check (position('@' in email) > 1),
  plan_months integer not null default 1 check (plan_months in (1, 3, 12)),
  city        text,
  created_at  timestamptz not null default now()
);

comment on table public.pro_waitlist is
  'Interesados en Pro mientras el cobro está apagado. Una fila por usuario: si vuelve a anotarse, se actualiza la que ya tenía.';

-- ─────────────────────────────────────────────────────────────
-- SUSCRIPCIONES
-- ─────────────────────────────────────────────────────────────
create table public.subscriptions (
  user_id        uuid primary key references auth.users on delete cascade,

  -- Estados tal como los reporta Mercado Pago, más 'pending' mientras la
  -- persona todavía no terminó de autorizar el débito.
  status         text not null default 'pending'
                 check (status in ('pending','authorized','paused','cancelled')),

  plan_months    integer not null default 1 check (plan_months in (1, 3, 12)),
  amount         numeric(10,2) not null,

  -- Identificador de la suscripción del lado de Mercado Pago. Es la llave para
  -- consultarla o cancelarla más adelante.
  mp_preapproval_id text unique,

  -- Hasta cuándo está paga. Es lo que decide si alguien es Pro AHORA: si el
  -- pago mensual falla, Mercado Pago deja de renovar y esta fecha vence sola.
  current_period_end timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions (status);

create trigger subscriptions_touch before update on public.subscriptions
for each row execute function public.touch_updated_at();

/**
 * ¿Este usuario es Pro en este momento?
 *
 * No alcanza con status='authorized': si el débito de este mes falló, la
 * suscripción puede seguir figurando activa un rato pero el período ya venció.
 * Por eso se exige que current_period_end esté en el futuro.
 */
create or replace function public.is_pro(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
     where s.user_id = uid
       and s.status = 'authorized'
       and s.current_period_end > now()
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- REGLAS DE ACCESO
-- ─────────────────────────────────────────────────────────────
alter table public.pro_waitlist  enable row level security;
alter table public.subscriptions enable row level security;

-- LISTA DE ESPERA: cada uno se anota a sí mismo y ve solo lo suyo.
-- El admin ve todo, que es el sentido de juntar la lista.
create policy waitlist_select_own on public.pro_waitlist
  for select using (user_id = auth.uid() or public.is_admin());

create policy waitlist_insert_own on public.pro_waitlist
  for insert with check (user_id = auth.uid() and auth.uid() is not null);

create policy waitlist_update_own on public.pro_waitlist
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy waitlist_delete_own on public.pro_waitlist
  for delete using (user_id = auth.uid());

-- SUSCRIPCIONES: SOLO LECTURA de la propia. Ni una política de escritura.
-- La app necesita leerla para saber si mostrar los beneficios; escribirla es
-- exclusivo del servidor.
create policy subscriptions_select_own on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TIEMPO REAL
-- ─────────────────────────────────────────────────────────────
-- Para que la app reaccione sola cuando el pago se confirma: la persona vuelve
-- de Mercado Pago y la pantalla ya la muestra como Pro, sin recargar.
alter publication supabase_realtime add table public.subscriptions;
