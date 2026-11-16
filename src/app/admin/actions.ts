"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { notifyUser } from "@/lib/notify";

async function curator() {
  const viewer = await requireViewer("/admin");
  if (!viewer.profile.is_admin) notFound();
  return createClient();
}

export async function setArtistStatus(form: FormData) {
  const supabase = await curator();
  const target = String(form.get("profile_id"));
  const status = String(form.get("status"));
  const { error } = await supabase.rpc("admin_set_artist_status", { target, new_status: status });
  if (!error && status === "approved") {
    await notifyUser(
      target,
      "Your SAC artist account is approved",
      ["Welcome to SAC! A community curator approved your artist account.", "You can now publish your projects."],
      "/dashboard",
    );
  }
  revalidatePath("/admin");
}

const CHECK_IDS = ["community", "real", "own_work", "profile", "guidelines", "consent"];

export type ReviewState = { error?: string } | undefined;

export async function reviewArtist(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const supabase = await curator();
  const target = String(form.get("profile_id"));
  const decision = String(form.get("decision"));
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  const checklist = Object.fromEntries(CHECK_IDS.map((id) => [id, form.get(`check_${id}`) === "on"]));
  if (decision === "approved" && !CHECK_IDS.every((id) => checklist[id])) {
    return { error: "Tick all six checks before approving, or request changes instead." };
  }
  if ((decision === "changes" || decision === "declined") && !note) {
    return { error: "Add a note for the artist explaining what to change or why." };
  }
  const { error } = await supabase.rpc("admin_review_artist", { target, decision, checklist, note });
  if (error) return { error: error.message.includes("own application") ? "You can't review your own application." : "Couldn't save the review. Try again." };

  if (decision === "approved") {
    await notifyUser(
      target,
      "Your SAC artist account is approved",
      ["Welcome to SAC! A community curator approved your artist account.", "You can now publish your projects.", ...(note ? [`A note from the curator: ${note}`] : [])],
      "/dashboard",
    );
  } else if (decision === "changes") {
    await notifyUser(
      target,
      "A few changes before your SAC page goes live",
      ["A community curator reviewed your artist application and asked for a few changes:", note, "Update your profile or projects, and the curators will take another look."],
      "/dashboard",
    );
  } else {
    await notifyUser(
      target,
      "About your SAC artist application",
      ["A community curator reviewed your artist application and wasn’t able to approve it this time:", note, "You can still follow artists and take part as a member. If you think this is a mistake, reply to this email to ask for a second review."],
      "/dashboard",
    );
  }
  revalidatePath("/admin");
  return undefined;
}

export async function setFeatured(form: FormData) {
  const supabase = await curator();
  await supabase.rpc("admin_set_featured", { target: String(form.get("project_id")), value: form.get("value") === "1" });
  revalidatePath("/admin");
  revalidatePath("/"); revalidatePath("/explore");
}

export async function setRemoved(form: FormData) {
  const supabase = await curator();
  await supabase.rpc("admin_set_removed", { target: String(form.get("project_id")), value: form.get("value") === "1" });
  revalidatePath("/admin");
  revalidatePath("/"); revalidatePath("/explore");
}

export async function resolveReport(form: FormData) {
  const supabase = await curator();
  await supabase.from("reports").update({ status: "resolved" }).eq("id", String(form.get("report_id")));
  revalidatePath("/admin");
}
