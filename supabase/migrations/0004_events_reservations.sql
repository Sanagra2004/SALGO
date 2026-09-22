-- SALGO — reservas reales para eventos y mesas.

create table public.reservations (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  place_id    bigint not null references public.places on delete cascade,
  event_date  date not null,
  event_time  time not null,
  people      integer not null check (people between 1 and 20),
  note        text check (note is null or length(btrim(note)) <= 500),
  status      text not null default 'pending'
              check (status in ('pending', 'confirmed', 'cancelled', 'used')),
  created_at  timestamptz not null default now()
);

create index reservations_user_date_idx
  on public.reservations (user_id, event_date);
create index reservations_place_date_idx
  on public.reservations (place_id, event_date);

alter table public.reservations enable row level security;

create policy reservations_select_own on public.reservations
  for select using (user_id = auth.uid());

create policy reservations_insert_own on public.reservations
  for insert with check (user_id = auth.uid());

-- El usuario puede cancelar su solicitud, pero nunca confirmarla ni usarla.
create policy reservations_cancel_own on public.reservations
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status = 'cancelled'
  );

create policy reservations_manage_place on public.reservations
  for update using (public.manages_place(place_id))
  with check (public.manages_place(place_id));
