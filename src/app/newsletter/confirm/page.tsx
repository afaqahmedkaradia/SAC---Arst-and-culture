import type { Metadata } from "next";
import Link from "next/link";
import { serviceClient } from "@/lib/newsletter";

export const metadata: Metadata = { title: "Subscription confirmed" };
export const dynamic = "force-dynamic";

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const db = serviceClient();
  let ok = false;
  if (db && t && /^[0-9a-f-]{36}$/i.test(t)) {
    const now = new Date().toISOString();
    const { data } = await db
      .from("newsletter_subscribers")
      .update({ status: "active", confirmed_at: now, updated_at: now })
      .eq("token", t)
      .in("status", ["pending", "active"])
      .select("id")
      .maybeSingle();
    ok = !!data;
  }
  return (
    <main className="page max-w-[720px] pt-20 pb-24 flex flex-col gap-5">
      <span className="eyebrow">Newsletter</span>
      <h1 className="m-0 font-black text-[clamp(36px,4.5vw,56px)] leading-none tracking-[-0.04em]">
        {ok ? <>You&apos;re <span className="serif-accent text-accent">subscribed.</span></> : "That link didn’t work."}
      </h1>
      <p className="m-0 text-lg text-body">
        {ok
          ? "Thanks for confirming. We'll email you about the topics you chose. Every email has a link to change them or unsubscribe."
          : "It may have expired or already been used to unsubscribe. You can sign up again on the newsletter page."}
      </p>
      <div className="flex gap-3 flex-wrap">
        <Link href="/explore" className="btn btn-dark">Explore the work</Link>
        {!ok && <Link href="/newsletter" className="btn btn-outline">Newsletter page</Link>}
      </div>
    </main>
  );
}
