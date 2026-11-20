import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { NEWSLETTER_TOPICS, timeAgo } from "@/lib/constants";
import { newsletterSetup } from "@/lib/newsletter";
import { SetupNotice } from "../SetupNotice";
import { AddSubscribers } from "./AddSubscribers";
import { removeSubscriber } from "./actions";

export const metadata: Metadata = { title: "Subscribers" };

const SOURCES: Record<string, string> = { form: "Sign-up form", signup: "When joining SAC", settings: "Account settings", import: "Added by a curator" };
const STATUS: Record<string, string> = { active: "Subscribed", pending: "Awaiting confirmation", unsubscribed: "Unsubscribed" };

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const viewer = await requireViewer("/admin/newsletter/subscribers");
  if (!viewer.profile.is_admin) notFound();
  const { q, status } = await searchParams;
  const supabase = await createClient();
  const setup = newsletterSetup();

  let query = supabase.from("newsletter_subscribers").select("id,email,topics,status,consent_source,consent_note,created_at", { count: "exact" });
  if (status && STATUS[status]) query = query.eq("status", status);
  if (q?.trim()) query = query.ilike("email", `%${q.trim().replace(/[%_]/g, "")}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).limit(200);
  const rows = data ?? [];
  const short = (ids: string[]) => NEWSLETTER_TOPICS.filter((t) => ids.includes(t.id)).map((t) => t.label.split(" ")[0]).join(", ");

  return (
    <main className="page max-w-[1100px] pt-10 pb-24 flex flex-col gap-7">
      <div>
        <Link href="/admin/newsletter" className="text-sm font-semibold">← Newsletters</Link>
        <h1 className="m-0 mt-2 font-display font-black text-[clamp(36px,4vw,52px)] tracking-[-0.04em] leading-none">Subscribers</h1>
      </div>
      <SetupNotice missing={setup.missing} />
      <AddSubscribers />

      <section className="flex flex-col gap-3">
        <form className="flex flex-wrap gap-2.5 items-center" role="search">
          <label htmlFor="q" className="sr-only">Search by email</label>
          <input id="q" name="q" defaultValue={q ?? ""} placeholder="Search by email" className="input flex-[1_1_240px]" />
          <label htmlFor="status" className="sr-only">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input w-auto">
            <option value="">Everyone</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-outline">Filter</button>
          <span className="text-sm text-muted">{count ?? 0} {count === 1 ? "person" : "people"}{(count ?? 0) > rows.length ? `, showing the newest ${rows.length}` : ""}</span>
        </form>

        <div className="card p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="m-0 p-6 text-muted">No subscribers yet.</p>
          ) : (
            <table className="w-full text-sm border-collapse min-w-[720px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="font-semibold px-4 py-3">Email</th>
                  <th className="font-semibold px-4 py-3">Status</th>
                  <th className="font-semibold px-4 py-3">Topics</th>
                  <th className="font-semibold px-4 py-3">How they joined</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="px-4 py-3 font-semibold break-all">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className={`chip text-xs ${r.status === "active" ? "bg-good-tint text-good" : r.status === "pending" ? "bg-gold-tint text-[#7A4E00]" : "bg-soft text-muted"}`}>{STATUS[r.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-body">{short(r.topics) || "–"}</td>
                    <td className="px-4 py-3 text-body">
                      {SOURCES[r.consent_source] ?? r.consent_source} · {timeAgo(r.created_at)}
                      {r.consent_note && <span className="block text-[13px] text-muted">{r.consent_note}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status !== "unsubscribed" && (
                        <form action={removeSubscriber}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-[13px] font-semibold text-danger bg-transparent border-0 cursor-pointer py-1">Remove</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
