-- Tests de las reglas de acceso de la suscripción Pro.
--
-- Lo que más importa acá: que NADIE pueda marcarse a sí mismo como Pro. Si eso
-- se puede, la suscripción no vale nada — cualquiera con las herramientas del
-- navegador abiertas entra gratis. Los helpers vienen de 01_rls_test.sql.
--
-- Correr con:  ./supabase/test.sh

\set ON_ERROR_STOP on
set client_min_messages = notice;

-- Los mismos usuarios que el test anterior.
truncate public.subscriptions, public.pro_waitlist cascade;

grant select, insert, update, delete on public.pro_waitlist  to anon, authenticated;
grant select, insert, update, delete on public.subscriptions to anon, authenticated;

\echo ''
\echo '=== LISTA DE ESPERA ==='
begin;
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana puede anotarse en la lista de espera',
    filas($$insert into public.pro_waitlist (user_id, email, plan_months)
             values ('11111111-1111-1111-1111-111111111111', 'ana@test.com', 12)$$) = 1);
  select chequear('Ana NO puede anotar a Beto con el mail de Beto',
    rechazado($$insert into public.pro_waitlist (user_id, email)
                 values ('22222222-2222-2222-2222-222222222222', 'beto@test.com')$$));
  select chequear('Un email invalido se rechaza',
    rechazado($$insert into public.pro_waitlist (user_id, email)
                 values ('33333333-3333-3333-3333-333333333333', 'no-es-un-email')$$));
  select chequear('Un plan inventado (6 meses) se rechaza',
    rechazado($$update public.pro_waitlist set plan_months = 6
                 where user_id = '11111111-1111-1111-1111-111111111111'$$));
rollback;

begin;
  reset role;
  insert into public.pro_waitlist (user_id, email) values
    ('11111111-1111-1111-1111-111111111111', 'ana@test.com'),
    ('22222222-2222-2222-2222-222222222222', 'beto@test.com');
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana ve su anotacion pero NO la de Beto',
    (select count(*) from public.pro_waitlist) = 1);
  select chequear('Ana NO puede borrar la anotacion de Beto',
    filas($$delete from public.pro_waitlist
             where user_id = '22222222-2222-2222-2222-222222222222'$$) = 0);
  select actuar_como('99999999-9999-9999-9999-999999999999');
  select chequear('El administrador SI ve la lista completa',
    (select count(*) from public.pro_waitlist) = 2);
rollback;

\echo ''
\echo '=== SUSCRIPCIONES: NADIE SE AUTOASIGNA PRO ==='
begin;
  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana NO puede crearse una suscripcion activa',
    rechazado($$insert into public.subscriptions (user_id, status, amount, current_period_end)
                 values ('11111111-1111-1111-1111-111111111111', 'authorized', 1500,
                         now() + interval '1 year')$$));
  select chequear('Ana NO puede crearse ni siquiera una pendiente',
    rechazado($$insert into public.subscriptions (user_id, amount)
                 values ('11111111-1111-1111-1111-111111111111', 1500)$$));
  select chequear('is_pro() da false sin suscripcion',
    public.is_pro('11111111-1111-1111-1111-111111111111') = false);
rollback;

begin;
  -- El servidor (que saltea RLS) crea la suscripcion tras confirmar el pago.
  reset role;
  insert into public.subscriptions (user_id, status, amount, current_period_end)
    values ('11111111-1111-1111-1111-111111111111', 'authorized', 1500, now() + interval '30 days');

  select actuar_como('11111111-1111-1111-1111-111111111111');
  select chequear('Ana SI puede leer su propia suscripcion',
    (select count(*) from public.subscriptions) = 1);
  select chequear('is_pro() da true con suscripcion activa y vigente',
    public.is_pro('11111111-1111-1111-1111-111111111111') = true);
  select chequear('Ana NO puede estirar su propia fecha de vencimiento',
    filas($$update public.subscriptions set current_period_end = now() + interval '10 years'$$) = 0);
  select chequear('Ana NO puede borrar su suscripcion para evitar el cobro',
    filas($$delete from public.subscriptions$$) = 0);

  select actuar_como('22222222-2222-2222-2222-222222222222');
  select chequear('Beto NO ve la suscripcion de Ana',
    (select count(*) from public.subscriptions) = 0);
  select chequear('Beto NO se vuelve Pro por ser Beto',
    public.is_pro('22222222-2222-2222-2222-222222222222') = false);
rollback;

begin;
  reset role;
  -- Suscripcion que figura activa pero cuyo periodo ya vencio: el debito de
  -- este mes fallo y Mercado Pago dejo de renovar.
  insert into public.subscriptions (user_id, status, amount, current_period_end)
    values ('11111111-1111-1111-1111-111111111111', 'authorized', 1500, now() - interval '1 day');
  select chequear('Una suscripcion vencida NO da Pro, aunque figure activa',
    public.is_pro('11111111-1111-1111-1111-111111111111') = false);
rollback;

begin;
  reset role;
  insert into public.subscriptions (user_id, status, amount, current_period_end)
    values ('11111111-1111-1111-1111-111111111111', 'cancelled', 1500, now() + interval '30 days');
  select chequear('Una suscripcion cancelada NO da Pro aunque el periodo siga vigente',
    public.is_pro('11111111-1111-1111-1111-111111111111') = false);
rollback;

begin;
  reset role;
  select chequear('Un estado inventado se rechaza',
    rechazado($$insert into public.subscriptions (user_id, status, amount)
                 values ('11111111-1111-1111-1111-111111111111', 'gratis-total', 1500)$$));
rollback;

\echo ''
\echo '=== COBERTURA ==='
select chequear('subscriptions no tiene NINGUNA politica de escritura', (
  select count(*) = 0 from pg_policies
   where schemaname = 'public' and tablename = 'subscriptions'
     and cmd in ('INSERT','UPDATE','DELETE','ALL')
));
select chequear('las tablas de Pro tienen RLS activo', (
  select count(*) = 2 from pg_tables t
   join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
  where t.schemaname = 'public' and c.relrowsecurity
    and t.tablename in ('pro_waitlist','subscriptions')
));

\echo ''
\echo '  TESTS DE PRO: TODO OK'
