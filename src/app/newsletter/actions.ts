"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/viewer";
import { NEWSLETTER_TOPIC_IDS } from "@/lib/constants";
import { cleanEmail, confirmationEmail, newsletterSetup, sendOne, serviceClient, validEmail } from "@/lib/newsletter";

export type FormState = { ok?: string; error?: string } | undefined;

const topicsFrom = (form: FormData) => form.getAll("topics").map(String).filter((t) => NEWSLETTER_TOPIC_IDS.includes(t));

// Public sign-up form: double opt-in. The answer is the same whether or not the
// address is already subscribed, so the form can't be used to look people up.
export async function subscribe(_prev: FormState, form: FormData): Promise<FormState> {
  if (String(form.get("website") ?? "")) return { ok: "Thanks! Check your inbox for a link to confirm." }; // bots fill hidden fields
  const email = cleanEmail(form.get("email"));
  const topics = topicsFrom(form);
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (!topics.length) return { error: "Choose at least one topic." };
  if (form.get("consent") !== "on") return { error: "Tick the box to agree to receive emails from SAC." };
  const db = serviceClient();
  if (!db || !newsletterSetup().ready) return { error: "Newsletter sign-up isn’t open yet. Please try again soon." };

  const { data: row } = await db.from("newsletter_subscribers").select("id,status,topics,token,updated_at").eq("email", email).maybeSingle();
  const done = { ok: "Thanks! Check your inbox for a link to confirm your subscription." };

  if (row?.status === "active") {
    const merged = [...new Set([...(row.topics ?? []), ...topics])];
    await db.from("newsletter_subscribers").update({ topics: merged, updated_at: new Date().toISOString() }).eq("id", row.id);
    return done;
  }
  if (row?.status === "pending" && Date.now() - Date.parse(row.updated_at) < 10 * 60 * 1000) return done;

  const now = new Date().toISOString();
  let token = row?.token as string | undefined;
  if (row) {
    await db.from("newsletter_subscribers").update({ status: "pending", topics, consent_source: "form", consent_at: now, unsubscribed_at: null, updated_at: now }).eq("id", row.id);
  } else {
    const { data, error } = await db.from("newsletter_subscribers").insert({ email, topics, status: "pending", consent_source: "form", consent_at: now }).select("token").single();
    if (error || !data) return { error: "Couldn’t sign you up. Please try again." };
    token = data.token;
  }
  const mail = confirmationEmail(token!);
  await sendOne({ to: email, subject: "Confirm your SAC subscription", ...mail });
  return done;
}

// Preferences from the link in an email.
export async function updateByToken(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const db = serviceClient();
  if (!db || !/^[0-9a-f-]{36}$/i.test(token)) return { error: "This link isn’t valid." };
  const unsubscribeAll = form.get("unsubscribe") === "1";
  const topics = unsubscribeAll ? [] : topicsFrom(form);
  const now = new Date().toISOString();
  const patch = topics.length
    ? { topics, status: "active", unsubscribed_at: null, updated_at: now }
    : { status: "unsubscribed", unsubscribed_at: now, updated_at: now };
  const { error } = await db.from("newsletter_subscribers").update(patch).eq("token", token);
  if (error) return { error: "Couldn’t save that. Please try again." };
  return { ok: topics.length ? "Saved. You’ll only hear about the topics you chose." : "You’re unsubscribed. You won’t get any more newsletters from SAC." };
}

// Preferences for people who are logged in (from their settings page).
export async function updateMyNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.email) return { error: "Please log in again." };
  const db = serviceClient();
  if (!db || !newsletterSetup().ready) return { error: "Newsletters aren’t set up yet." };
  const topics = topicsFrom(form);
  const email = cleanEmail(viewer.email);
  const now = new Date().toISOString();
  const { data: row } = await db.from("newsletter_subscribers").select("id").eq("email", email).maybeSingle();
  if (!topics.length) {
    if (row) await db.from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: now, updated_at: now }).eq("id", row.id);
  } else if (row) {
    await db.from("newsletter_subscribers").update({ topics, status: "active", profile_id: viewer.id, consent_source: "settings", consent_at: now, confirmed_at: now, unsubscribed_at: null, updated_at: now }).eq("id", row.id);
  } else {
    await db.from("newsletter_subscribers").insert({ email, topics, status: "active", profile_id: viewer.id, consent_source: "settings", consent_at: now, confirmed_at: now });
  }
  revalidatePath("/dashboard/settings");
  return { ok: topics.length ? "Saved. You’re subscribed to the topics you chose." : "Saved. You won’t get newsletters." };
}
