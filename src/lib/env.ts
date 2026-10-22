// Public settings. The Supabase URL and publishable key are designed to be
// public; the defaults let the app run before environment variables are set.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dnxbkomhsjvbtuwgximv.supabase.co";

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_u4vLe6KlphKh_Vu7VSvM5g_pX0VHqcB";

// The Webflow Cloud mount path, e.g. "/app". Next.js adds it to <Link> and
// redirect() automatically; it's only needed for absolute URLs in emails.
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
