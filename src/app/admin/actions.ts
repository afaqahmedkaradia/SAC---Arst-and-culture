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

export async function setFeatured(form: FormData) {
  const supabase = await curator();
  await supabase.rpc("admin_set_featured", { target: String(form.get("project_id")), value: form.get("value") === "1" });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setRemoved(form: FormData) {
  const supabase = await curator();
  await supabase.rpc("admin_set_removed", { target: String(form.get("project_id")), value: form.get("value") === "1" });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function resolveReport(form: FormData) {
  const supabase = await curator();
  await supabase.from("reports").update({ status: "resolved" }).eq("id", String(form.get("report_id")));
  revalidatePath("/admin");
}
