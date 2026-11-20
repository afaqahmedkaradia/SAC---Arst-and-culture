import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { newsletterSetup, renderNewsletter } from "@/lib/newsletter";
import { Composer } from "../Composer";
import { SetupNotice } from "../SetupNotice";
import { deleteNewsletter } from "../actions";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/admin/newsletter/${id}`);
  if (!viewer.profile.is_admin) notFound();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: nl } = await supabase.from("newsletters").select("*").eq("id", id).maybeSingle();
  if (!nl) notFound();
  const { data: subs } = await supabase.from("newsletter_subscribers").select("topics").eq("status", "active").limit(50000);
  const setup = newsletterSetup();
  const preview = renderNewsletter(nl, null).html;

  return (
    <main className="page max-w-[1400px] pt-10 pb-24 flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <Link href="/admin/newsletter" className="text-sm font-semibold">← Newsletters</Link>
          <h1 className="m-0 mt-2 font-display font-black text-[clamp(32px,3.6vw,46px)] tracking-[-0.04em] leading-none">
            {nl.status === "draft" ? "Write a newsletter" : nl.subject}
          </h1>
        </div>
        {nl.status === "draft" && (
          <form action={deleteNewsletter}>
            <input type="hidden" name="id" value={nl.id} />
            <button className="btn btn-outline btn-sm">Delete draft</button>
          </form>
        )}
      </div>
      <SetupNotice missing={setup.missing} />
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[1_1_520px] min-w-0">
          <Composer nl={nl} audience={(subs ?? []).map((s) => s.topics as string[])} ready={setup.ready} userId={viewer.id} />
        </div>
        <section aria-label="Preview" className="flex-[1_1_480px] min-w-0 flex flex-col gap-2 lg:sticky lg:top-24">
          <span className="label mb-0">Preview{nl.status === "draft" ? " (last saved)" : ""}</span>
          <iframe title="Newsletter preview" srcDoc={preview} sandbox="" className="w-full h-[760px] rounded-xl border border-line bg-cream" />
        </section>
      </div>
    </main>
  );
}
