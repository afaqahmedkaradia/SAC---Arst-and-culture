import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/viewer";
import { BackIcon } from "@/components/Icons";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Profile settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/dashboard/settings");
  return (
    <main className="flex-1 bg-soft">
      <div className="page max-w-[860px] pt-8 pb-20 flex flex-col gap-6">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-ink no-underline font-medium self-start py-2">
          <BackIcon /> Dashboard
        </Link>
        <h1 className="h-display m-0 text-[34px]">Profile settings</h1>
        <SettingsForm profile={viewer.profile} />
      </div>
    </main>
  );
}
