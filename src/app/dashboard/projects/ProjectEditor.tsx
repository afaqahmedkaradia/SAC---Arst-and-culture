"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { BLOCK_LABELS, DISCIPLINES, mediaUrl, videoEmbedUrl, type BlockKind } from "@/lib/constants";
import { ArrowDownIcon, ArrowUpIcon, BackIcon, TrashIcon } from "@/components/Icons";
import { saveProject, type EditorBlock, type EditorCredit, type EditorPayload } from "./actions";

type Block = EditorBlock & { key: string };
type Credit = EditorCredit & { key: string };

const ACCEPT: Partial<Record<BlockKind | "cover", string>> = {
  cover: "image/jpeg,image/png,image/webp,image/gif",
  image: "image/jpeg,image/png,image/webp,image/gif",
  audio: "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg",
  pdf: "application/pdf",
};
const MAX_MB = 25;
const newKey = () => Math.random().toString(36).slice(2);

export function ProjectEditor({
  userId,
  canPublish,
  initial,
}: {
  userId: string;
  canPublish: boolean;
  initial: EditorPayload & { status?: string };
}) {
  const [id, setId] = useState<string | null>(initial.id ?? null);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [discipline, setDiscipline] = useState(initial.discipline || DISCIPLINES[0]);
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const [cover, setCover] = useState<string | null>(initial.cover_path ?? null);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks.map((b) => ({ ...b, key: newKey() })));
  const [credits, setCredits] = useState<Credit[]>(initial.credits.map((c) => ({ ...c, key: newKey() })));
  const [feedbackOpen, setFeedbackOpen] = useState(initial.feedback_open);
  const [question, setQuestion] = useState(initial.feedback_question ?? "");
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  const update = (key: string, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const move = (key: string, dir: -1 | 1) =>
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Files go straight from the browser to Supabase Storage, into the person's own folder.
  async function upload(file: File): Promise<string | null> {
    if (file.size > MAX_MB * 1024 * 1024) {
      setMessage({ kind: "error", text: `That file is over ${MAX_MB} MB. Try a smaller one.` });
      return null;
    }
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setMessage({ kind: "error", text: `Upload failed: ${error.message}` });
      return null;
    }
    return path;
  }

  function pickFile(target: string, kind: BlockKind | "cover") {
    uploadTarget.current = target;
    if (fileInput.current) {
      fileInput.current.accept = ACCEPT[kind] ?? "";
      fileInput.current.value = "";
      fileInput.current.click();
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = uploadTarget.current;
    if (!file || !target) return;
    setMessage(null);
    setUploading(target);
    const path = await upload(file);
    setUploading(null);
    if (!path) return;
    if (target === "cover") setCover(path);
    else
      update(target, {
        media_path: path,
        caption: blocks.find((b) => b.key === target)?.caption || (file.type.startsWith("audio") || file.type === "application/pdf" ? file.name.replace(/\.[^.]+$/, "") : null),
      });
  }

  function addBlock(kind: BlockKind) {
    const key = newKey();
    setBlocks((bs) => [...bs, { key, kind, text_body: "", media_path: null, url: "", caption: "" }]);
    if (kind === "image" || kind === "audio" || kind === "pdf") setTimeout(() => pickFile(key, kind), 0);
  }

  function save(publish: boolean) {
    setMessage(null);
    const payload: EditorPayload = {
      id,
      title,
      summary,
      discipline,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      cover_path: cover,
      feedback_open: feedbackOpen,
      feedback_question: question,
      blocks: blocks.map(({ key: _k, ...b }) => b),
      credits: credits.filter((c) => c.name.trim() || c.username?.trim()).map(({ key: _k, ...c }) => c),
    };
    start(async () => {
      const res = await saveProject(payload, publish);
      if (res?.error) setMessage({ kind: "error", text: res.error });
      else if (res?.id) {
        setId(res.id);
        window.history.replaceState(null, "", window.location.pathname.replace(/\/projects\/new$/, `/projects/${res.id}/edit`));
        setMessage({ kind: "ok", text: "Draft saved." });
      }
    });
  }

  const coverUrl = mediaUrl(cover);
  const busy = pending || uploading !== null;

  return (
    <div className="flex-1 bg-soft">
      <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
      <header className="bg-white border-b border-line sticky top-0 z-20">
        <div className="page py-3 flex flex-wrap gap-x-6 gap-y-3 items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-ink no-underline font-medium py-2.5">
              <BackIcon /> Dashboard
            </Link>
            <span aria-hidden="true" className="w-px h-6 bg-line" />
            <h1 className="h-display m-0 text-xl font-semibold">{id ? "Edit project" : "New project"}</h1>
            {initial.status === "published" && <span className="chip bg-good-tint text-good">Published</span>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {id && initial.status === "published" ? null : (
              <button type="button" className="btn btn-outline text-sm" disabled={busy} onClick={() => save(false)}>
                {pending ? "Saving…" : "Save draft"}
              </button>
            )}
            {id && (
              <Link href={`/p/${id}`} className="btn btn-outline text-sm">Preview</Link>
            )}
            <button
              type="button"
              className="btn btn-primary text-sm"
              disabled={busy || !canPublish}
              title={canPublish ? undefined : "Available once a curator approves your artist account"}
              onClick={() => save(true)}
            >
              {initial.status === "published" ? "Save changes" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <div className="page pt-6">
        {!canPublish && (
          <p className="m-0 mb-4 text-sm bg-accent-tint text-ink rounded-lg px-4 py-3">
            Your artist account is waiting for curator approval. You can build and save drafts now and publish once you&apos;re approved.
          </p>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`m-0 mb-4 text-sm font-medium rounded-lg px-4 py-3 ${message.kind === "error" ? "bg-danger-tint text-danger" : "bg-good-tint text-good"}`}>
            {message.text}
          </p>
        )}
      </div>

      <main className="page pb-20 flex flex-wrap gap-7 items-start">
        <section aria-label="Project content" className="card flex-[999_1_640px] min-w-0 p-5 sm:p-10 flex flex-col gap-5">
          <div className="relative aspect-[16/7] rounded-[14px] overflow-hidden">
            {coverUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button type="button" className="btn btn-sm bg-white text-ink" onClick={() => pickFile("cover", "cover")}>Change cover</button>
                  <button type="button" className="btn btn-sm bg-white text-ink" onClick={() => setCover(null)}>Remove</button>
                </div>
              </>
            ) : (
              <button type="button" onClick={() => pickFile("cover", "cover")} className="w-full h-full border-2 border-dashed border-[#C8C7C2] rounded-[14px] bg-[#FAFAF8] flex flex-col items-center justify-center gap-2 cursor-pointer text-body">
                <span className="text-base font-semibold">{uploading === "cover" ? "Uploading…" : "Add a cover image"}</span>
                <span className="text-[13px] text-muted">Shown on Explore and the homepage. JPG, PNG or WebP, ideally 1600 px wide</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ptitle" className="sr-only">Project title</label>
            <input id="ptitle" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Project title" className="h-display border-0 border-b-[1.5px] border-line py-2 text-[clamp(28px,3.4vw,40px)] bg-transparent outline-none" />
            <label htmlFor="psum" className="sr-only">Short description</label>
            <input id="psum" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={280} placeholder="One line about this project" className="border-0 py-1.5 text-[17px] text-body bg-transparent outline-none" />
          </div>

          {blocks.map((b, i) => (
            <div key={b.key} className="border border-line rounded-[14px] overflow-hidden">
              <div className="flex justify-between items-center gap-3 px-3.5 py-1.5 bg-[#FAFAF8] border-b border-line">
                <span className="text-[13px] font-semibold text-body">{BLOCK_LABELS[b.kind]} block</span>
                <div className="flex">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(b.key, -1)} className="w-11 h-9 flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted disabled:opacity-30"><ArrowUpIcon size={16} /></button>
                  <button type="button" aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => move(b.key, 1)} className="w-11 h-9 flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted disabled:opacity-30"><ArrowDownIcon size={16} /></button>
                  <button type="button" aria-label={`Remove ${BLOCK_LABELS[b.kind]} block`} onClick={() => setBlocks((bs) => bs.filter((x) => x.key !== b.key))} className="w-11 h-9 flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted"><TrashIcon size={16} /></button>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {b.kind === "text" && (
                  <>
                    <label htmlFor={`t-${b.key}`} className="sr-only">Text</label>
                    <textarea id={`t-${b.key}`} rows={5} maxLength={10000} value={b.text_body ?? ""} onChange={(e) => update(b.key, { text_body: e.target.value })} placeholder="Write about the work: the idea, the process, who made it. Leave a blank line between paragraphs." className="w-full border-0 text-base leading-relaxed resize-y outline-none" />
                  </>
                )}
                {b.kind === "video" && (
                  <>
                    <label htmlFor={`v-${b.key}`} className="label mb-0">YouTube or Vimeo link</label>
                    <input id={`v-${b.key}`} type="url" value={b.url ?? ""} onChange={(e) => update(b.key, { url: e.target.value })} placeholder="https://vimeo.com/…" className="input" />
                    {b.url && !videoEmbedUrl(b.url) && <p className="hint m-0">That doesn&apos;t look like a YouTube or Vimeo link.</p>}
                  </>
                )}
                {(b.kind === "image" || b.kind === "audio" || b.kind === "pdf") && (
                  <>
                    {b.media_path ? (
                      b.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(b.media_path)!} alt="" className="w-full rounded-[10px]" />
                      ) : b.kind === "audio" ? (
                        <audio controls preload="none" src={mediaUrl(b.media_path)!} className="w-full" />
                      ) : (
                        <a href={mediaUrl(b.media_path)!} target="_blank" rel="noreferrer" className="font-semibold">Open the uploaded PDF</a>
                      )
                    ) : null}
                    <button type="button" className="btn btn-outline btn-sm self-start" disabled={uploading === b.key} onClick={() => pickFile(b.key, b.kind)}>
                      {uploading === b.key ? "Uploading…" : b.media_path ? "Replace file" : `Choose ${b.kind === "pdf" ? "a PDF" : b.kind === "audio" ? "an audio file" : "an image"}`}
                    </button>
                  </>
                )}
                {b.kind !== "text" && (
                  <>
                    <label htmlFor={`c-${b.key}`} className="sr-only">Caption</label>
                    <input id={`c-${b.key}`} value={b.caption ?? ""} onChange={(e) => update(b.key, { caption: e.target.value })} maxLength={200} placeholder={b.kind === "audio" || b.kind === "pdf" ? "Title" : "Caption (optional)"} className="input text-sm" />
                  </>
                )}
              </div>
            </div>
          ))}

          <div className="border-[1.5px] border-dashed border-[#C8C7C2] rounded-[14px] p-4 flex flex-col gap-3 items-center">
            <span className="text-sm font-semibold text-body">Add a block</span>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {(Object.keys(BLOCK_LABELS) as BlockKind[]).map((k) => (
                <button key={k} type="button" className="btn btn-outline btn-sm text-sm" onClick={() => addBlock(k)}>
                  {BLOCK_LABELS[k]}
                </button>
              ))}
            </div>
            <p className="hint m-0 text-center">Images, audio and PDFs up to {MAX_MB} MB. Video plays from YouTube or Vimeo.</p>
          </div>
        </section>

        <aside aria-label="Project settings" className="flex-[1_1_320px] min-w-0 flex flex-col gap-4">
          <section className="card p-5 flex flex-col gap-3.5">
            <h2 className="m-0 text-base font-semibold">Details</h2>
            <div>
              <label htmlFor="disc" className="label">Discipline</label>
              <select id="disc" value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="input">
                {DISCIPLINES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="tags" className="label">Tags</label>
              <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="oil, portrait, coastline" className="input" />
              <p className="hint mt-1.5 mb-0">Separate with commas. Up to 10.</p>
            </div>
          </section>

          <section className="card p-5 flex flex-col gap-3.5">
            <h2 className="m-0 text-base font-semibold">Credits</h2>
            <p className="m-0 hint">Add collaborators. If they&apos;re on SAC, add their username and the project appears on their profile too.</p>
            {credits.map((c) => (
              <div key={c.key} className="flex flex-col gap-2 border border-line rounded-[10px] p-3">
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor={`cn-${c.key}`}>Name</label>
                  <input id={`cn-${c.key}`} value={c.name} onChange={(e) => setCredits((cs) => cs.map((x) => (x.key === c.key ? { ...x, name: e.target.value } : x)))} placeholder="Name" maxLength={80} className="input text-sm" />
                  <button type="button" aria-label="Remove credit" onClick={() => setCredits((cs) => cs.filter((x) => x.key !== c.key))} className="w-11 shrink-0 flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted"><TrashIcon size={16} /></button>
                </div>
                <label className="sr-only" htmlFor={`cr-${c.key}`}>Role</label>
                <input id={`cr-${c.key}`} value={c.role ?? ""} onChange={(e) => setCredits((cs) => cs.map((x) => (x.key === c.key ? { ...x, role: e.target.value } : x)))} placeholder="Role, e.g. Sound design" maxLength={80} className="input text-sm" />
                <label className="sr-only" htmlFor={`cu-${c.key}`}>SAC username</label>
                <input id={`cu-${c.key}`} value={c.username ?? ""} onChange={(e) => setCredits((cs) => cs.map((x) => (x.key === c.key ? { ...x, username: e.target.value } : x)))} placeholder="SAC username (optional)" className="input text-sm" />
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm self-start" onClick={() => setCredits((cs) => [...cs, { key: newKey(), name: "", role: "", username: "" }])}>
              + Add a collaborator
            </button>
          </section>

          <section className="card p-5 flex flex-col gap-3.5">
            <label className="flex justify-between items-center gap-3 cursor-pointer">
              <span>
                <span className="block text-base font-semibold">Invite responses</span>
                <span className="block text-[13px] text-muted mt-0.5">Let the community tell you what your work means to them</span>
              </span>
              <input type="checkbox" role="switch" checked={feedbackOpen} onChange={(e) => setFeedbackOpen(e.target.checked)} className="w-[22px] h-[22px] accent-accent m-0 shrink-0" />
            </label>
            {feedbackOpen && (
              <div>
                <label htmlFor="ask" className="label">Ask the community something (optional)</label>
                <textarea id="ask" rows={3} maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Which piece in the series speaks to you most?" className="input text-sm" />
                <p className="hint mt-1.5 mb-0">A warm, specific question gets the best responses.</p>
              </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}
