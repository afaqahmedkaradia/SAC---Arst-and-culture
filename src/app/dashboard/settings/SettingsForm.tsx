"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { updateProfile, type ProfileState } from "../actions";
import { AVAILABLE_FOR, BANNER_COLORS, DISCIPLINES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, undefined);
  const [avatar, setAvatar] = useState(profile.avatar_path ?? "");
  const [banner, setBanner] = useState(profile.banner_color);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [name, setName] = useState(profile.display_name);
  const fileRef = useRef<HTMLInputElement>(null);
  const isArtist = profile.role === "artist";

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) return setUploadError("Please use an image under 5 MB.");
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${profile.id}/avatar-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("media").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) setUploadError(error.message);
    else setAvatar(path);
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="avatar_path" value={avatar} />

      <section className="card p-5 sm:p-6 flex flex-col gap-5">
        <h2 className="m-0 text-lg font-semibold">Photo and banner</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <Avatar person={{ ...profile, display_name: name || profile.display_name, avatar_path: avatar || null, banner_color: banner }} size={80} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onAvatar} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : avatar ? "Change photo" : "Upload a photo"}
          </button>
          {avatar && (
            <button type="button" className="btn btn-sm bg-transparent text-muted" onClick={() => setAvatar("")}>Remove photo</button>
          )}
        </div>
        {uploadError && <p role="alert" className="m-0 text-sm text-danger">{uploadError}</p>}
        <fieldset className="border-0 p-0 m-0">
          <legend className="label">Banner colour</legend>
          <div className="flex flex-wrap gap-2.5">
            {BANNER_COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="banner_color" value={c} checked={banner === c} onChange={() => setBanner(c)} className="sr-only peer" />
                <span
                  aria-label={c}
                  className="block w-11 h-11 rounded-full border-2 border-white peer-checked:outline peer-checked:outline-[3px] peer-checked:outline-ink peer-focus-visible:outline peer-focus-visible:outline-accent"
                  style={{ background: c, boxShadow: "0 0 0 1px #D6D5D1" }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card p-5 sm:p-6 flex flex-col gap-4">
        <h2 className="m-0 text-lg font-semibold">About you</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <label htmlFor="display_name" className="label">Name</label>
            <input id="display_name" name="display_name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className="input" />
          </div>
          <div>
            <label htmlFor="username" className="label">Username</label>
            <input id="username" name="username" defaultValue={profile.username} required pattern="[a-z0-9][a-z0-9\-]{2,29}" className="input" aria-describedby="un-hint" />
            <p id="un-hint" className="hint mt-1.5 mb-0">Your profile address ends in /a/username</p>
          </div>
        </div>
        <div>
          <label htmlFor="headline" className="label">Headline</label>
          <input id="headline" name="headline" defaultValue={profile.headline ?? ""} maxLength={120} placeholder={isArtist ? "Painter · Printmaker" : "Theatre lover and occasional critic"} className="input" />
        </div>
        <div>
          <label htmlFor="bio" className="label">Bio</label>
          <textarea id="bio" name="bio" rows={6} defaultValue={profile.bio ?? ""} maxLength={2000} className="input" placeholder="Your practice, what you're working on, exhibitions and residencies." />
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div>
            <label htmlFor="location" className="label">Location</label>
            <input id="location" name="location" defaultValue={profile.location ?? ""} maxLength={80} className="input" />
          </div>
          <div>
            <label htmlFor="website" className="label">Website</label>
            <input id="website" name="website" defaultValue={profile.website ?? ""} maxLength={300} className="input" />
          </div>
          <div>
            <label htmlFor="instagram" className="label">Instagram handle</label>
            <input id="instagram" name="instagram" defaultValue={profile.instagram ?? ""} maxLength={100} placeholder="@yourname" className="input" />
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6 flex flex-col gap-5">
        <fieldset className="border-0 p-0 m-0">
          <legend className="label">Disciplines</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {DISCIPLINES.map((d) => (
              <label key={d} className="flex items-center gap-2 text-[15px] min-h-8">
                <input type="checkbox" name="disciplines" value={d} defaultChecked={profile.disciplines.includes(d)} className="w-[18px] h-[18px] accent-accent" />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
        {isArtist && (
          <fieldset className="border-0 p-0 m-0">
            <legend className="label">Available for</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {AVAILABLE_FOR.map((d) => (
                <label key={d} className="flex items-center gap-2 text-[15px] min-h-8">
                  <input type="checkbox" name="available_for" value={d} defaultChecked={profile.available_for.includes(d)} className="w-[18px] h-[18px] accent-accent" />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      {state?.error && <p role="alert" className="m-0 text-sm font-medium text-danger bg-danger-tint rounded-lg px-3.5 py-2.5">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 text-sm font-medium text-good bg-good-tint rounded-lg px-3.5 py-2.5">{state.ok}</p>}
      <div className="flex flex-wrap gap-3 items-center">
        <SubmitButton disabled={uploading}>Save profile</SubmitButton>
        <Link href={`/a/${profile.username}`}>View your profile</Link>
        <Link href="/account/password" className="ml-auto text-sm">Change password</Link>
      </div>
    </form>
  );
}
