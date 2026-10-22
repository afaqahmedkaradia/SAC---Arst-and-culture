"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  postFeedback,
  reportContent,
  saveToCollection,
  sendInquiry,
  type ActionState,
} from "@/app/actions/social";
import { INQUIRY_KINDS } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";
import { BookmarkIcon } from "@/components/Icons";

function Note({ state }: { state: ActionState }) {
  if (state?.error)
    return (
      <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3.5 py-2.5">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="m-0 text-sm font-medium text-good bg-good-tint rounded-lg px-3.5 py-2.5">
        {state.ok}
      </p>
    );
  return null;
}

export function FeedbackForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(postFeedback, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} aria-label="Give feedback" className="card p-5 flex flex-col gap-4">
      <input type="hidden" name="project_id" value={projectId} />
      <div>
        <label htmlFor="fb-work" className="label text-[15px]">What&apos;s working</label>
        <textarea id="fb-work" name="working" rows={2} maxLength={2000} placeholder="The moments, choices or details that land for you" className="input" />
      </div>
      <div>
        <label htmlFor="fb-explore" className="label text-[15px]">What I&apos;d explore further</label>
        <textarea id="fb-explore" name="explore" rows={2} maxLength={2000} placeholder="Where you think the work could go next" className="input" />
      </div>
      <div>
        <label htmlFor="fb-q" className="label text-[15px]">
          A question for the artist <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="fb-q" name="question" rows={1} maxLength={1000} className="input" />
      </div>
      <fieldset className="border-0 p-0 m-0 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <legend className="sr-only">Who can see it</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="visibility" value="public" defaultChecked className="accent-accent w-4 h-4" />
          Public on this page
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="visibility" value="artist" className="accent-accent w-4 h-4" />
          Only the artist
        </label>
      </fieldset>
      <Note state={state} />
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <span className="text-sm text-muted">Be specific and kind. The artist can mark feedback as helpful.</span>
        <SubmitButton pendingText="Posting…">Post feedback</SubmitButton>
      </div>
    </form>
  );
}

export function SaveToCollection({
  projectId,
  path,
  collections,
}: {
  projectId: string;
  path: string;
  collections: { id: string; name: string; has: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(saveToCollection, undefined);
  const [choice, setChoice] = useState(collections.find((c) => !c.has)?.id ?? "new");
  const saved = collections.some((c) => c.has);
  return (
    <div className="relative">
      <button type="button" className="btn btn-outline text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        <BookmarkIcon size={16} />
        {saved ? "Saved" : "Save to collection"}
      </button>
      {open && (
        <form action={action} className="card absolute right-0 z-10 mt-2 p-4 w-[300px] max-w-[85vw] flex flex-col gap-3 shadow-lg">
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="path" value={path} />
          <label htmlFor="collection_id" className="label mb-0">Save to</label>
          <select id="collection_id" name="collection_id" className="input" value={choice} onChange={(e) => setChoice(e.target.value)}>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.has ? " (saved)" : ""}
              </option>
            ))}
            <option value="new">+ New collection</option>
          </select>
          {choice === "new" && (
            <>
              <label htmlFor="new_name" className="sr-only">New collection name</label>
              <input id="new_name" name="new_name" maxLength={80} placeholder="Collection name" className="input" />
            </>
          )}
          <Note state={state} />
          <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton>
        </form>
      )}
    </div>
  );
}

export function InquiryForm({
  artistId,
  artistName,
  projectId,
  path,
  email,
}: {
  artistId: string;
  artistName: string;
  projectId?: string;
  path: string;
  email: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(sendInquiry, undefined);
  if (state?.ok) return <Note state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="artist_id" value={artistId} />
      <input type="hidden" name="project_id" value={projectId ?? ""} />
      <input type="hidden" name="path" value={path} />
      <div>
        <label htmlFor="inq-kind" className="label">What it&apos;s about</label>
        <select id="inq-kind" name="kind" className="input">
          {INQUIRY_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="inq-msg" className="label">Message to {artistName}</label>
        <textarea id="inq-msg" name="message" rows={4} maxLength={2000} required className="input" />
      </div>
      <div>
        <label htmlFor="inq-email" className="label">Your email for replies</label>
        <input id="inq-email" name="email" type="email" defaultValue={email} required className="input" />
      </div>
      <Note state={state} />
      <SubmitButton pendingText="Sending…">Send message</SubmitButton>
    </form>
  );
}

export function ReportForm({ projectId, feedbackId, path }: { projectId?: string; feedbackId?: string; path: string }) {
  const [state, action] = useActionState<ActionState, FormData>(reportContent, undefined);
  if (state?.ok) return <Note state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3 pt-3">
      <input type="hidden" name="project_id" value={projectId ?? ""} />
      <input type="hidden" name="feedback_id" value={feedbackId ?? ""} />
      <input type="hidden" name="path" value={path} />
      <label htmlFor={`rep-${feedbackId ?? projectId}`} className="label mb-0">What&apos;s wrong?</label>
      <textarea id={`rep-${feedbackId ?? projectId}`} name="reason" rows={2} maxLength={1000} required className="input" />
      <Note state={state} />
      <SubmitButton className="btn btn-outline btn-sm self-start" pendingText="Sending…">Send to curators</SubmitButton>
    </form>
  );
}
