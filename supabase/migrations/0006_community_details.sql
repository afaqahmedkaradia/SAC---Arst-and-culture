-- Community details for artists: Jamatkhana, country of birth and residence,
-- and an optional multi-faith family section. Private: only the person and curators can read them.
-- Safe to run more than once.

create table if not exists public.community_details (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  jamatkhana text check (char_length(jamatkhana) <= 120),
  country_of_birth text check (char_length(country_of_birth) <= 80),
  country_of_residence text check (char_length(country_of_residence) <= 80),
  multifaith boolean not null default false,
  family_relationship text check (char_length(family_relationship) <= 40),
  family_member_name text check (char_length(family_member_name) <= 80),
  family_jamatkhana text check (char_length(family_jamatkhana) <= 120),
  updated_at timestamptz not null default now()
);

alter table public.community_details enable row level security;

drop policy if exists "Own community details or curators" on public.community_details;
create policy "Own community details or curators" on public.community_details
  for select using (profile_id = auth.uid() or public.is_admin());
drop policy if exists "People add their own community details" on public.community_details;
create policy "People add their own community details" on public.community_details
  for insert with check (profile_id = auth.uid());
drop policy if exists "People edit their own community details" on public.community_details;
create policy "People edit their own community details" on public.community_details
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

revoke all on public.community_details from anon;
grant select, insert, update on public.community_details to authenticated;

-- Copy the answers from the sign-up form into the table when the account is created.
create or replace function public.save_signup_community_details() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce(new.raw_user_meta_data -> 'community', 'null'::jsonb);
begin
  if jsonb_typeof(c) <> 'object' then
    return new;
  end if;
  -- The profile row is created by handle_new_user, which runs first (triggers run in name order).
  if not exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;
  insert into public.community_details (
    profile_id, jamatkhana, country_of_birth, country_of_residence,
    multifaith, family_relationship, family_member_name, family_jamatkhana
  ) values (
    new.id,
    nullif(left(trim(c ->> 'jamatkhana'), 120), ''),
    nullif(left(trim(c ->> 'country_of_birth'), 80), ''),
    nullif(left(trim(c ->> 'country_of_residence'), 80), ''),
    coalesce((c ->> 'multifaith')::boolean, false),
    nullif(left(trim(c ->> 'family_relationship'), 40), ''),
    nullif(left(trim(c ->> 'family_member_name'), 80), ''),
    nullif(left(trim(c ->> 'family_jamatkhana'), 120), '')
  )
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists zz_save_signup_community_details on auth.users;
create trigger zz_save_signup_community_details
  after insert on auth.users
  for each row execute function public.save_signup_community_details();
