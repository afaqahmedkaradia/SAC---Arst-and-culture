-- Run this once if you already ran 0001_init.sql before the Signature redesign.
-- It moves profile colours to the new community palette.
alter table public.profiles alter column banner_color set default '#007041';
update public.profiles set banner_color = '#007041' where banner_color = '#2B2A6B';
