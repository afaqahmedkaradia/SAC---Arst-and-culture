import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type Viewer = { id: string; email: string | null; profile: Profile | null };

// The signed-in person for this request, or null. Cached per request.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null, profile: (profile as Profile) ?? null };
});

export async function requireViewer(next = "/dashboard"): Promise<Viewer & { profile: Profile }> {
  const viewer = await getViewer();
  if (!viewer || !viewer.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer as Viewer & { profile: Profile };
}

export function isApprovedArtist(p: Profile | null | undefined) {
  return !!p && p.role === "artist" && p.artist_status === "approved";
}

export function canDraft(p: Profile | null | undefined) {
  return !!p && p.role === "artist" && (p.artist_status === "approved" || p.artist_status === "pending");
}
