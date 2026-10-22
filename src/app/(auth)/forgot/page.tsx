import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "../AuthForms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <main className="page py-16 flex justify-center">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="h-display text-[32px] m-0">Reset your password</h1>
          <p className="m-0 text-[15px] text-muted">
            We&apos;ll email you a link. <Link href="/login">Back to log in</Link>
          </p>
        </div>
        <ForgotForm />
      </div>
    </main>
  );
}
