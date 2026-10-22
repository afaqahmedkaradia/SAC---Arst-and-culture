"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { AVAILABLE_FOR, BANNER_COLORS, DISCIPLINES } from "@/lib/constants";

export type ProfileState = { error?: string; ok?: string } | undefined;

export async function requestArtistAccount() {
  await requireViewer();
  const supabase = await createClient();
  await supabase.rpc("request_artist_account");
  revalidatePath("/dashboard");
}

export async function markInquiryRead(form: FormData) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  await supabase
    .from("inquiries")
    .update({ read_at: new Date().toISOString() })
    .eq("id", String(form.get("inquiry_id")))
    .eq("artist_id", viewer.id);
  revalidatePath("/dashboard");
}

const text = (form: FormData, key: string, max: number) => {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v || null;
};

export async function updateProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const viewer = await requireViewer("/dashboard/settings");
  const displayName = text(form, "display_name", 80);
  if (!displayName) return { error: "Your name can't be empty." };
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(username)) {
    return { error: "Usernames are 3–30 characters: lowercase letters, numbers and dashes." };
  }
  const banner = String(form.get("banner_color") ?? "");
  const avatar = String(form.get("avatar_path") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      headline: text(form, "headline", 120),
      bio: text(form, "bio", 2000),
      location: text(form, "location", 80),
      website: text(form, "website", 300),
      instagram: text(form, "instagram", 100),
      banner_color: BANNER_COLORS.includes(banner) ? banner : viewer.profile.banner_color,
      avatar_path: avatar.startsWith(`${viewer.id}/`) ? avatar : avatar === "" ? null : viewer.profile.avatar_path,
      disciplines: form.getAll("disciplines").map(String).filter((d) => (DISCIPLINES as readonly string[]).includes(d)),
      available_for: form.getAll("available_for").map(String).filter((d) => (AVAILABLE_FOR as readonly string[]).includes(d)),
    })
    .eq("id", viewer.id);
  if (error) {
    return { error: error.code === "23505" ? "That username is taken. Try another." : "Couldn't save your profile. Try again." };
  }
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}
