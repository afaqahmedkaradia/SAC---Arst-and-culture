-- SAC — newsletters
-- Subscribers choose topics; curators write newsletters and send them to
-- everyone subscribed to the chosen topics.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run, after 0001 to 0003. It is safe to run again.
--
-- Subscriber rows hold email addresses, so only curators can read them, and
-- only the app's server (with the secret key) can add or change them. Signing
-- up, confirming and unsubscribing all go through the server.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1 and char_length(email) <= 320),
  profile_id uuid references public.profiles (id) on delete set null,
  topics text[] not null default '{}'
    check (topics <@ array['events', 'sales', 'opportunities', 'news']::text[]),
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  token uuid not null default gen_random_uuid(),
  consent_source text not null default 'form' check (consent_source in ('form', 'signup', 'settings')),
  consent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists newsletter_subscribers_email_idx on public.newsletter_subscribers (email);
create unique index if not exists newsletter_subscribers_token_idx on public.newsletter_subscribers (token);
create index if not exists newsletter_subscribers_active_idx on public.newsletter_subscribers using gin (topics) where status = 'active';

create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  subject text not null default '' check (char_length(subject) <= 150),
  preheader text check (char_length(preheader) <= 200),
  body text not null default '' check (char_length(body) <= 20000),
  button_label text check (char_length(button_label) <= 60),
  button_url text check (char_length(button_url) <= 500),
  topics text[] not null default '{}'
    check (topics <@ array['events', 'sales', 'opportunities', 'news']::text[]),
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent')),
  created_by uuid references public.profiles (id) on delete set null,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  started_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsletters_created_idx on public.newsletters (created_at desc);

create table if not exists public.newsletter_deliveries (
  newsletter_id uuid not null references public.newsletters (id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text check (char_length(error) <= 500),
  sent_at timestamptz,
  primary key (newsletter_id, subscriber_id)
);
create index if not exists newsletter_deliveries_queue_idx on public.newsletter_deliveries (newsletter_id) where status = 'queued';

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletters enable row level security;
alter table public.newsletter_deliveries enable row level security;

drop policy if exists "Curators read subscribers" on public.newsletter_subscribers;
create policy "Curators read subscribers" on public.newsletter_subscribers for select using (public.is_admin());
revoke insert, update, delete on public.newsletter_subscribers from anon, authenticated;

drop policy if exists "Curators manage newsletters" on public.newsletters;
create policy "Curators manage newsletters" on public.newsletters for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Curators read deliveries" on public.newsletter_deliveries;
create policy "Curators read deliveries" on public.newsletter_deliveries for select using (public.is_admin());
revoke insert, update, delete on public.newsletter_deliveries from anon, authenticated;

-- Queue a newsletter for everyone actively subscribed to any of its topics.
-- Called by the server with the secret key once a curator presses Send.
create or replace function public.newsletter_queue(target uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.newsletter_deliveries (newsletter_id, subscriber_id)
  select nl.id, s.id
  from public.newsletters nl
  join public.newsletter_subscribers s on s.status = 'active' and s.topics && nl.topics
  where nl.id = target
  on conflict do nothing;

  select count(*) into n from public.newsletter_deliveries where newsletter_id = target;
  update public.newsletters
  set status = 'sending', recipient_count = n, started_at = coalesce(started_at, now()), updated_at = now()
  where id = target;
  return n;
end;
$$;
revoke execute on function public.newsletter_queue(uuid) from public, anon, authenticated;
grant execute on function public.newsletter_queue(uuid) to service_role;
