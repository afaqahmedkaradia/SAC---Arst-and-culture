import "server-only";
import { NEWSLETTER_TOPIC_IDS } from "@/lib/constants";
import { cleanEmail, serviceClient } from "@/lib/newsletter";

// Subscribes a new account that ticked "send me news" when joining, once its
// email address is confirmed. Quietly does nothing if newsletters aren't set up.
export async function subscribeFromSignup(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  if (!user?.email || user.user_metadata?.newsletter_opt_in !== true) return;
  const db = serviceClient();
  if (!db) return;
  const email = cleanEmail(user.email);
  const { data: row } = await db.from("newsletter_subscribers").select("id").eq("email", email).maybeSingle();
  if (row) return;
  const now = new Date().toISOString();
  await db.from("newsletter_subscribers").insert({
    email,
    profile_id: user.id,
    topics: NEWSLETTER_TOPIC_IDS,
    status: "active",
    consent_source: "signup",
    consent_at: String(user.user_metadata?.agreed_terms_at ?? now),
    confirmed_at: now,
  });
}
