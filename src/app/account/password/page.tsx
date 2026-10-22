import type { Metadata } from "next";
import { NewPasswordForm } from "@/app/(auth)/AuthForms";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function NewPasswordPage() {
  await requireViewer("/account/password");
  return (
    <main className="page py-16 flex justify-center">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <h1 className="h-display text-[32px] m-0">Choose a new password</h1>
        <NewPasswordForm />
      </div>
    </main>
  );
}
