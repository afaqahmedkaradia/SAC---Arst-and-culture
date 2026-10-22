import "server-only";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_URL } from "@/lib/env";

// Optional email notifications. They only send when SUPABASE_SECRET_KEY,
// RESEND_API_KEY and EMAIL_FROM are set as secrets in Webflow Cloud;
// otherwise everything still works and shows up in the dashboard.
export async function notifyUser(userId: string, subject: string, lines: string[], path?: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!secret || !resendKey || !from) return;

  try {
    const admin = createAdminClient(SUPABASE_URL, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin.auth.admin.getUserById(userId);
    const to = data.user?.email;
    if (!to) return;

    const link = path && SITE_URL ? `${SITE_URL}${path}` : null;
    const text = [...lines, ...(link ? ["", link] : []), "", "— SAC, Space for Arts and Culture"].join("\n");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
  } catch (err) {
    console.error("Email notification failed", err);
  }
}
