"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { NEWSLETTER_TOPICS } from "@/lib/constants";
import { retryFailed, saveNewsletter, sendNextBatch, startSending, type ComposeState } from "./actions";

type NL = {
  id: string;
  subject: string;
  preheader: string | null;
  body: string;
  button_label: string | null;
  button_url: string | null;
  topics: string[];
  status: "draft" | "sending" | "sent";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
};

export function Composer({ nl, audience, ready, userId }: { nl: NL; audience: string[][]; ready: boolean; userId: string }) {
  const [state, action, pending] = useActionState<ComposeState, FormData>(saveNewsletter, undefined);
  const [topics, setTopics] = useState<string[]>(nl.topics);
  const draft = nl.status === "draft";
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // Pictures go to Supabase Storage like project images; the email links to the public copy.
  async function addPicture(file: File) {
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) return setUploading("Use a JPG, PNG, GIF or WebP picture.");
    if (file.size > 5 * 1024 * 1024) return setUploading("Pictures in emails should be under 5 MB. Try a smaller one.");
    setUploading("Uploading…");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/newsletter-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return setUploading(`Upload failed: ${error.message}`);
    const el = bodyRef.current;
    if (el) {
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const line = `![${alt}](${mediaUrl(path)})`;
      const at = el.selectionStart ?? el.value.length;
      const before = el.value.slice(0, at).replace(/\s*$/, "");
      const after = el.value.slice(at).replace(/^\s*/, "");
      el.value = `${before}${before ? "\n\n" : ""}${line}${after ? "\n\n" + after : ""}`;
      el.focus();
    }
    setUploading("Picture added. Edit the words in the square brackets to describe it, then save.");
  }

  const reach = useMemo(() => audience.filter((t) => t.some((x) => topics.includes(x))).length, [audience, topics]);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="card p-5 sm:p-6 flex flex-col gap-4">
        <input type="hidden" name="id" value={nl.id} />
        <fieldset disabled={!draft} className="border-0 p-0 m-0 flex flex-col gap-4">
          <div>
            <span className="label">Send to subscribers of</span>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(230px, 100%), 1fr))" }}>
              {NEWSLETTER_TOPICS.map((t) => (
                <label key={t.id} className={`flex gap-2.5 items-start rounded-xl px-3.5 py-3 cursor-pointer border ${topics.includes(t.id) ? "border-ink bg-cream" : "border-line"}`}>
                  <input
                    type="checkbox"
                    name="topics"
                    value={t.id}
                    checked={topics.includes(t.id)}
                    onChange={(e) => setTopics((ts) => (e.target.checked ? [...ts, t.id] : ts.filter((x) => x !== t.id)))}
                    className="w-[18px] h-[18px] mt-0.5 accent-accent shrink-0"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{t.label}</span>
                    <span className="text-[13px] text-muted">{audience.filter((a) => a.includes(t.id)).length} subscribers</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="m-0 mt-2 text-sm font-semibold text-body">
              {draft ? `Reaches ${reach} ${reach === 1 ? "subscriber" : "subscribers"} (each person gets it once).` : `Sent to ${nl.recipient_count} subscribers.`}
            </p>
          </div>
          <div>
            <label htmlFor="subject" className="label">Subject</label>
            <input id="subject" name="subject" defaultValue={nl.subject} maxLength={150} required className="input text-lg font-semibold" placeholder="e.g. Spring Showcase: call for artists" />
          </div>
          <div>
            <label htmlFor="preheader" className="label">Preview line <span className="font-normal text-muted">(optional)</span></label>
            <input id="preheader" name="preheader" defaultValue={nl.preheader ?? ""} maxLength={200} className="input" placeholder="Shown next to the subject in most inboxes" />
          </div>
          <div>
            <label htmlFor="body" className="label">Message</label>
            <textarea ref={bodyRef} id="body" name="body" defaultValue={nl.body} rows={14} maxLength={20000} className="input font-[inherit] leading-relaxed" placeholder={"Write your message here.\n\n## A heading\n\n- A list item\n- Another item\n\n**Bold words** and [a link](https://example.com)"} />
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; if (f) addPicture(f); e.target.value = ""; }} />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>+ Add a picture</button>
              {uploading && <span role="status" className="text-sm text-body">{uploading}</span>}
            </div>
            <p className="hint mt-1.5 mb-0">Leave a blank line between paragraphs. <code>## </code> starts a heading, <code>- </code> a list item, <code>**bold**</code>, and <code>[link text](https://…)</code> a link. For a picture, put <code>![what it shows](https://…/photo.jpg)</code> on its own line; two picture lines together sit side by side.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex-[1_1_200px]">
              <label htmlFor="button_label" className="label">Button text <span className="font-normal text-muted">(optional)</span></label>
              <input id="button_label" name="button_label" defaultValue={nl.button_label ?? ""} maxLength={60} className="input" placeholder="e.g. Apply by March 1" />
            </div>
            <div className="flex-[2_1_280px]">
              <label htmlFor="button_url" className="label">Button link</label>
              <input id="button_url" name="button_url" defaultValue={nl.button_url ?? ""} maxLength={500} className="input" placeholder="https://…" />
            </div>
          </div>
        </fieldset>
        {state?.error && <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3 py-2">{state.error}</p>}
        {state?.ok && <p role="status" className="m-0 text-sm font-medium text-good bg-good-tint rounded-lg px-3 py-2">{state.ok}</p>}
        {draft && (
          <div className="flex flex-wrap gap-2.5">
            <button name="intent" value="save" className="btn btn-outline" disabled={pending}>Save and preview</button>
            <button name="intent" value="test" className="btn btn-outline" disabled={pending}>Save and send me a test</button>
          </div>
        )}
      </form>

      <SendPanel nl={nl} reach={reach} ready={ready} topicsChanged={topics.join() !== nl.topics.join()} />
    </div>
  );
}

function SendPanel({ nl, reach, ready, topicsChanged }: { nl: NL; reach: number; ready: boolean; topicsChanged: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    let total = nl.recipient_count;
    if (nl.status === "draft") {
      const start = await startSending(nl.id);
      if (start.error) {
        setError(start.error);
        setBusy(false);
        return;
      }
      total = start.count ?? 0;
    }
    setProgress({ total, sent: nl.sent_count, failed: nl.failed_count });
    for (let guard = 0; guard < 1000; guard++) {
      const r = await sendNextBatch(nl.id);
      setProgress({ total, sent: r.sent, failed: r.failed });
      if (r.error) setError(`Some emails couldn’t be sent: ${r.error}`);
      if (r.remaining === 0) break;
      await new Promise((res) => setTimeout(res, 700)); // stay under the email service's rate limit
    }
    setBusy(false);
    router.refresh();
  };

  const p = progress ?? (nl.status !== "draft" ? { total: nl.recipient_count, sent: nl.sent_count, failed: nl.failed_count } : null);
  const pct = p && p.total ? Math.round(((p.sent + p.failed) / p.total) * 100) : 0;

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-3.5">
      <h2 className="m-0 text-lg font-semibold">Send</h2>
      {p && (
        <div className="flex flex-col gap-2">
          <div className="h-3 rounded-full bg-soft overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Sending progress">
            <div className="h-full bg-good transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="m-0 text-sm text-body">
            <b>{p.sent}</b> sent{p.failed ? <>, <b className="text-danger">{p.failed}</b> failed</> : null} of {p.total}
          </p>
        </div>
      )}
      {error && <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3 py-2">{error}</p>}
      {nl.status === "draft" && (
        <>
          <p className="m-0 text-sm text-body">Save your changes and send yourself a test first. Once sent, a newsletter can&apos;t be changed or recalled.</p>
          {topicsChanged && <p className="m-0 text-sm font-semibold text-[#7A4E00]">You changed the topics. Save before sending.</p>}
          <button
            type="button"
            className="btn btn-primary self-start"
            disabled={busy || !ready || reach === 0 || topicsChanged}
            onClick={() => {
              if (window.confirm(`Send this newsletter to ${reach} ${reach === 1 ? "subscriber" : "subscribers"} now? This can’t be undone.`)) run();
            }}
          >
            {busy ? "Sending…" : `Send to ${reach} ${reach === 1 ? "subscriber" : "subscribers"}`}
          </button>
          {!ready && <p className="m-0 hint">Sending is off until the newsletter setup is finished.</p>}
        </>
      )}
      {nl.status === "sending" && !busy && (
        <button type="button" className="btn btn-primary self-start" onClick={run}>Continue sending</button>
      )}
      {nl.status === "sending" && busy && <p className="m-0 text-sm text-body">Keep this page open until sending finishes.</p>}
      {nl.status === "sent" && nl.failed_count > 0 && !busy && (
        <button type="button" className="btn btn-outline self-start" onClick={async () => { await retryFailed(nl.id); run(); }}>
          Retry {nl.failed_count} failed
        </button>
      )}
      {nl.status === "sent" && nl.failed_count === 0 && <p className="m-0 text-sm font-semibold text-good">Sent to everyone.</p>}
    </section>
  );
}
