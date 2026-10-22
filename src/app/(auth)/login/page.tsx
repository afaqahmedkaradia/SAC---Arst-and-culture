import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "../AuthForms";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (await getViewer()) redirect(safe);
  return (
    <main className="page py-16 flex justify-center">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="h-display text-[32px] m-0">Welcome back</h1>
          <p className="m-0 text-[15px] text-muted">
            New to SAC? <Link href="/join">Create an account</Link>
          </p>
        </div>
        {error && (
          <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3.5 py-2.5">
            That link didn&apos;t work or has expired. Please log in or request a new one.
          </p>
        )}
        <LoginForm next={safe} />
      </div>
    </main>
  );
}
