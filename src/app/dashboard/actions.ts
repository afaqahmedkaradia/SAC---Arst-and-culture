"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { AVAILABLE_FOR, BANNER_COLORS, CV_KINDS, DISCIPLINES, LINK_PLATFORMS, type CvEntry, type ProfileLink } from "@/lib/constants";

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

function parseJson(v: FormDataEntryValue | null): unknown[] {
  try {
    const out = JSON.parse(String(v ?? "[]"));
    return Array.isArray(out) ? out : [];
  } catch {
    return [];
  }
}

const cut = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function parseLinks(v: FormDataEntryValue | null): ProfileLink[] {
  const ids = LINK_PLATFORMS.map((p) => p.id) as string[];
  return parseJson(v)
    .map((l) => {
      const o = (l ?? {}) as Record<string, unknown>;
      let url = cut(o.url, 300);
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      const platform = ids.includes(String(o.platform)) ? (String(o.platform) as ProfileLink["platform"]) : "other";
      return url && /^https?:\/\/[^\s]+\.[^\s]+$/i.test(url) ? { platform, url } : null;
    })
    .filter((l): l is ProfileLink => l !== null)
    .slice(0, 8);
}

function parseCv(v: FormDataEntryValue | null): CvEntry[] {
  const kinds = CV_KINDS.map((k) => k.id) as string[];
  return parseJson(v)
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const title = cut(o.title, 120);
      if (!title) return null;
      const place = cut(o.place, 120);
      return {
        year: cut(o.year, 9),
        kind: (kinds.includes(String(o.kind)) ? String(o.kind) : "other") as CvEntry["kind"],
        title,
        ...(place ? { place } : {}),
      };
    })
    .filter((r): r is CvEntry => r !== null)
    .slice(0, 30);
}

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
      links: parseLinks(form.get("links")),
      ...(viewer.profile.role === "artist" ? { cv: parseCv(form.get("cv")) } : {}),
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

// Adds the details an artist chose from their CV or LinkedIn file.
// Nothing already on the profile is removed: lists are merged, text fields only change when chosen.
export async function importProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const viewer = await requireViewer("/dashboard/settings");
  const p = viewer.profile;
  const field = (name: string, max: number) => (form.has(name) ? String(form.get(name) ?? "").trim().slice(0, max) : null);
  const headline = field("headline", 120);
  const bio = field("bio", 2000);
  const location = field("location", 80);

  const links = [...(p.links ?? [])];
  const linkKey = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  for (const l of parseLinks(form.get("links"))) {
    if (links.length >= 8) break;
    if (!links.some((x) => linkKey(x.url) === linkKey(l.url))) links.push(l);
  }

  const cv = [...(p.cv ?? [])];
  const cvKey = (e: CvEntry) => `${e.year}|${e.title.trim().toLowerCase()}`;
  if (p.role === "artist") {
    for (const e of parseCv(form.get("cv"))) {
      if (cv.length >= 30) break;
      if (!cv.some((x) => cvKey(x) === cvKey(e))) cv.push(e);
    }
    cv.sort((a, b) => (b.year || "").localeCompare(a.year || ""));
  }

  const union = (have: string[] | null | undefined, name: string, allowed: readonly string[]) =>
    Array.from(new Set([...(have ?? []), ...form.getAll(name).map(String).filter((d) => allowed.includes(d))]));

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(headline ? { headline } : {}),
      ...(bio ? { bio } : {}),
      ...(location ? { location } : {}),
      links,
      ...(p.role === "artist" ? { cv } : {}),
      disciplines: union(p.disciplines, "disciplines", DISCIPLINES),
      available_for: union(p.available_for, "available_for", AVAILABLE_FOR),
    })
    .eq("id", viewer.id);
  if (error) return { error: "Couldn't add these to your profile. Try again." };
  revalidatePath("/", "layout");
  return { ok: "Added to your profile." };
}
