-- SALGO — eventos fechados por fecha.

create table public.events (
  id              bigint generated always as identity primary key,
  place_id        bigint not null references public.places on delete cascade,
  event_date      date not null,
  title           text not null check (length(btrim(title)) between 2 and 120),
  description     text check (description is null or length(description) <= 500),
  line_up         text[] not null default '{}',
  entry_price     text not null default 'Consultar',
  table_price     text,
  capacity        integer check (capacity is null or capacity > 0),
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (place_id, event_date, title)
);

create index events_date_idx on public.events (event_date, published);
create index events_place_date_idx on public.events (place_id, event_date);

alter table public.events enable row level security;

create policy events_select_published on public.events
  for select using (published = true or public.manages_place(place_id));

create policy events_insert_manager on public.events
  for insert with check (public.manages_place(place_id));

create policy events_update_manager on public.events
  for update using (public.manages_place(place_id))
  with check (public.manages_place(place_id));

create policy events_delete_manager on public.events
  for delete using (public.manages_place(place_id));

alter table public.reservations
  add column event_id bigint references public.events on delete set null;

create index reservations_event_idx on public.reservations (event_id);
