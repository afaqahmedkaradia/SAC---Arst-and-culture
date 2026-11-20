"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { NEWSLETTER_TOPIC_IDS } from "@/lib/constants";
import { newsletterSetup, renderNewsletter, sendBatch, sendOne, serviceClient, unsubscribeHeaders, type OutgoingEmail } from "@/lib/newsletter";

async function curator() {
  const viewer = await requireViewer("/admin/newsletter");
  if (!viewer.profile.is_admin) throw new Error("Only curators can do this");
  return { viewer, supabase: await createClient() };
}

export type ComposeState = { ok?: string; error?: string } | undefined;

export async function createNewsletter() {
  const { viewer, supabase } = await curator();
  const { data, error } = await supabase.from("newsletters").insert({ created_by: viewer.id, topics: ["events"] }).select("id").single();
  if (error || !data) throw new Error("Couldn't create the newsletter");
  redirect(`/admin/newsletter/${data.id}`);
}

function fields(form: FormData) {
  const s = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  let url = s("button_url", 500);
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return {
    subject: s("subject", 150),
    preheader: s("preheader", 200) || null,
    body: String(form.get("body") ?? "").replace(/\r/g, "").slice(0, 20000),
    button_label: s("button_label", 60) || null,
    button_url: url || null,
    topics: form.getAll("topics").map(String).filter((t) => NEWSLETTER_TOPIC_IDS.includes(t)),
    updated_at: new Date().toISOString(),
  };
}

export async function saveNewsletter(_prev: ComposeState, form: FormData): Promise<ComposeState> {
  const { supabase } = await curator();
  const id = String(form.get("id"));
  const f = fields(form);
  if (f.button_label && !f.button_url) return { error: "Add the web address for the button, or clear its label." };
  const { error } = await supabase.from("newsletters").update(f).eq("id", id).eq("status", "draft");
  if (error) return { error: "Couldn't save. Try again." };
  revalidatePath(`/admin/newsletter/${id}`);
  const intent = String(form.get("intent") ?? "save");
  if (intent === "test") {
    const { viewer } = await curator();
    if (!newsletterSetup().ready) return { error: "Saved. Test emails need the newsletter setup to be finished first (see the top of this page)." };
    if (!viewer.email) return { error: "Saved, but your account has no email address to send a test to." };
    if (!f.subject || !f.body.trim()) return { error: "Saved. Add a subject and some text before sending a test." };
    const mail = renderNewsletter(f, null);
    const res = await sendOne({ to: viewer.email, subject: `[Test] ${f.subject}`, ...mail });
    return res.ok ? { ok: `Saved, and a test was sent to ${viewer.email}.` } : { error: "Saved, but the test email couldn't be sent. Check the email settings." };
  }
  return { ok: "Saved." };
}

export async function deleteNewsletter(form: FormData) {
  const { supabase } = await curator();
  await supabase.from("newsletters").delete().eq("id", String(form.get("id"))).eq("status", "draft");
  redirect("/admin/newsletter");
}

// Queue the newsletter for every matching subscriber. Returns how many.
export async function startSending(id: string): Promise<{ count?: number; error?: string }> {
  const { supabase } = await curator();
  const setup = newsletterSetup();
  if (!setup.ready) return { error: `Finish the newsletter setup first: ${setup.missing.join(", ")}.` };
  const { data: nl } = await supabase.from("newsletters").select("subject,body,topics,status").eq("id", id).maybeSingle();
  if (!nl) return { error: "Newsletter not found." };
  if (nl.status === "sent") return { error: "This newsletter was already sent." };
  if (!nl.subject || !nl.body.trim()) return { error: "Add a subject and some text first." };
  if (!nl.topics.length) return { error: "Choose at least one topic to send to." };
  const db = serviceClient()!;
  const { data, error } = await db.rpc("newsletter_queue", { target: id });
  if (error) return { error: "Couldn't start sending. Try again." };
  revalidatePath("/admin/newsletter");
  return { count: data as number };
}

const BATCH = 100;

// Send the next batch of up to 100. The curator's page calls this until nothing is left.
export async function sendNextBatch(id: string): Promise<{ remaining: number; sent: number; failed: number; error?: string }> {
  await curator();
  const db = serviceClient();
  if (!db) return { remaining: 0, sent: 0, failed: 0, error: "Newsletter setup isn't finished." };

  const { data: nl } = await db.from("newsletters").select("subject,preheader,body,button_label,button_url,topics,status").eq("id", id).maybeSingle();
  if (!nl || nl.status === "draft") return { remaining: 0, sent: 0, failed: 0, error: "Press Send first." };

  type Row = { subscriber_id: string; subscriber: { email: string; token: string; status: string } | null };
  const { data: rows } = await db
    .from("newsletter_deliveries")
    .select("subscriber_id, subscriber:newsletter_subscribers(email,token,status)")
    .eq("newsletter_id", id)
    .eq("status", "queued")
    .limit(BATCH);
  const queue = (rows ?? []) as unknown as Row[];

  // People who unsubscribed after the newsletter was queued are skipped.
  const skip = queue.filter((r) => r.subscriber?.status !== "active").map((r) => r.subscriber_id);
  const go = queue.filter((r) => r.subscriber?.status === "active");
  if (skip.length) await db.from("newsletter_deliveries").update({ status: "skipped" }).eq("newsletter_id", id).in("subscriber_id", skip);

  let batchError: string | undefined;
  if (go.length) {
    const mails: OutgoingEmail[] = go.map((r) => ({
      to: r.subscriber!.email,
      subject: nl.subject,
      ...renderNewsletter(nl, r.subscriber!.token),
      headers: unsubscribeHeaders(r.subscriber!.token),
    }));
    const res = await sendBatch(mails);
    const now = new Date().toISOString();
    await db
      .from("newsletter_deliveries")
      .update(res.ok ? { status: "sent", sent_at: now } : { status: "failed", error: res.error ?? "Send failed" })
      .eq("newsletter_id", id)
      .in("subscriber_id", go.map((r) => r.subscriber_id));
    if (!res.ok) batchError = res.error;
  }

  const count = async (status: string) =>
    (await db.from("newsletter_deliveries").select("*", { count: "exact", head: true }).eq("newsletter_id", id).eq("status", status)).count ?? 0;
  const [remaining, sent, failed] = await Promise.all([count("queued"), count("sent"), count("failed")]);
  await db
    .from("newsletters")
    .update({ sent_count: sent, failed_count: failed, updated_at: new Date().toISOString(), ...(remaining === 0 ? { status: "sent", sent_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (remaining === 0) revalidatePath(`/admin/newsletter/${id}`);
  return { remaining, sent, failed, error: batchError };
}

// Put failed deliveries back in the queue to try again.
export async function retryFailed(id: string) {
  await curator();
  const db = serviceClient();
  if (!db) return;
  await db.from("newsletter_deliveries").update({ status: "queued", error: null }).eq("newsletter_id", id).eq("status", "failed");
  await db.from("newsletters").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/admin/newsletter/${id}`);
}
