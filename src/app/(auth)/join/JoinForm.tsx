"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp, type FormState } from "../actions";
import { DISCIPLINES } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";
import { CheckIcon } from "@/components/Icons";

export function JoinForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, undefined);
  const [role, setRole] = useState<"artist" | "member">("artist");
  const [picked, setPicked] = useState<string[]>([]);

  if (state?.sent) {
    return (
      <div className="w-full max-w-[520px] flex flex-col gap-4">
        <span aria-hidden="true" className="w-16 h-16 rounded-full bg-good-tint text-good flex items-center justify-center">
          <CheckIcon size={30} />
        </span>
        <h2 className="h-display text-3xl m-0">Check your email</h2>
        <p className="m-0 text-base leading-relaxed text-body">
          We sent a confirmation link to <strong>{state.email}</strong>. Open it to finish creating your account.
          {role === "artist" && " A community curator will then review your artist account; you can set up your profile and draft projects while you wait."}
        </p>
      </div>
    );
  }

  const card = (active: boolean) =>
    `flex flex-col gap-2 rounded-[14px] p-[18px] cursor-pointer border-2 ${
      active ? "border-accent bg-accent-tint" : "border-line bg-white"
    }`;

  return (
    <form action={action} className="w-full max-w-[520px] flex flex-col gap-6" aria-labelledby="join-title">
      <div className="flex flex-col gap-1.5">
        <h2 id="join-title" className="h-display text-[32px] m-0">Join SAC</h2>
        <p className="m-0 text-[15px] text-muted">
          Already a member? <Link href="/login">Log in</Link>
        </p>
      </div>

      <fieldset className="border-0 p-0 m-0">
        <legend className="font-semibold text-[15px] mb-3">I&apos;m joining as</legend>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <label className={card(role === "artist")}>
            <span className="flex justify-between items-center gap-2">
              <span className="font-semibold text-[17px]">An artist</span>
              <input type="radio" name="role" value="artist" checked={role === "artist"} onChange={() => setRole("artist")} className="w-5 h-5 accent-accent m-0" />
            </span>
            <span className="text-sm leading-normal text-muted">
              Share projects, ask for feedback and get discovered. Approved by community curators.
            </span>
          </label>
          <label className={card(role === "member")}>
            <span className="flex justify-between items-center gap-2">
              <span className="font-semibold text-[17px]">A member</span>
              <input type="radio" name="role" value="member" checked={role === "member"} onChange={() => setRole("member")} className="w-5 h-5 accent-accent m-0" />
            </span>
            <span className="text-sm leading-normal text-muted">
              Follow artists, give feedback and build collections of work you love.
            </span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div>
          <label htmlFor="display_name" className="label">{role === "artist" ? "Name or artist name" : "Full name"}</label>
          <input id="display_name" name="display_name" autoComplete="name" required maxLength={80} className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className="input" aria-describedby="pw-hint" />
        <p id="pw-hint" className="hint mt-1.5 mb-0">At least 10 characters</p>
      </div>

      {role === "artist" && (
        <>
          <fieldset className="border-0 p-0 m-0">
            <legend className="label mb-2.5">
              Your disciplines <span className="font-normal text-muted">(pick any)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map((d) => {
                const on = picked.includes(d);
                return (
                  <label key={d} className={`btn btn-sm ${on ? "btn-dark" : "btn-outline"} font-medium`}>
                    <input
                      type="checkbox"
                      name="disciplines"
                      value={d}
                      checked={on}
                      onChange={() => setPicked(on ? picked.filter((x) => x !== d) : [...picked, d])}
                      className="sr-only"
                    />
                    {d}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div>
            <label htmlFor="work_link" className="label">
              Link to your work <span className="font-normal text-muted">(optional, helps curators approve you)</span>
            </label>
            <input id="work_link" name="work_link" type="url" placeholder="Website, Instagram, YouTube…" className="input" />
          </div>
        </>
      )}

      <label className="flex gap-2.5 items-start text-sm leading-normal text-body">
        <input type="checkbox" name="agree" required className="w-5 h-5 m-0 accent-accent shrink-0" />
        <span>I agree to the community guidelines. Artists keep full rights to everything they post.</span>
      </label>

      {state?.error && (
        <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3.5 py-2.5">
          {state.error}
        </p>
      )}

      <SubmitButton className="btn btn-primary w-full" pendingText="Creating your account…">
        {role === "artist" ? "Request an artist account" : "Create my account"}
      </SubmitButton>
    </form>
  );
}
