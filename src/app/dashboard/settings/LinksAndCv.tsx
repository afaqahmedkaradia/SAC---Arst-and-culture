"use client";

import { useState } from "react";
import { CV_KINDS, LINK_PLATFORMS, type CvEntry, type ProfileLink } from "@/lib/constants";
import { TrashIcon } from "@/components/Icons";

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
    </section>
  );
}
