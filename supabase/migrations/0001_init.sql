-- SAC — Space for Arts and Culture
-- Database schema, security rules and file storage for the MVP.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Run it once on a fresh project.

-- ---------------------------------------------------------------------------
-- Profiles: one per account. Artists need curator approval before publishing.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null default 'member' check (role in ('artist', 'member')),
  artist_status text not null default 'none'
    check (artist_status in ('none', 'pending', 'approved', 'declined')),
  is_admin boolean not null default false,
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 2000),
  location text check (char_length(location) <= 80),
  website text check (char_length(website) <= 300),
  instagram text check (char_length(instagram) <= 100),
  work_link text check (char_length(work_link) <= 300),
  avatar_path text,
  banner_color text not null default '#007041' check (banner_color ~ '^#[0-9A-Fa-f]{6}$'),
  disciplines text[] not null default '{}',
  available_for text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Helper checks used by the security rules below.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create function public.is_approved_artist() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'artist' and artist_status = 'approved'
  );
$$;

-- Pending or approved artists can draft projects; only approved ones publish.
create function public.can_draft() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'artist' and artist_status in ('pending', 'approved')
  );
$$;

-- Create a profile automatically when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wants_artist boolean := (meta ->> 'role') = 'artist';
  name text := left(coalesce(nullif(trim(meta ->> 'display_name'), ''), split_part(new.email, '@', 1)), 80);
  base text;
  uname text;
  picked text[];
begin
  base := trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')));
  if char_length(base) < 3 then
    base := case when wants_artist then 'artist' else 'member' end;
  end if;
  base := trim(both '-' from left(base, 24));
  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    uname := base || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  select coalesce(array_agg(x), '{}') into picked
  from jsonb_array_elements_text(
    case when jsonb_typeof(meta -> 'disciplines') = 'array' then meta -> 'disciplines' else '[]'::jsonb end
  ) as x;

  insert into public.profiles (id, username, display_name, role, artist_status, disciplines, work_link)
  values (
    new.id,
    uname,
    name,
    case when wants_artist then 'artist' else 'member' end,
    case when wants_artist then 'pending' else 'none' end,
    picked,
    nullif(left(meta ->> 'work_link', 300), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "Profiles are public" on public.profiles
  for select using (true);
create policy "People edit their own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- People can change their own details, but never their role, approval or admin flag.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (
  username, display_name, headline, bio, location, website, instagram,
  work_link, avatar_path, banner_color, disciplines, available_for
) on public.profiles to authenticated;

-- A member can ask to become an artist; a curator then approves it.
create function public.request_artist_account() returns void
language sql security definer set search_path = public as $$
  update public.profiles
  set role = 'artist', artist_status = 'pending'
  where id = auth.uid() and artist_status in ('none', 'declined');
$$;

-- ---------------------------------------------------------------------------
-- Projects and their content blocks
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  summary text check (char_length(summary) <= 280),
  discipline text not null check (char_length(discipline) <= 40),
  tags text[] not null default '{}',
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'removed')),
  feedback_open boolean not null default false,
  feedback_question text check (char_length(feedback_question) <= 300),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_feed_idx on public.projects (status, published_at desc);
create index projects_owner_idx on public.projects (owner_id);

create function public.projects_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger projects_touch before insert or update on public.projects
  for each row execute function public.projects_touch();

alter table public.projects enable row level security;

create policy "Published projects are public" on public.projects
  for select using (status = 'published' or owner_id = auth.uid() or public.is_admin());
create policy "Artists create projects" on public.projects
  for insert with check (
    owner_id = auth.uid() and public.can_draft()
    and (status = 'draft' or (status = 'published' and public.is_approved_artist()))
  );
create policy "Artists edit their projects" on public.projects
  for update using (owner_id = auth.uid() and status <> 'removed')
  with check (
    owner_id = auth.uid() and public.can_draft()
    and (status = 'draft' or (status = 'published' and public.is_approved_artist()))
  );
create policy "Artists delete their projects" on public.projects
  for delete using (owner_id = auth.uid());

-- Only curators can feature a project (see admin functions below).
revoke update on public.projects from anon, authenticated;
grant update (
  title, summary, discipline, tags, cover_path, status, feedback_open, feedback_question
) on public.projects to authenticated;

create table public.project_blocks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('image', 'audio', 'video', 'text', 'pdf')),
  text_body text check (char_length(text_body) <= 10000),
  media_path text,
  url text check (char_length(url) <= 500),
  caption text check (char_length(caption) <= 200)
);
create index project_blocks_project_idx on public.project_blocks (project_id, position);

create table public.project_credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  role text check (char_length(role) <= 80),
  position int not null default 0
);
create index project_credits_project_idx on public.project_credits (project_id);
create index project_credits_profile_idx on public.project_credits (profile_id);

alter table public.project_blocks enable row level security;
alter table public.project_credits enable row level security;

-- Visibility follows the project: the subquery is filtered by the project rules.
create policy "Blocks follow their project" on public.project_blocks
  for select using (exists (select 1 from public.projects p where p.id = project_id));
create policy "Owners manage blocks" on public.project_blocks
  for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "Credits follow their project" on public.project_credits
  for select using (exists (select 1 from public.projects p where p.id = project_id));
create policy "Owners manage credits" on public.project_credits
  for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Appreciations, follows and collections
-- ---------------------------------------------------------------------------
create table public.appreciations (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index appreciations_user_idx on public.appreciations (user_id);

alter table public.appreciations enable row level security;
create policy "Appreciations are public" on public.appreciations
  for select using (exists (select 1 from public.projects p where p.id = project_id));
create policy "Appreciate published projects" on public.appreciations
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.status = 'published')
  );
create policy "Remove your appreciation" on public.appreciations
  for delete using (user_id = auth.uid());

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, artist_id),
  check (follower_id <> artist_id)
);
create index follows_artist_idx on public.follows (artist_id);

alter table public.follows enable row level security;
create policy "Follows are public" on public.follows for select using (true);
create policy "Follow someone" on public.follows for insert with check (follower_id = auth.uid());
create policy "Unfollow someone" on public.follows for delete using (follower_id = auth.uid());

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create index collections_owner_idx on public.collections (owner_id);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, project_id)
);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
create policy "Collections are public" on public.collections for select using (true);
create policy "Owners manage collections" on public.collections
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Collection items are public" on public.collection_items
  for select using (exists (select 1 from public.projects p where p.id = project_id));
create policy "Owners manage collection items" on public.collection_items
  for all using (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Feedback: guided prompts, marked helpful by the artist
-- ---------------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  working text check (char_length(working) <= 2000),
  explore text check (char_length(explore) <= 2000),
  question text check (char_length(question) <= 1000),
  visibility text not null default 'public' check (visibility in ('public', 'artist')),
  helpful boolean not null default false,
  created_at timestamptz not null default now()
);
create index feedback_project_idx on public.feedback (project_id, created_at desc);
create index feedback_author_idx on public.feedback (author_id);

alter table public.feedback enable row level security;
create policy "Who can read feedback" on public.feedback
  for select using (
    author_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
    or (visibility = 'public'
        and exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'))
  );
create policy "Members give feedback on open projects" on public.feedback
  for insert with check (
    author_id = auth.uid()
    and (coalesce(trim(working), '') <> '' or coalesce(trim(explore), '') <> '')
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.status = 'published' and p.feedback_open and p.owner_id <> auth.uid()
    )
  );
create policy "Authors or curators delete feedback" on public.feedback
  for delete using (author_id = auth.uid() or public.is_admin());

revoke update on public.feedback from anon, authenticated;

-- Only the project's artist can mark feedback as helpful.
create function public.set_feedback_helpful(feedback_id uuid, value boolean) returns void
language sql security definer set search_path = public as $$
  update public.feedback f
  set helpful = value
  where f.id = feedback_id
    and exists (select 1 from public.projects p where p.id = f.project_id and p.owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Inquiries ("Get in touch") and reports
-- ---------------------------------------------------------------------------
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  sender_email text not null check (char_length(sender_email) <= 200),
  kind text not null check (kind in ('buying', 'booking', 'commission', 'collaboration', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index inquiries_artist_idx on public.inquiries (artist_id, created_at desc);

alter table public.inquiries enable row level security;
create policy "Send an inquiry" on public.inquiries
  for insert with check (sender_id = auth.uid() and artist_id <> auth.uid());
create policy "Artist and sender read inquiries" on public.inquiries
  for select using (artist_id = auth.uid() or sender_id = auth.uid());
create policy "Artist marks inquiries read" on public.inquiries
  for update using (artist_id = auth.uid()) with check (artist_id = auth.uid());
revoke update on public.inquiries from anon, authenticated;
grant update (read_at) on public.inquiries to authenticated;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  feedback_id uuid references public.feedback (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
create policy "Report content" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "Curators read reports" on public.reports
  for select using (public.is_admin() or reporter_id = auth.uid());
create policy "Curators resolve reports" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Curator (admin) actions
-- ---------------------------------------------------------------------------
create function public.admin_set_artist_status(target uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only curators can do this'; end if;
  if new_status not in ('approved', 'declined', 'pending') then raise exception 'Unknown status'; end if;
  update public.profiles set artist_status = new_status where id = target and role = 'artist';
end;
$$;

create function public.admin_set_featured(target uuid, value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only curators can do this'; end if;
  update public.projects set featured = value where id = target;
end;
$$;

create function public.admin_set_removed(target uuid, value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only curators can do this'; end if;
  update public.projects
  set status = case when value then 'removed' else 'published' end,
      featured = case when value then false else featured end
  where id = target;
end;
$$;

-- ---------------------------------------------------------------------------
-- File storage: one public bucket; each person uploads into their own folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Upload to your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Replace files in your own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Delete files in your own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
