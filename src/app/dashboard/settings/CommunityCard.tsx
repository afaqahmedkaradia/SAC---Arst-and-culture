"use client";

import { useActionState } from "react";
import { saveCommunity, type ProfileState } from "../actions";
import { CommunityFields } from "@/components/CommunityFields";
import type { CommunityDetails } from "@/lib/community";
import { SubmitButton } from "@/components/SubmitButton";

export function CommunityCard({ initial }: { initial: CommunityDetails | null }) {
  const [state, action] = useActionState<ProfileState, FormData>(saveCommunity, undefined);
  return (
    <form action={action} className="card p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <h2 className="m-0 text-lg font-semibold">Community connection</h2>
        <p className="m-0 mt-1 text-sm text-muted">
          Private. Only SAC curators see these details, to confirm artist accounts. They never appear on your profile.
        </p>
        {!initial && (
          <p className="m-0 mt-2 text-sm font-medium text-ink bg-gold-tint rounded-lg px-3 py-2">
            Please add these details so a curator can confirm your artist account.
          </p>
        )}
      </div>
      <CommunityFields initial={initial} idPrefix="settings" />
      {state?.error && <p role="alert" className="m-0 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 text-sm text-good">{state.ok}</p>}
      <SubmitButton className="btn btn-primary self-start" pendingText="Saving…">Save community details</SubmitButton>
    </form>
  );
}
