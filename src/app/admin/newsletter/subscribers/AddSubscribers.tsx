"use client";

import { useActionState, useRef, useState } from "react";
import { NEWSLETTER_TOPICS } from "@/lib/constants";
import { addSubscribers, type ImportState } from "./actions";

export function AddSubscribers() {
  const [state, action, pending] = useActionState<ImportState, FormData>(addSubscribers, undefined);
  const [mode, setMode] = useState<"invite" | "consented">("invite");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const count = new Set(text.toLowerCase().match(/[^\s,;<>"'()]+@[^\s,;<>"'()]+\.[a-z]{2,}/g) ?? []).size;

  return (
    <form action={action} className="card p-5 sm:p-6 flex flex-col gap-5">
      <div>
        <h2 className="m-0 text-lg font-semibold">Add subscribers</h2>
        <p className="m-0 mt-1 text-sm text-muted">Paste email addresses, or upload a CSV or text file. Any format works; we pick out the addresses.</p>
      </div>

      <div>
        <label htmlFor="emails" className="label">Email addresses</label>
        <textarea id="emails" name="emails" rows={6} value={text} onChange={(e) => setText(e.target.value)} className="input font-mono text-sm" placeholder={"aisha@example.com\nkarim@example.com, salim@example.com"} />
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            tabIndex={-1}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                const content = await f.text();
                setText((t) => `${t}${t.trim() ? "\n" : ""}${content}`);
              }
              e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>Upload a CSV</button>
          <span className="text-sm font-semibold text-body">{count} {count === 1 ? "address" : "addresses"} found</span>
        </div>
      </div>

      <fieldset className="border-0 p-0 m-0 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
        <legend className="label">Topics</legend>
        {NEWSLETTER_TOPICS.map((t) => (
          <label key={t.id} className="flex gap-2.5 items-center rounded-xl px-3.5 py-3 cursor-pointer border border-line">
            <input type="checkbox" name="topics" value={t.id} defaultChecked className="w-[18px] h-[18px] accent-accent shrink-0" />
            <span className="text-sm font-semibold">{t.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
        <legend className="label">How should they join?</legend>
        <label className={`flex gap-3 items-start rounded-xl px-4 py-3 cursor-pointer border ${mode === "invite" ? "border-ink bg-cream" : "border-line"}`}>
          <input type="radio" name="mode" value="invite" checked={mode === "invite"} onChange={() => setMode("invite")} className="w-[18px] h-[18px] mt-0.5 accent-accent shrink-0" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold">Send them an invitation (recommended)</span>
            <span className="text-[13px] text-muted">Each person gets a “Confirm your subscription” email and only joins if they click it.</span>
          </span>
        </label>
        <label className={`flex gap-3 items-start rounded-xl px-4 py-3 cursor-pointer border ${mode === "consented" ? "border-ink bg-cream" : "border-line"}`}>
          <input type="radio" name="mode" value="consented" checked={mode === "consented"} onChange={() => setMode("consented")} className="w-[18px] h-[18px] mt-0.5 accent-accent shrink-0" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold">They already agreed to SAC emails</span>
            <span className="text-[13px] text-muted">Added straight away. Only for people who clearly said yes to emails from SAC, such as on a sign-up sheet.</span>
          </span>
        </label>
      </fieldset>

      {mode === "consented" && (
        <div className="flex flex-col gap-3 bg-gold-tint rounded-xl px-4 py-4">
          <div>
            <label htmlFor="consent_note" className="label">Where did they agree?</label>
            <input id="consent_note" name="consent_note" maxLength={300} className="input" placeholder="e.g. Signed sign-up sheet at the Spring Showcase, March 2027" />
            <p className="hint mt-1.5 mb-0">Kept with each subscriber as a record of their consent, which Canada&apos;s anti-spam law requires.</p>
          </div>
          <label className="flex gap-2.5 items-start text-sm text-body">
            <input type="checkbox" name="confirm" className="w-[18px] h-[18px] mt-0.5 accent-accent shrink-0" />
            <span>I confirm everyone on this list agreed to receive emails from SAC.</span>
          </label>
        </div>
      )}

      {state?.error && <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3 py-2">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 text-sm font-medium text-good bg-good-tint rounded-lg px-3 py-2">{state.ok}</p>}
      <p className="m-0 text-[13px] text-muted">People who unsubscribed are never added back. People already on the list keep their place, and their topics are updated.</p>
      <button className="btn btn-primary self-start" disabled={pending || count === 0}>
        {pending ? "Adding…" : mode === "invite" ? `Invite ${count || ""} ${count === 1 ? "person" : "people"}` : `Add ${count || ""} ${count === 1 ? "subscriber" : "subscribers"}`}
      </button>
    </form>
  );
}
