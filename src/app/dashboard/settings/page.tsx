import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/viewer";
import { BackIcon } from "@/components/Icons";
import { SettingsForm } from "./SettingsForm";
import { PreferencesForm } from "@/components/NewsletterForms";
import { cleanEmail, newsletterSetup, serviceClient } from "@/lib/newsletter";

export const metadata: Metadata = { title: "Profile settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/dashboard/settings");
  const db = newsletterSetup().ready ? serviceClient() : null;
  const sub = db && viewer.email
    ? (await db.from("newsletter_subscribers").select("topics,status").eq("email", cleanEmail(viewer.email)).maybeSingle()).data
    : null;
  return (
    <main className="flex-1 bg-soft">
      <div className="page max-w-[860px] pt-8 pb-20 flex flex-col gap-6">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-ink no-underline font-medium self-start py-2">
          <BackIcon /> Dashboard
        </Link>
        <h1 className="h-display m-0 text-[34px]">Profile settings</h1>
        <SettingsForm profile={viewer.profile} />
        {db && (
          <section className="card p-5 sm:p-6 flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-lg font-semibold">Newsletter</h2>
              <p className="m-0 mt-1 text-sm text-muted">
                Emails from SAC&apos;s curators to {viewer.email}. Choose any topics, or none.
              </p>
            </div>
            <PreferencesForm selected={sub?.topics ?? []} subscribed={sub?.status === "active"} />
          </section>
        )}
      </div>
    </main>
  );
}
