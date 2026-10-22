"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { notifyUser } from "@/lib/notify";
import { INQUIRY_KINDS } from "@/lib/constants";

export type ActionState = { error?: string; ok?: string } | undefined;

async function signedIn(next: string) {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

const path = (form: FormData) => {
  const p = String(form.get("path") ?? "/");
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
};

export async function toggleAppreciation(form: FormData) {
  const projectId = String(form.get("project_id"));
  const viewer = await signedIn(path(form));
  const supabase = await createClient();
  if (form.get("on") === "1") {
    await supabase.from("appreciations").delete().eq("project_id", projectId).eq("user_id", viewer.id);
  } else {
    await supabase.from("appreciations").insert({ project_id: projectId, user_id: viewer.id });
  }
  revalidatePath(path(form));
}

export async function toggleFollow(form: FormData) {
  const artistId = String(form.get("artist_id"));
  const viewer = await signedIn(path(form));
  if (artistId === viewer.id) return;
  const supabase = await createClient();
  if (form.get("on") === "1") {
    await supabase.from("follows").delete().eq("follower_id", viewer.id).eq("artist_id", artistId);
  } else {
    await supabase.from("follows").insert({ follower_id: viewer.id, artist_id: artistId });
  }
  revalidatePath(path(form));
}

export async function saveToCollection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const projectId = String(form.get("project_id"));
  const viewer = await signedIn(path(form));
  const supabase = await createClient();
  let collectionId = String(form.get("collection_id") ?? "");
  const newName = String(form.get("new_name") ?? "").trim();

  if (collectionId === "new" || !collectionId) {
    if (!newName) return { error: "Name your new collection." };
    const { data, error } = await supabase
      .from("collections")
      .insert({ owner_id: viewer.id, name: newName.slice(0, 80) })
      .select("id")
      .single();
    if (error || !data) return { error: "Couldn't create the collection. Try again." };
    collectionId = data.id;
  }
  const { error } = await supabase
    .from("collection_items")
    .upsert({ collection_id: collectionId, project_id: projectId }, { onConflict: "collection_id,project_id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't save it. Try again." };
  revalidatePath(path(form));
  return { ok: "Saved to your collection." };
}

export async function removeFromCollection(form: FormData) {
  await signedIn(path(form));
  const supabase = await createClient();
  await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", String(form.get("collection_id")))
    .eq("project_id", String(form.get("project_id")));
  revalidatePath(path(form));
}

export async function deleteCollection(form: FormData) {
  await signedIn("/dashboard");
  const supabase = await createClient();
  await supabase.from("collections").delete().eq("id", String(form.get("collection_id")));
  redirect("/dashboard");
}

export async function postFeedback(_prev: ActionState, form: FormData): Promise<ActionState> {
  const projectId = String(form.get("project_id"));
  const viewer = await signedIn(`/p/${projectId}#feedback`);
  const working = String(form.get("working") ?? "").trim().slice(0, 2000);
  const explore = String(form.get("explore") ?? "").trim().slice(0, 2000);
  const question = String(form.get("question") ?? "").trim().slice(0, 1000);
  const visibility = form.get("visibility") === "artist" ? "artist" : "public";
  if (!working && !explore) return { error: "Share what's working or what you'd explore. A sentence is enough." };

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    project_id: projectId,
    author_id: viewer.id,
    working: working || null,
    explore: explore || null,
    question: question || null,
    visibility,
  });
  if (error) return { error: "Couldn't post your feedback. The project may have closed feedback." };

  const { data: project } = await supabase.from("projects").select("owner_id,title").eq("id", projectId).maybeSingle();
  if (project) {
    await notifyUser(
      project.owner_id,
      `New feedback on “${project.title}”`,
      [`${viewer.profile?.display_name ?? "A member"} left feedback on your project “${project.title}”.`],
      `/p/${projectId}#feedback`,
    );
  }
  revalidatePath(`/p/${projectId}`);
  return { ok: "Thanks! Your feedback is posted." };
}

export async function setHelpful(form: FormData) {
  await signedIn(path(form));
  const supabase = await createClient();
  await supabase.rpc("set_feedback_helpful", {
    feedback_id: String(form.get("feedback_id")),
    value: form.get("value") === "1",
  });
  revalidatePath(path(form));
}

export async function deleteFeedback(form: FormData) {
  await signedIn(path(form));
  const supabase = await createClient();
  await supabase.from("feedback").delete().eq("id", String(form.get("feedback_id")));
  revalidatePath(path(form));
}

export async function sendInquiry(_prev: ActionState, form: FormData): Promise<ActionState> {
  const artistId = String(form.get("artist_id"));
  const projectId = String(form.get("project_id") ?? "") || null;
  const viewer = await signedIn(path(form));
  const kindRaw = String(form.get("kind") ?? "other");
  const kind = INQUIRY_KINDS.some((k) => k.value === kindRaw) ? kindRaw : "other";
  const message = String(form.get("message") ?? "").trim().slice(0, 2000);
  const email = String(form.get("email") ?? viewer.email ?? "").trim().slice(0, 200);
  if (!message) return { error: "Write a short message for the artist." };
  if (!email.includes("@")) return { error: "Add an email address the artist can reply to." };
  if (artistId === viewer.id) return { error: "This is your own work." };

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert({
    artist_id: artistId,
    project_id: projectId,
    sender_id: viewer.id,
    sender_email: email,
    kind,
    message,
  });
  if (error) return { error: "Couldn't send your message. Try again." };

  await notifyUser(
    artistId,
    `New inquiry from ${viewer.profile?.display_name ?? "a SAC member"}`,
    [
      `${viewer.profile?.display_name ?? "A member"} (${email}) sent you a message on SAC:`,
      "",
      message,
      "",
      "Reply to them directly by email.",
    ],
    "/dashboard",
  );
  return { ok: "Message sent. The artist will reply to your email." };
}

export async function reportContent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await signedIn(path(form));
  const reason = String(form.get("reason") ?? "").trim().slice(0, 1000);
  if (!reason) return { error: "Tell the curators what's wrong." };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: viewer.id,
    project_id: String(form.get("project_id") ?? "") || null,
    feedback_id: String(form.get("feedback_id") ?? "") || null,
    reason,
  });
  if (error) return { error: "Couldn't send the report. Try again." };
  return { ok: "Thanks. A curator will look at it." };
}
