import type { Metadata } from "next";
import Link from "next/link";
import { serviceClient } from "@/lib/newsletter";
import { PreferencesForm, UnsubscribeButton } from "@/components/NewsletterForms";

export const metadata: Metadata = { title: "Newsletter preferences", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ t?: string; unsubscribe?: string }> }) {
  const { t, unsubscribe } = await searchParams;
  const db = serviceClient();
  const row =
    db && t && /^[0-9a-f-]{36}$/i.test(t)
      ? (await db.from("newsletter_subscribers").select("email,topics,status").eq("token", t).maybeSingle()).data
      : null;

  return (
    <main className="page max-w-[820px] pt-14 pb-24 flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">Newsletter</span>
        <h1 className="m-0 font-black text-[clamp(36px,4.5vw,56px)] leading-none tracking-[-0.04em]">
          {unsubscribe ? "Unsubscribe" : "Your newsletter choices"}
        </h1>
        {row && <p className="m-0 text-body">For {row.email.replace(/^(.).*(@.*)$/, "$1•••$2")}</p>}
      </div>
      {!row ? (
        <p className="m-0 text-lg text-body">
          This link isn&apos;t valid. If you&apos;re logged in, you can change newsletters in <Link href="/dashboard/settings">your settings</Link>.
        </p>
      ) : unsubscribe && row.status !== "unsubscribed" ? (
        <div className="flex flex-col gap-6">
          <UnsubscribeButton token={t!} />
          <p className="m-0 text-body">Or keep only some topics:</p>
          <PreferencesForm token={t!} selected={row.topics} subscribed />
        </div>
      ) : (
        <PreferencesForm token={t!} selected={row.topics} subscribed={row.status !== "unsubscribed"} />
      )}
    </main>
  );
}
