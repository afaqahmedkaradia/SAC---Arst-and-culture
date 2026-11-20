-- SAC — curators can add subscribers
-- Adds an "import" consent source and a note recording where consent came from.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run, after 0004. It is safe to run again.

alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_consent_source_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_consent_source_check
  check (consent_source in ('form', 'signup', 'settings', 'import'));

alter table public.newsletter_subscribers
  add column if not exists consent_note text check (char_length(consent_note) <= 300),
  add column if not exists added_by uuid references public.profiles (id) on delete set null;
