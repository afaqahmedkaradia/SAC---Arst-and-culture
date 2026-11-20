"use client";

import Link from "next/link";
import { useActionState } from "react";
import { NEWSLETTER_TOPICS } from "@/lib/constants";
import { subscribe, updateByToken, updateMyNewsletter, type FormState } from "@/app/newsletter/actions";

function Topics({ selected, dark = false }: { selected: string[]; dark?: boolean }) {
  return (
    <fieldset className="border-0 p-0 m-0 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}>
      <legend className={`text-sm font-bold mb-2 ${dark ? "text-white" : "text-ink"}`}>What would you like to hear about?</legend>
      {NEWSLETTER_TOPICS.map((t) => (
        <label
          key={t.id}
          className={`flex gap-2.5 items-start rounded-xl px-3.5 py-3 cursor-pointer border ${dark ? "border-white/20 bg-white/5" : "border-line bg-white"}`}
        >
          <input type="checkbox" name="topics" value={t.id} defaultChecked={selected.includes(t.id)} className="w-[18px] h-[18px] mt-0.5 accent-accent shrink-0" />
          <span className="flex flex-col gap-0.5">
            <span className={`text-[15px] font-bold ${dark ? "text-white" : "text-ink"}`}>{t.label}</span>
            <span className={`text-[13px] leading-snug ${dark ? "text-[#C9C8CE]" : "text-muted"}`}>{t.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Message({ state, dark = false }: { state: FormState; dark?: boolean }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="m-0 text-sm font-semibold text-danger bg-danger-tint rounded-lg px-3.5 py-2.5">{state.error}</p>
  ) : (
    <p role="status" className={`m-0 text-sm font-semibold rounded-lg px-3.5 py-2.5 ${dark ? "bg-white/10 text-white" : "bg-good-tint text-good"}`}>{state.ok}</p>
  );
}

// Public sign-up, used on the homepage and the newsletter page.
export function SubscribeForm({ dark = false }: { dark?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, undefined);
  if (state?.ok) return <Message state={state} dark={dark} />;
  return (
    <form action={action} className="flex flex-col gap-4">
      <Topics selected={["events", "sales", "opportunities", "news"]} dark={dark} />
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Leave this empty <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="Your email address" className="input flex-[1_1_260px] min-h-[52px]" />
        <button className="btn btn-primary min-h-[52px] px-7" disabled={pending}>{pending ? "Signing up…" : "Subscribe"}</button>
      </div>
      <label className={`flex gap-2.5 items-start text-[13px] leading-normal ${dark ? "text-[#D2D1D6]" : "text-body"}`}>
        <input type="checkbox" name="consent" required className="w-[18px] h-[18px] mt-0.5 accent-accent shrink-0" />
        <span>
          Yes, send me emails from SAC about the topics I chose. I can unsubscribe at any time. See our{" "}
          <Link href="/privacy" className={dark ? "text-white" : undefined}>privacy policy</Link>.
        </span>
      </label>
      <Message state={state} dark={dark} />
    </form>
  );
}

// Preferences from an email link (token) or the settings page (logged in).
export function PreferencesForm({ token, selected, subscribed }: { token?: string; selected: string[]; subscribed: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(token ? updateByToken : updateMyNewsletter, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      {token && <input type="hidden" name="token" value={token} />}
      <Topics selected={subscribed ? selected : []} />
      <p className="m-0 text-[13px] text-muted">Untick every topic and save to stop all newsletters.</p>
      <div className="flex flex-wrap gap-2.5">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save my choices"}</button>
        {token && subscribed && (
          <button name="unsubscribe" value="1" className="btn btn-outline" disabled={pending}>Unsubscribe from everything</button>
        )}
      </div>
      <Message state={state} />
    </form>
  );
}

// One button, for the "Unsubscribe" link in emails.
export function UnsubscribeButton({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateByToken, undefined);
  if (state?.ok) return <Message state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="unsubscribe" value="1" />
      <button className="btn btn-primary self-start" disabled={pending}>{pending ? "Unsubscribing…" : "Unsubscribe from all SAC newsletters"}</button>
      <Message state={state} />
    </form>
  );
}
