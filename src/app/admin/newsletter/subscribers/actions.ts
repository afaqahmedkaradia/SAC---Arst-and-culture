"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/viewer";
import { NEWSLETTER_TOPIC_IDS } from "@/lib/constants";
import { confirmationEmail, newsletterSetup, sendBatch, serviceClient, validEmail, type OutgoingEmail } from "@/lib/newsletter";

export type ImportState = { ok?: string; error?: string } | undefined;

const MAX = 1000;

async function curator() {
  const viewer = await requireViewer("/admin/newsletter/subscribers");
  if (!viewer.profile.is_admin) throw new Error("Only curators can do this");
  return viewer;
}

export async function addSubscribers(_prev: ImportState, form: FormData): Promise<ImportState> {
  const viewer = await curator();
  const setup = newsletterSetup();
  const db = serviceClient();
  if (!db || !setup.ready) return { error: `Finish the newsletter setup first: ${setup.missing.join(", ")}.` };

  const found = String(form.get("emails") ?? "").toLowerCase().match(/[^\s,;<>"'()]+@[^\s,;<>"'()]+\.[a-z]{2,}/g) ?? [];
  const emails = [...new Set(found.map((e) => e.trim()))].filter(validEmail);
  if (!emails.length) return { error: "No email addresses found. Paste them one per line, or upload a CSV." };
  if (emails.length > MAX) return { error: `That's ${emails.length} addresses. Add up to ${MAX} at a time.` };

  const topics = form.getAll("topics").map(String).filter((t) => NEWSLETTER_TOPIC_IDS.includes(t));
  if (!topics.length) return { error: "Choose at least one topic." };

  const mode = String(form.get("mode"));
  const note = String(form.get("consent_note") ?? "").trim().slice(0, 300);
  if (mode === "consented" && note.length < 5) {
    return { error: "Say where these people agreed to SAC emails, for example “Sign-up sheet at the Spring Showcase, March 2027”." };
  }
  if (mode === "consented" && form.get("confirm") !== "on") {
    return { error: "Tick the box to confirm everyone on this list agreed to receive SAC emails." };
  }

  // What we already know about these addresses.
  const existing = new Map<string, { id: string; status: string; topics: string[]; token: string }>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await db.from("newsletter_subscribers").select("id,email,status,topics,token").in("email", emails.slice(i, i + 200));
    for (const r of data ?? []) existing.set(r.email, r);
  }

  const now = new Date().toISOString();
  let added = 0, merged = 0, skipped = 0;
  const invites: { email: string; token: string }[] = [];

  for (const email of emails) {
    const row = existing.get(email);
    if (row?.status === "unsubscribed") {
      skipped++; // never re-add people who opted out
      continue;
    }
    if (row?.status === "active") {
      await db.from("newsletter_subscribers").update({ topics: [...new Set([...row.topics, ...topics])], updated_at: now }).eq("id", row.id);
      merged++;
      continue;
    }
    if (row?.status === "pending") {
      await db.from("newsletter_subscribers").update({ topics: [...new Set([...row.topics, ...topics])], updated_at: now }).eq("id", row.id);
      if (mode === "invite") invites.push({ email, token: row.token });
      else await db.from("newsletter_subscribers").update({ status: "active", confirmed_at: now, consent_source: "import", consent_note: note, added_by: viewer.id }).eq("id", row.id);
      merged++;
      continue;
    }
    const { data, error } = await db
      .from("newsletter_subscribers")
      .insert({
        email,
        topics,
        status: mode === "consented" ? "active" : "pending",
        consent_source: "import",
        consent_note: mode === "consented" ? note : "Invited by a curator; joins only after confirming by email",
        consent_at: now,
        confirmed_at: mode === "consented" ? now : null,
        added_by: viewer.id,
      })
      .select("token")
      .single();
    if (error || !data) {
      skipped++;
      continue;
    }
    added++;
    if (mode === "invite") invites.push({ email, token: data.token });
  }

  // Invitations go out in batches of 100.
  let inviteErrors = 0;
  for (let i = 0; i < invites.length; i += 100) {
    const mails: OutgoingEmail[] = invites.slice(i, i + 100).map((v) => ({ to: v.email, subject: "Confirm your SAC subscription", ...confirmationEmail(v.token) }));
    const res = await sendBatch(mails);
    if (!res.ok) inviteErrors += mails.length;
    if (i + 100 < invites.length) await new Promise((r) => setTimeout(r, 600));
  }

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/newsletter/subscribers");
  const parts = [
    added && `${added} added`,
    merged && `${merged} already on the list (topics updated)`,
    skipped && `${skipped} skipped because they unsubscribed or couldn't be added`,
  ].filter(Boolean);
  const inviteLine = mode === "invite" ? ` ${invites.length - inviteErrors} invitations sent; people join once they confirm.` : "";
  if (inviteErrors) return { error: `${parts.join(", ")}. ${inviteErrors} invitations couldn't be sent; check the email settings and try again.` };
  return { ok: `${parts.join(", ") || "Nothing to add"}.${inviteLine}` };
}

export async function removeSubscriber(form: FormData) {
  await curator();
  const db = serviceClient();
  if (!db) return;
  const now = new Date().toISOString();
  await db.from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: now, updated_at: now }).eq("id", String(form.get("id")));
  revalidatePath("/admin/newsletter/subscribers");
}
