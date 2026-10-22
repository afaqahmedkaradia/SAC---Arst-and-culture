"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canDraft, isApprovedArtist, requireViewer } from "@/lib/viewer";
import { DISCIPLINES, type BlockKind } from "@/lib/constants";

export type EditorBlock = {
  kind: BlockKind;
  text_body?: string | null;
  media_path?: string | null;
  url?: string | null;
  caption?: string | null;
};
export type EditorCredit = { name: string; role?: string | null; username?: string | null };
export type EditorPayload = {
  id?: string | null;
  title: string;
  summary?: string | null;
  discipline: string;
  tags: string[];
  cover_path?: string | null;
  feedback_open: boolean;
  feedback_question?: string | null;
  blocks: EditorBlock[];
  credits: EditorCredit[];
};
export type SaveResult = { error?: string; id?: string; savedAt?: string } | undefined;

const KINDS: BlockKind[] = ["image", "audio", "video", "text", "pdf"];
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "") || null;

export async function saveProject(payload: EditorPayload, publish: boolean): Promise<SaveResult> {
  const viewer = await requireViewer("/dashboard");
  if (!canDraft(viewer.profile)) return { error: "Only artist accounts can create projects." };
  if (publish && !isApprovedArtist(viewer.profile)) {
    return { error: "You can publish once a curator approves your artist account. Save it as a draft for now." };
  }

  const title = str(payload.title, 120);
  if (!title) return { error: "Give your project a title." };
  const discipline = (DISCIPLINES as readonly string[]).includes(payload.discipline) ? payload.discipline : null;
  if (!discipline) return { error: "Pick a discipline." };

  // Files must live in the person's own upload folder.
  const ownPath = (p: unknown) => (typeof p === "string" && p.startsWith(`${viewer.id}/`) ? p.slice(0, 300) : null);

  const blocks = (Array.isArray(payload.blocks) ? payload.blocks : [])
    .filter((b) => KINDS.includes(b.kind))
    .slice(0, 60)
    .map((b, i) => ({
      kind: b.kind,
      position: i,
      text_body: b.kind === "text" ? str(b.text_body, 10000) : null,
      media_path: ["image", "audio", "pdf"].includes(b.kind) ? ownPath(b.media_path) : null,
      url: b.kind === "video" ? str(b.url, 500) : null,
      caption: str(b.caption, 200),
    }))
    .filter((b) => b.text_body || b.media_path || b.url);

  if (publish && blocks.length === 0 && !payload.cover_path) {
    return { error: "Add at least one image, sound, video, text or PDF before publishing." };
  }

  const tags = [...new Set((payload.tags ?? []).map((t) => t.trim().toLowerCase().replace(/^#/, "").slice(0, 30)).filter(Boolean))].slice(0, 10);
  const feedbackOpen = !!payload.feedback_open;
  const row = {
    title,
    summary: str(payload.summary, 280),
    discipline,
    tags,
    cover_path: ownPath(payload.cover_path),
    feedback_open: feedbackOpen,
    feedback_question: feedbackOpen ? str(payload.feedback_question, 300) : null,
    status: publish ? "published" : "draft",
  };

  const supabase = await createClient();
  let id = payload.id ?? null;
  if (id) {
    const { error } = await supabase.from("projects").update(row).eq("id", id).eq("owner_id", viewer.id);
    if (error) return { error: "Couldn't save your project. If a curator removed it, it can't be edited." };
  } else {
    const { data, error } = await supabase.from("projects").insert({ ...row, owner_id: viewer.id }).select("id").single();
    if (error || !data) return { error: "Couldn't create your project. Try again." };
    id = data.id as string;
  }

  // Replace blocks and credits with the editor's current version.
  await supabase.from("project_blocks").delete().eq("project_id", id);
  if (blocks.length) {
    const { error } = await supabase.from("project_blocks").insert(blocks.map((b) => ({ ...b, project_id: id })));
    if (error) return { error: "Saved the project, but some blocks didn't save. Try again.", id };
  }

  const rawCredits = (Array.isArray(payload.credits) ? payload.credits : []).slice(0, 30);
  const usernames = rawCredits.map((c) => c.username?.trim().replace(/^@/, "").toLowerCase()).filter((u): u is string => !!u);
  const byUsername = new Map<string, { id: string; display_name: string }>();
  if (usernames.length) {
    const { data } = await supabase.from("profiles").select("id,username,display_name").in("username", usernames);
    (data ?? []).forEach((p) => byUsername.set(p.username, { id: p.id, display_name: p.display_name }));
  }
  const credits = rawCredits
    .map((c, i) => {
      const linked = c.username ? byUsername.get(c.username.trim().replace(/^@/, "").toLowerCase()) : undefined;
      const name = str(c.name, 80) ?? linked?.display_name ?? null;
      return name ? { project_id: id, position: i, name, role: str(c.role, 80), profile_id: linked?.id ?? null } : null;
    })
    .filter((c) => c !== null);
  await supabase.from("project_credits").delete().eq("project_id", id);
  if (credits.length) await supabase.from("project_credits").insert(credits);

  revalidatePath(`/p/${id}`);
  revalidatePath("/dashboard");
  if (publish) redirect(`/p/${id}`);
  return { id, savedAt: new Date().toISOString() };
}

export async function deleteProject(form: FormData) {
  const viewer = await requireViewer("/dashboard");
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", String(form.get("project_id"))).eq("owner_id", viewer.id);
  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}

export async function unpublishProject(form: FormData) {
  const viewer = await requireViewer("/dashboard");
  const supabase = await createClient();
  const id = String(form.get("project_id"));
  await supabase.from("projects").update({ status: "draft" }).eq("id", id).eq("owner_id", viewer.id);
  revalidatePath(`/p/${id}`);
  revalidatePath("/dashboard");
}
