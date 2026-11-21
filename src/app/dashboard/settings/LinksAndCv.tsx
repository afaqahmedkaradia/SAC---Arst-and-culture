"use client";

import { useState } from "react";
import { CV_KINDS, LINK_PLATFORMS, type CvEntry, type ProfileLink } from "@/lib/constants";
import { TrashIcon } from "@/components/Icons";
import { parseEntryLine } from "@/lib/cv-parse";

const MAX_LINKS = 8;
const MAX_CV = 30;
const newKey = () => Math.random().toString(36).slice(2);

// Professional links (LinkedIn and others), sent to the server as JSON.
export function LinksEditor({ initial }: { initial: ProfileLink[] }) {
  const [links, setLinks] = useState(initial.map((l) => ({ ...l, key: newKey() })));
  const set = (key: string, patch: Partial<ProfileLink>) => setLinks((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <h2 className="m-0 text-lg font-semibold">Links</h2>
        <p className="m-0 mt-1 text-sm text-muted">LinkedIn, your website and where people can see more of your work. Shown on your profile.</p>
      </div>
      <input type="hidden" name="links" value={JSON.stringify(links.map(({ key: _k, ...l }) => l))} />
      {links.map((l, i) => (
        <div key={l.key} className="flex flex-wrap gap-2 items-center">
          <label htmlFor={`lp-${l.key}`} className="sr-only">Platform {i + 1}</label>
          <select id={`lp-${l.key}`} value={l.platform} onChange={(e) => set(l.key, { platform: e.target.value as ProfileLink["platform"] })} className="input w-auto min-w-[150px] flex-[0_0_auto]">
            {LINK_PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <label htmlFor={`lu-${l.key}`} className="sr-only">Address {i + 1}</label>
          <input id={`lu-${l.key}`} type="url" value={l.url} onChange={(e) => set(l.key, { url: e.target.value })} placeholder={l.platform === "linkedin" ? "https://www.linkedin.com/in/yourname" : "https://…"} maxLength={300} className="input flex-[1_1_240px]" />
          <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks((ls) => ls.filter((x) => x.key !== l.key))} className="w-11 h-11 flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted"><TrashIcon size={16} /></button>
        </div>
      ))}
      {links.length < MAX_LINKS && (
        <button type="button" className="btn btn-outline btn-sm self-start" onClick={() => setLinks((ls) => [...ls, { key: newKey(), platform: ls.some((x) => x.platform === "linkedin") ? "website" : "linkedin", url: "" }])}>
          + Add a link
        </button>
      )}
    </section>
  );
}

// Exhibitions, performances, awards and more, as simple dated entries.
export function CvEditor({ initial }: { initial: CvEntry[] }) {
  const [rows, setRows] = useState(initial.map((r) => ({ ...r, place: r.place ?? "", key: newKey() })));
  const set = (key: string, patch: Partial<CvEntry>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  function addPasted() {
    const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
    const found = lines.map((l) => parseEntryLine(l)).filter((e): e is CvEntry => !!e);
    const room = MAX_CV - rows.length;
    const added = found.slice(0, room);
    setRows((rs) => [...rs, ...added.map((e) => ({ ...e, place: e.place ?? "", key: newKey() }))]);
    const skipped = lines.length - added.length;
    setPasteNote(
      `Added ${added.length} ${added.length === 1 ? "entry" : "entries"}.` +
        (skipped > 0 ? ` ${skipped} ${skipped === 1 ? "line" : "lines"} had no year or there was no room, so ${skipped === 1 ? "it was" : "they were"} left out.` : "") +
        (added.length ? " Check them above, then save your profile." : ""),
    );
    if (added.length) {
      setPaste("");
      setPasting(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <h2 className="m-0 text-lg font-semibold">CV and recognition</h2>
        <p className="m-0 mt-1 text-sm text-muted">Exhibitions, performances, awards, residencies, education and press. Shown on the About tab of your profile.</p>
      </div>
      <input type="hidden" name="cv" value={JSON.stringify(rows.map(({ key: _k, ...r }) => r))} />
      {rows.map((r, i) => (
        <div key={r.key} className="flex flex-wrap gap-2 items-center border border-line rounded-[10px] p-3">
          <label htmlFor={`cy-${r.key}`} className="sr-only">Year, entry {i + 1}</label>
          <input id={`cy-${r.key}`} value={r.year} onChange={(e) => set(r.key, { year: e.target.value.replace(/[^0-9–-]/g, "").slice(0, 9) })} placeholder="Year" inputMode="numeric" className="input w-[96px] flex-[0_0_auto]" />
          <label htmlFor={`ck-${r.key}`} className="sr-only">Type, entry {i + 1}</label>
          <select id={`ck-${r.key}`} value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value as CvEntry["kind"] })} className="input w-auto min-w-[140px] flex-[0_0_auto]">
            {CV_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <label htmlFor={`ct-${r.key}`} className="sr-only">Title, entry {i + 1}</label>
          <input id={`ct-${r.key}`} value={r.title} onChange={(e) => set(r.key, { title: e.target.value })} maxLength={120} placeholder="Title, e.g. “First Light”, solo show" className="input flex-[1_1_220px]" />
          <label htmlFor={`cp-${r.key}`} className="sr-only">Place, entry {i + 1}</label>
          <input id={`cp-${r.key}`} value={r.place ?? ""} onChange={(e) => set(r.key, { place: e.target.value })} maxLength={120} placeholder="Place (optional)" className="input flex-[1_1_180px]" />
          <button type="button" aria-label={`Remove entry ${i + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="w-11 h-11 flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted"><TrashIcon size={16} /></button>
        </div>
      ))}
      {rows.length < MAX_CV && (
        <button type="button" className="btn btn-outline btn-sm self-start" onClick={() => setRows((rs) => [...rs, { key: newKey(), year: String(new Date().getFullYear()), kind: "exhibition", title: "", place: "" }])}>
          + Add an entry
        </button>
      )}
      {rows.length < MAX_CV && !pasting && (
        <button type="button" className="btn btn-sm bg-transparent text-accent self-start px-0" onClick={() => { setPasteNote(null); setPasting(true); }}>
          Paste several at once
        </button>
      )}
      {pasting && (
        <div className="flex flex-col gap-2 border border-line rounded-[10px] p-3 bg-soft">
          <label htmlFor="cv-quick" className="label m-0">One entry per line, starting or ending with the year</label>
          <textarea
            id="cv-quick"
            rows={6}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            className="input"
            placeholder={"2025  Colours of Home, Partner Gallery, Vancouver\n2024, Award, Emerging Artist Award, Ontario Arts Council\nBFA, Painting, OCAD University, 2019"}
          />
          <p className="m-0 text-xs text-muted">We guess the type from words like exhibition, festival, award or BFA. You can change it after.</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={addPasted}>Add entries</button>
            <button type="button" className="btn btn-sm bg-transparent text-muted" onClick={() => setPasting(false)}>Cancel</button>
          </div>
        </div>
      )}
      {pasteNote && <p role="status" className="m-0 text-sm text-muted">{pasteNote}</p>}
    </section>
  );
}
