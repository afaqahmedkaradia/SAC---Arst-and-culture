-- SAC — soft-launch policies
-- Work types and the upload declaration on projects, profile links and CV,
-- report categories, and curator reviews with a checklist.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Run it once, after 0001 and 0002.

-- ---------------------------------------------------------------------------
-- Projects: what kind of work it is, who the original is by, and when the
-- artist declared it was theirs to share.
-- ---------------------------------------------------------------------------
alter table public.projects
  add column work_type text not null default 'original'
    check (work_type in ('original', 'study', 'inspired', 'traditional', 'cover', 'collaboration', 'ai_assisted')),
  add column original_credit text check (char_length(original_credit) <= 200),
  add column declared_at timestamptz;

-- A study, an "inspired by" work or a cover must name the original.
alter table public.projects
  add constraint projects_original_credit_needed check (
    work_type not in ('study', 'inspired', 'cover') or status <> 'published'
    or char_length(coalesce(trim(original_credit), '')) > 0
  );

-- Nothing is published without the declaration.
alter table public.projects
  add constraint projects_declared_to_publish check (status <> 'published' or declared_at is not null);

-- Projects that were already published before this change keep their place:
-- they were shared under the sign-up agreement, so count that as declared.
update public.projects set declared_at = coalesce(published_at, created_at) where status = 'published' and declared_at is null;

grant update (work_type, original_credit, declared_at) on public.projects to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: professional links (LinkedIn and others) and a CV.
-- links: [{"platform":"linkedin","url":"https://…"}], up to 8
-- cv:    [{"year":"2026","kind":"exhibition","title":"…","place":"…"}], up to 30
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 8 and pg_column_size(links) <= 8000),
  add column cv jsonb not null default '[]'::jsonb
    check (jsonb_typeof(cv) = 'array' and jsonb_array_length(cv) <= 30 and pg_column_size(cv) <= 20000);

-- Carry existing website and Instagram details into the new links list.
update public.profiles p
set links = (
  select coalesce(jsonb_agg(l), '[]'::jsonb) from (
    select jsonb_build_object('platform', 'website', 'url', p.website) as l where coalesce(p.website, '') <> ''
    union all
    select jsonb_build_object('platform', 'instagram', 'url', 'https://instagram.com/' || ltrim(p.instagram, '@'))
      where coalesce(p.instagram, '') <> ''
  ) s
)
where links = '[]'::jsonb and (coalesce(website, '') <> '' or coalesce(instagram, '') <> '');

grant update (links, cv) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Reports: what kind of problem it is.
-- ---------------------------------------------------------------------------
alter table public.reports
  add column category text not null default 'other'
    check (category in ('not_original', 'rights', 'guidelines', 'other'));

-- ---------------------------------------------------------------------------
-- Curator reviews of artist applications, with the checklist they ticked.
-- ---------------------------------------------------------------------------
create table public.artist_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  curator_id uuid references public.profiles (id) on delete set null,
  decision text not null check (decision in ('approved', 'changes', 'declined')),
  checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist) = 'object'),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index artist_reviews_profile_idx on public.artist_reviews (profile_id, created_at desc);

alter table public.artist_reviews enable row level security;
create policy "Curators read reviews" on public.artist_reviews
  for select using (public.is_admin() or profile_id = auth.uid());
-- Reviews are written only through admin_review_artist below.
revoke insert, update, delete on public.artist_reviews from anon, authenticated;

create function public.admin_review_artist(target uuid, decision text, checklist jsonb, note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only curators can do this'; end if;
  if target = auth.uid() then raise exception 'Curators cannot review their own application'; end if;
  if decision not in ('approved', 'changes', 'declined') then raise exception 'Unknown decision'; end if;
  if decision in ('changes', 'declined') and char_length(coalesce(trim(note), '')) = 0 then
    raise exception 'Add a note for the artist';
  end if;

  insert into public.artist_reviews (profile_id, curator_id, decision, checklist, note)
  values (target, auth.uid(), decision, coalesce(checklist, '{}'::jsonb), nullif(left(trim(note), 2000), ''));

  update public.profiles
  set artist_status = case decision when 'approved' then 'approved' when 'declined' then 'declined' else 'pending' end
  where id = target and role = 'artist';
end;
$$;
