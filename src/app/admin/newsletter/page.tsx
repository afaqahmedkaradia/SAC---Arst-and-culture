import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { NEWSLETTER_TOPICS, timeAgo } from "@/lib/constants";
import { newsletterSetup } from "@/lib/newsletter";
import { createNewsletter } from "./actions";
import { SetupNotice } from "./SetupNotice";

export const metadata: Metadata = { title: "Newsletters" };

export default async function NewslettersPage() {
  const viewer = await requireViewer("/admin/newsletter");
  if (!viewer.profile.is_admin) notFound();
  const supabase = await createClient();
  const setup = newsletterSetup();

  const [subsRes, pendingRes, listRes] = await Promise.all([
    supabase.from("newsletter_subscribers").select("topics").eq("status", "active").limit(50000),
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("newsletters").select("id,subject,status,topics,recipient_count,sent_count,sent_at,updated_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const subs = (subsRes.data ?? []) as { topics: string[] }[];
  const list = (listRes.data ?? []) as { id: string; subject: string; status: string; topics: string[]; recipient_count: number; sent_count: number; sent_at: string | null; updated_at: string }[];

  return (
    <main className="page max-w-[1100px] pt-10 pb-24 flex flex-col gap-7">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold">← Curators</Link>
          <h1 className="m-0 mt-2 font-display font-black text-[clamp(36px,4vw,52px)] tracking-[-0.04em] leading-none">Newsletters</h1>
          <p className="m-0 mt-2 text-muted">Tell subscribers about art events, sales, residencies and grants.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/newsletter/subscribers" className="btn btn-outline">Subscribers</Link>
          <form action={createNewsletter}>
            <button className="btn btn-primary">+ New newsletter</button>
          </form>
        </div>
      </div>

      <SetupNotice missing={setup.missing} />

      <section aria-label="Subscribers" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))" }}>
        <div className="card p-4 flex flex-col gap-1 bg-cream">
          <span className="text-3xl font-black tracking-[-0.03em]">{subs.length}</span>
          <span className="text-sm text-muted">Active subscribers{pendingRes.count ? ` · ${pendingRes.count} awaiting confirmation` : ""}</span>
        </div>
        {NEWSLETTER_TOPICS.map((t) => (
          <div key={t.id} className="card p-4 flex flex-col gap-1">
            <span className="text-3xl font-black tracking-[-0.03em]">{subs.filter((s) => s.topics.includes(t.id)).length}</span>
            <span className="text-sm text-muted">{t.label}</span>
          </div>
        ))}
      </section>
      <p className="m-0 -mt-3 text-sm text-muted">
        People subscribe on the <Link href="/newsletter">newsletter page</Link> and the homepage, when they join, or in their settings, and curators can <Link href="/admin/newsletter/subscribers">add or invite people</Link>. Only people who opted in are counted.
      </p>

      <section className="card p-0 overflow-hidden">
        {list.length === 0 ? (
          <p className="m-0 p-6 text-muted">No newsletters yet. Start one with “New newsletter”.</p>
        ) : (
          list.map((n, i) => (
            <Link key={n.id} href={`/admin/newsletter/${n.id}`} className={`flex flex-wrap gap-3 items-center justify-between px-5 py-4 no-underline text-ink hover:bg-cream ${i ? "border-t border-line" : ""}`}>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold truncate">{n.subject || "Untitled newsletter"}</span>
                <span className="text-sm text-muted">
                  {NEWSLETTER_TOPICS.filter((t) => n.topics.includes(t.id)).map((t) => t.label).join(" · ") || "No topics yet"}
                </span>
              </span>
              <span className="text-sm text-right">
                {n.status === "sent" ? (
                  <span className="chip bg-good-tint text-good">Sent to {n.sent_count} · {timeAgo(n.sent_at ?? n.updated_at)}</span>
                ) : n.status === "sending" ? (
                  <span className="chip bg-gold-tint text-[#7A4E00]">Sending · {n.sent_count} of {n.recipient_count}</span>
                ) : (
                  <span className="chip bg-soft text-body">Draft · edited {timeAgo(n.updated_at)}</span>
                )}
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
