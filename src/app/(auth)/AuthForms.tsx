"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendPasswordReset, signIn, updatePassword, type FormState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

function ErrorNote({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3.5 py-2.5">
      {state.error}
    </p>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <div className="flex justify-between items-baseline">
          <label htmlFor="password" className="label">Password</label>
          <Link href="/forgot" className="text-sm font-medium">Forgot it?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <ErrorNote state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Logging in…">Log in</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(sendPasswordReset, undefined);
  if (state?.sent) {
    return (
      <p className="m-0 text-base leading-relaxed text-body">
        If an account exists for <strong>{state.email}</strong>, we&apos;ve sent a link to choose a new password.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <ErrorNote state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="password" className="label">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className="input" />
        <p className="hint mt-1.5 mb-0">At least 10 characters</p>
      </div>
      <ErrorNote state={state} />
      <SubmitButton className="btn btn-primary w-full">Save new password</SubmitButton>
    </form>
  );
}
