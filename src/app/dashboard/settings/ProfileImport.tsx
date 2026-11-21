"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { importProfile, type ProfileState } from "../actions";
import { CV_KINDS, LINK_PLATFORMS, type CvEntry, type CvKind } from "@/lib/constants";
import { parseCv, parseCvText, type CvSuggestions } from "@/lib/cv-parse";
import { CV_ACCEPT, extractCvLines } from "@/lib/cv-extract";
import type { Profile } from "@/lib/types";
import { SubmitButton } from "@/components/SubmitButton";

type Row = CvEntry & { key: string; on: boolean };
const newKey = () => Math.random().toString(36).slice(2);
const platformLabel = (id: string) => LINK_PLATFORMS.find((p) => p.id === id)?.label ?? id;

export function ProfileImport({ profile }: { profile: Profile }) {
  const isArtist = profile.role === "artist";
  const [mode, setMode] = useState<"pick" | "paste" | "reading" | "review">("pick");
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [found, setFound] = useState<CvSuggestions | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Review state
  const [headline, setHeadline] = useState({ on: false, value: "" });
  const [bio, setBio] = useState({ on: false, value: "" });
  const [location, setLocation] = useState({ on: false, value: "" });
  const [disc, setDisc] = useState<string[]>([]);
  const [avail, setAvail] = useState<string[]>([]);
  const [links, setLinks] = useState<{ key: string; on: boolean; platform: string; url: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const [state, action] = useActionState<ProfileState, FormData>(importProfile, undefined);
  useEffect(() => {
    if (state?.ok) window.location.reload();
  }, [state]);

  function review(s: CvSuggestions) {
    const existingLinks = new Set((profile.links ?? []).map((l) => l.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")));
    const existingCv = new Set((profile.cv ?? []).map((e) => `${e.year}|${e.title.trim().toLowerCase()}`));
    setFound(s);
    setHeadline({ on: !!s.headline && !profile.headline, value: s.headline ?? "" });
    setBio({ on: !!s.bio && !profile.bio, value: s.bio ?? "" });
    setLocation({ on: !!s.location && !profile.location, value: s.location ?? "" });
    setDisc(s.disciplines.filter((d) => !profile.disciplines?.includes(d)));
    setAvail(s.availableFor.filter((d) => !profile.available_for?.includes(d)));
    setLinks(
      s.links
        .filter((l) => !existingLinks.has(l.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")))
        .map((l) => ({ ...l, key: newKey(), on: true })),
    );
    setRows(s.entries.filter((e) => !existingCv.has(`${e.year}|${e.title.trim().toLowerCase()}`)).map((e) => ({ ...e, key: newKey(), on: true })));
    setMode("review");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setMode("reading");
    try {
      const lines = await extractCvLines(file);
      if (lines.filter((l) => l.text.trim()).length < 3) {
        throw new Error("We couldn't find any text in that file. If it's a scan or a picture, paste the text instead.");
      }
      review(parseCv(lines));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That file couldn't be read.");
      setMode("pick");
    }
  }

  function onPaste() {
    setError(null);
    if (pasted.trim().length < 20) return setError("Paste a little more of your CV first.");
    setFileName("");
    review(parseCvText(pasted));
  }

  const nothing =
    found && !headline.value && !bio.value && !location.value && !disc.length && !avail.length && !links.length && !rows.length;
  const chosen =
    (headline.on && headline.value ? 1 : 0) + (bio.on && bio.value ? 1 : 0) + (location.on && location.value ? 1 : 0) +
    disc.length + avail.length + links.filter((l) => l.on).length + (isArtist ? rows.filter((r) => r.on && r.title).length : 0);

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-4 border-2 border-gold bg-gold-tint/40">
      <div>
        <h2 className="m-0 text-lg font-semibold">Fill your profile from a CV or LinkedIn</h2>
        <p className="m-0 mt-1 text-sm text-muted">
          Upload your CV and we&apos;ll suggest your bio, links{isArtist ? ", exhibitions, performances and awards" : ""}. You choose what goes on your profile.
          Your file is read on this device and is not uploaded.
        </p>
      </div>

      {(mode === "pick" || mode === "reading") && (
        <div className="flex flex-col gap-3">
          <input ref={fileRef} type="file" accept={CV_ACCEPT} className="sr-only" onChange={onFile} aria-label="Choose a CV file" />
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={mode === "reading"}>
              {mode === "reading" ? `Reading ${fileName}…` : "Upload a CV (PDF or Word)"}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setError(null); setMode("paste"); }} disabled={mode === "reading"}>
              Paste text instead
            </button>
          </div>
          <details className="text-sm text-muted">
            <summary className="cursor-pointer text-ink font-medium">Using LinkedIn?</summary>
            <p className="m-0 mt-2">
              On your LinkedIn profile, select <strong>More</strong>, then <strong>Save to PDF</strong>. Upload that PDF here.
              It works on a computer; the LinkedIn phone app doesn&apos;t offer it.
            </p>
          </details>
        </div>
      )}

      {mode === "paste" && (
        <div className="flex flex-col gap-3">
          <label htmlFor="cv-paste" className="label">Paste your CV or artist bio</label>
          <textarea id="cv-paste" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={10} className="input" placeholder={"Artist Statement\nI paint…\n\nExhibitions\n2025  Colours of Home, Partner Gallery, Vancouver"} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={onPaste}>Find details</button>
            <button type="button" className="btn btn-sm bg-transparent text-muted" onClick={() => setMode("pick")}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="m-0 text-sm text-danger">{error}</p>}

      {mode === "review" && found && (
        <form action={action} className="flex flex-col gap-5">
          <p className="m-0 text-sm">
            {found.source === "linkedin" ? "From your LinkedIn PDF" : fileName ? `From ${fileName}` : "From your pasted text"}
            {nothing ? ": nothing new to add. Everything we found is already on your profile, or the layout was hard to read. Try pasting the text instead." : ". Untick anything you don't want, and fix anything we got wrong."}
          </p>

          {[
            { key: "headline", label: "Headline", st: headline, set: setHeadline, current: profile.headline, max: 120, area: false },
            { key: "location", label: "Location", st: location, set: setLocation, current: profile.location, max: 80, area: false },
            { key: "bio", label: "Bio", st: bio, set: setBio, current: profile.bio, max: 2000, area: true },
          ]
            .filter((f) => f.st.value)
            .map((f) => (
              <div key={f.key} className="flex flex-col gap-2">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={f.st.on} onChange={(e) => f.set({ ...f.st, on: e.target.checked })} />
                  {f.label}
                  {f.current && <span className="text-xs text-muted font-normal">(replaces what you have now)</span>}
                </label>
                {f.st.on && (f.area ? (
                  <textarea name={f.key} value={f.st.value} onChange={(e) => f.set({ ...f.st, value: e.target.value })} maxLength={f.max} rows={5} className="input" aria-label={f.label} />
                ) : (
                  <input name={f.key} value={f.st.value} onChange={(e) => f.set({ ...f.st, value: e.target.value })} maxLength={f.max} className="input" aria-label={f.label} />
                ))}
              </div>
            ))}

          {(found.disciplines.some((d) => !profile.disciplines?.includes(d)) || found.availableFor.some((d) => !profile.available_for?.includes(d))) && (
            <div className="flex flex-col gap-2">
              <span className="font-medium">Disciplines and availability</span>
              <div className="flex flex-wrap gap-2">
                {found.disciplines.filter((d) => !profile.disciplines?.includes(d)).map((d) => (
                  <label key={d} className="chip cursor-pointer flex items-center gap-1.5">
                    <input type="checkbox" name="disciplines" value={d} checked={disc.includes(d)} onChange={(e) => setDisc((x) => (e.target.checked ? [...x, d] : x.filter((y) => y !== d)))} />
                    {d}
                  </label>
                ))}
                {found.availableFor.filter((d) => !profile.available_for?.includes(d)).map((d) => (
                  <label key={d} className="chip cursor-pointer flex items-center gap-1.5">
                    <input type="checkbox" name="available_for" value={d} checked={avail.includes(d)} onChange={(e) => setAvail((x) => (e.target.checked ? [...x, d] : x.filter((y) => y !== d)))} />
                    Available for {d.toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-medium">Links</span>
              <input type="hidden" name="links" value={JSON.stringify(links.filter((l) => l.on).map(({ platform, url }) => ({ platform, url })))} />
              {links.map((l) => (
                <label key={l.key} className="flex items-center gap-2 text-sm min-w-0">
                  <input type="checkbox" checked={l.on} onChange={(e) => setLinks((ls) => ls.map((x) => (x.key === l.key ? { ...x, on: e.target.checked } : x)))} />
                  <span className="font-medium">{platformLabel(l.platform)}</span>
                  <span className="text-muted truncate">{l.url.replace(/^https?:\/\//, "")}</span>
                </label>
              ))}
            </div>
          )}

          {isArtist && rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-medium">CV and recognition ({rows.filter((r) => r.on).length} of {rows.length})</span>
              <input type="hidden" name="cv" value={JSON.stringify(rows.filter((r) => r.on && r.title).map(({ key: _k, on: _o, ...r }) => r))} />
              {rows.map((r, i) => (
                <div key={r.key} className={`flex flex-wrap gap-2 items-center border border-line rounded-[10px] p-2.5 bg-white ${r.on ? "" : "opacity-50"}`}>
                  <input type="checkbox" aria-label={`Include entry ${i + 1}`} checked={r.on} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, on: e.target.checked } : x)))} />
                  <input aria-label={`Year, entry ${i + 1}`} value={r.year} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, year: e.target.value.replace(/[^0-9–-]/g, "").slice(0, 9) } : x)))} className="input w-[84px] flex-[0_0_auto]" />
                  <select aria-label={`Type, entry ${i + 1}`} value={r.kind} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, kind: e.target.value as CvKind } : x)))} className="input w-auto min-w-[130px] flex-[0_0_auto]">
                    {CV_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                  </select>
                  <input aria-label={`Title, entry ${i + 1}`} value={r.title} maxLength={120} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, title: e.target.value } : x)))} className="input flex-[1_1_200px]" />
                  <input aria-label={`Place, entry ${i + 1}`} value={r.place ?? ""} maxLength={120} placeholder="Place" onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, place: e.target.value } : x)))} className="input flex-[1_1_160px]" />
                </div>
              ))}
            </div>
          )}

          {state?.error && <p role="alert" className="m-0 text-sm text-danger">{state.error}</p>}
          <div className="flex flex-wrap gap-2 items-center">
            {!nothing && <SubmitButton className="btn btn-primary" pendingText="Adding…" disabled={chosen === 0}>Add {chosen} {chosen === 1 ? "item" : "items"} to my profile</SubmitButton>}
            <button type="button" className="btn bg-transparent text-muted" onClick={() => { setFound(null); setMode("pick"); }}>Start over</button>
          </div>
        </form>
      )}
    </section>
  );
}
