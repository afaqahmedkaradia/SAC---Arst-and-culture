"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

// A Supabase client for the browser, used for uploading files straight to
// Supabase Storage so large files never pass through the app server.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
