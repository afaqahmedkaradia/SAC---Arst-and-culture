import "server-only";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_URL } from "@/lib/env";
import { CONTACT_EMAIL, NEWSLETTER_TOPICS, OPERATOR } from "@/lib/constants";

// Newsletters need four secrets in Webflow Cloud, plus the site address and a
// mailing address (Canada's anti-spam law requires one in every newsletter).
export function newsletterSetup() {
  const missing: string[] = [];
  if (!process.env.SUPABASE_SECRET_KEY) missing.push("SUPABASE_SECRET_KEY");
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!process.env.EMAIL_FROM) missing.push("EMAIL_FROM");
  if (!SITE_URL) missing.push("NEXT_PUBLIC_SITE_URL");
  if (!process.env.NEWSLETTER_POSTAL_ADDRESS) missing.push("NEWSLETTER_POSTAL_ADDRESS");
  return { ready: missing.length === 0, missing };
}

// Server-only client that can read and write subscribers. Never sent to the browser.
export function serviceClient(): SupabaseClient | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return null;
  return createAdminClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase().slice(0, 320);
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const manageUrl = (token: string) => `${SITE_URL}/newsletter/manage?t=${token}`;
export const unsubscribeUrl = (token: string) => `${SITE_URL}/api/newsletter/unsubscribe?t=${token}`;

// ---------------------------------------------------------------------------
// Rendering. The body is plain text with a few marks: a blank line starts a
// paragraph, "## " a heading, "- " a list item, **bold**, [text](https://…),
// and a picture on its own line: ![description](https://…). Two pictures in
// one paragraph sit side by side.
// ---------------------------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = (u: string) => (/^https?:\/\/[^\s"<>]+$/i.test(u) ? u : null);

function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) =>
      safeUrl(url.replace(/&amp;/g, "&")) ? `<a href="${url}" style="color:#B00012;">${text}</a>` : text,
    );
}

function inlineText(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)");
}

const IMG_LINE = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;

function imageTag(alt: string, url: string, width: number) {
  const src = safeUrl(url);
  if (!src) return "";
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;border-radius:12px;">`;
}

function bodyHtml(body: string) {
  return body
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2 style="margin:28px 0 8px;font-size:22px;line-height:1.25;color:#141416;">${inline(block.slice(3))}</h2>`;
      }
      const lines = block.split("\n");
      const imgs = lines.map((l) => l.trim().match(IMG_LINE));
      if (imgs.every(Boolean)) {
        const pics = imgs as RegExpMatchArray[];
        if (pics.length === 2) {
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr>${pics
            .map((m, i) => `<td width="50%" valign="top" style="padding:${i ? "0 0 0 6px" : "0 6px 0 0"};">${imageTag(m[1], m[2], 266)}</td>`)
            .join("")}</tr></table>`;
        }
        return pics.map((m) => `<div style="margin:4px 0 20px;">${imageTag(m[1], m[2], 544)}</div>`).join("");
      }
      if (lines.every((l) => /^- /.test(l))) {
        return `<ul style="margin:0 0 16px;padding-left:22px;">${lines.map((l) => `<li style="margin:0 0 6px;">${inline(l.slice(2))}</li>`).join("")}</ul>`;
      }
      return `<p style="margin:0 0 16px;">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

export type NewsletterContent = {
  subject: string;
  preheader?: string | null;
  body: string;
  button_label?: string | null;
  button_url?: string | null;
  topics: string[];
};

export function renderNewsletter(n: NewsletterContent, token: string | null) {
  const topicNames = NEWSLETTER_TOPICS.filter((t) => n.topics.includes(t.id)).map((t) => t.label.toLowerCase().replace(/\bsac\b/g, "SAC"));
  const address = process.env.NEWSLETTER_POSTAL_ADDRESS || "[mailing address]";
  const button = n.button_label && n.button_url && safeUrl(n.button_url) ? { label: n.button_label, url: n.button_url } : null;
  const manage = token ? manageUrl(token) : `${SITE_URL}/newsletter`;
  const unsub = token ? manageUrl(token) + "&unsubscribe=1" : `${SITE_URL}/newsletter`;
  const why = topicNames.length ? `You’re receiving this because you subscribed to ${topicNames.join(", ")} from SAC.` : "You’re receiving this because you subscribed to SAC newsletters.";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(n.subject)}</title></head>
<body style="margin:0;padding:0;background:#FBF6EE;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(n.preheader || "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6EE;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#3E3E44;font-size:16px;line-height:1.6;">
<tr><td style="background:#141416;padding:20px 28px;">
<span style="font-size:20px;font-weight:bold;letter-spacing:1px;color:#FFFFFF;">SAC</span>
<span style="font-size:13px;color:#C9C8CE;padding-left:8px;">Space for Arts &amp; Culture</span>
</td></tr>
<tr><td style="height:6px;background:#B00012;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 8px;">
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.15;color:#141416;">${esc(n.subject)}</h1>
${bodyHtml(n.body)}
${button ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:#B00012;border-radius:999px;"><a href="${esc(button.url)}" style="display:inline-block;padding:14px 26px;color:#FFFFFF;font-weight:bold;text-decoration:none;">${esc(button.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:20px 28px 28px;border-top:1px solid #ECE7DF;font-size:12px;line-height:1.6;color:#6A6970;">
${esc(why)}<br>
<a href="${esc(manage)}" style="color:#6A6970;">Choose what you receive</a> · <a href="${esc(unsub)}" style="color:#6A6970;">Unsubscribe</a><br><br>
${esc(OPERATOR)}<br>${esc(address)}${CONTACT_EMAIL ? `<br><a href="mailto:${esc(CONTACT_EMAIL)}" style="color:#6A6970;">${esc(CONTACT_EMAIL)}</a>` : ""}<br>
<a href="${esc(SITE_URL || "#")}" style="color:#6A6970;">${esc((SITE_URL || "").replace(/^https?:\/\//, ""))}</a>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    n.subject,
    "",
    ...n.body
      .replace(/\r/g, "")
      .split("\n")
      .filter((l) => !IMG_LINE.test(l.trim()))
      .map((l) => inlineText(l.replace(/^## /, "").replace(/^- /, "• "))),
    ...(button ? ["", `${button.label}: ${button.url}`] : []),
    "",
    "—",
    why,
    `Choose what you receive: ${manage}`,
    `Unsubscribe: ${unsub}`,
    "",
    OPERATOR,
    address,
    ...(CONTACT_EMAIL ? [CONTACT_EMAIL] : []),
    SITE_URL,
  ].join("\n");

  return { html, text };
}

// ---------------------------------------------------------------------------
// Sending through Resend.
// ---------------------------------------------------------------------------
export type OutgoingEmail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

export async function sendOne(mail: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, ...mail }),
    });
    return res.ok ? { ok: true } : { ok: false, error: (await res.text()).slice(0, 300) };
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 300) };
  }
}

// Up to 100 emails in one request. Resend accepts or rejects the batch as a whole.
export async function sendBatch(mails: OutgoingEmail[]): Promise<{ ok: boolean; error?: string }> {
  if (!mails.length) return { ok: true };
  try {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(mails.map((m) => ({ from: process.env.EMAIL_FROM, ...m }))),
    });
    return res.ok ? { ok: true } : { ok: false, error: (await res.text()).slice(0, 300) };
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 300) };
  }
}

export function unsubscribeHeaders(token: string) {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(token)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

// The double opt-in email for people who subscribe with the public form.
export function confirmationEmail(token: string) {
  const link = `${SITE_URL}/newsletter/confirm?t=${token}`;
  return renderNewsletter(
    {
      subject: "Confirm your SAC subscription",
      body: `Thanks for signing up to hear from SAC, Space for Arts & Culture.\n\nPlease confirm your email address so we can send you news about art events, art for sale, and opportunities like residencies and grants.\n\nIf you didn’t sign up, you can ignore this email and you won’t hear from us.`,
      button_label: "Confirm my subscription",
      button_url: link,
      topics: [],
    },
    null,
  );
}
