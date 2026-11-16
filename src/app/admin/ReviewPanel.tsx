"use client";

import { useActionState } from "react";
import { CURATOR_CHECKS } from "@/lib/constants";
import { reviewArtist, type ReviewState } from "./actions";

// The curator's checklist for one artist application, with the three decisions.
export function ReviewPanel({ profileId, name, isSelf }: { profileId: string; name: string; isSelf: boolean }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(reviewArtist, undefined);
  if (isSelf) return <p className="m-0 text-sm text-muted">This is your own application. Another curator needs to review it.</p>;
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="profile_id" value={profileId} />
      <fieldset className="border-0 p-0 m-0 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))" }}>
        <legend className="label">Checklist for {name}</legend>
        {CURATOR_CHECKS.map((c, i) => (
          <label key={c.id} className="flex gap-2.5 items-start bg-white border border-line rounded-[10px] px-3 py-2.5 cursor-pointer">
            <input type="checkbox" name={`check_${c.id}`} className="w-[18px] h-[18px] mt-0.5 accent-accent shrink-0" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{i + 1}. {c.label}</span>
              <span className="text-[13px] text-muted leading-snug">{c.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={`note-${profileId}`} className="label">Note to the artist</label>
        <textarea
          id={`note-${profileId}`}
          name="note"
          rows={3}
          maxLength={2000}
          className="input text-sm"
          placeholder="Required when you request changes or decline. Be kind and specific, e.g. “Please add a short bio and label your second project as a study.”"
        />
      </div>
      {state?.error && <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3 py-2">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button name="decision" value="approved" className="btn btn-primary btn-sm" disabled={pending}>Approve</button>
        <button name="decision" value="changes" className="btn btn-outline btn-sm" disabled={pending}>Request changes</button>
        <button name="decision" value="declined" className="btn btn-sm bg-danger-tint text-danger" disabled={pending}>Decline</button>
      </div>
      <p className="m-0 hint">Skill level is never a reason to decline. Decline only for eligibility, a fake account, guideline breaches, or serious copying or consent problems.</p>
    </form>
  );
}
