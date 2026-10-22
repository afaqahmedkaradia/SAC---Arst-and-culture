import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { mediaUrl, timeAgo, videoEmbedUrl } from "@/lib/constants";
import { countOf, PROJECT_CARD_SELECT, type PersonLite, type ProjectCard } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { ThumbIcon } from "@/components/Icons";
import { ProjectGrid } from "@/components/ProjectCard";
import { FeedbackForm, InquiryForm, ReportForm, SaveToCollection } from "@/components/ProjectForms";
import { deleteFeedback, setHelpful, toggleAppreciation, toggleFollow } from "@/app/actions/social";

type Block = { id: string; kind: string; text_body: string | null; media_path: string | null; url: string | null; caption: string | null };
type Credit = { id: string; name: string; role: string | null; person: PersonLite | null };
type Feedback = {
  id: string;
  working: string | null;
  explore: string | null;
  question: string | null;
  visibility: string;
  helpful: boolean;
  created_at: string;
  author: (PersonLite & { role: string }) | null;
};

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

async function load(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "*, owner:profiles!projects_owner_id_fkey(id,username,display_name,avatar_path,banner_color,headline,available_for)," +
        "appreciations(count)",
    )
    .eq("id", id)
    .maybeSingle();
  return data as unknown as
    | (Record<string, unknown> & {
        id: string;
        title: string;
        summary: string | null;
        discipline: string;
        tags: string[];
        cover_path: string | null;
        status: string;
        featured: boolean;
        feedback_open: boolean;
        feedback_question: string | null;
        published_at: string | null;
        created_at: string;
        owner: PersonLite & { headline: string | null; available_for: string[] };
        appreciations: { count: number }[];
      })
    | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await load((await params).id);
  return p ? { title: p.title, description: p.summary ?? undefined } : { title: "Project not found" };
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="prose-sac">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">{para}</p>
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  const caption = b.caption ? <figcaption className="text-sm text-muted">{b.caption}</figcaption> : null;
  if (b.kind === "image") {
    const src = mediaUrl(b.media_path);
    if (!src) return null;
    return (
      <figure className="m-0 flex flex-col gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={b.caption ?? ""} className="w-full rounded-[14px]" loading="lazy" />
        {caption}
      </figure>
    );
  }
  if (b.kind === "text" && b.text_body) return <Paragraphs text={b.text_body} />;
  if (b.kind === "video") {
    const embed = videoEmbedUrl(b.url);
    return (
      <figure className="m-0 flex flex-col gap-2.5">
        {embed ? (
          <div className="relative aspect-video rounded-[14px] overflow-hidden bg-ink">
            <iframe
              src={embed}
              title={b.caption ?? "Video"}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : b.url ? (
          <a href={b.url} target="_blank" rel="noreferrer">Watch the video</a>
        ) : null}
        {caption}
      </figure>
    );
  }
  if (b.kind === "audio") {
    const src = mediaUrl(b.media_path);
    if (!src) return null;
    return (
      <figure className="m-0 border border-line rounded-[14px] p-5 flex flex-col gap-3">
        {b.caption && <figcaption className="font-semibold">{b.caption}</figcaption>}
        <audio controls preload="none" src={src} className="w-full" />
      </figure>
    );
  }
  if (b.kind === "pdf") {
    const src = mediaUrl(b.media_path);
    if (!src) return null;
    return (
      <div className="border border-line rounded-[14px] p-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <span aria-hidden="true" className="w-[52px] h-16 rounded-md bg-soft border border-line flex items-center justify-center text-xs font-semibold text-[#8E2C48]">PDF</span>
          <span className="font-semibold">{b.caption || "Document"}</span>
        </div>
        <a href={src} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open PDF</a>
      </div>
    );
  }
  return null;
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await load(id);
  if (!project) notFound();

  const viewer = await getViewer();
  const supabase = await createClient();
  const path = `/p/${id}`;
  const isOwner = viewer?.id === project.owner.id;

  const [blocksRes, creditsRes, feedbackRes, moreRes] = await Promise.all([
    supabase.from("project_blocks").select("id,kind,text_body,media_path,url,caption").eq("project_id", id).order("position"),
    supabase
      .from("project_credits")
      .select("id,name,role,person:profiles(id,username,display_name,avatar_path,banner_color)")
      .eq("project_id", id)
      .order("position"),
    supabase
      .from("feedback")
      .select("id,working,explore,question,visibility,helpful,created_at,author:profiles!feedback_author_id_fkey(id,username,display_name,avatar_path,banner_color,role)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select(PROJECT_CARD_SELECT)
      .eq("owner_id", project.owner.id)
      .eq("status", "published")
      .neq("id", id)
      .order("published_at", { ascending: false })
      .limit(3),
  ]);
  const blocks = (blocksRes.data ?? []) as Block[];
  const credits = (creditsRes.data ?? []) as unknown as Credit[];
  const feedback = (feedbackRes.data ?? []) as unknown as Feedback[];
  const more = (moreRes.data ?? []) as unknown as ProjectCard[];

  let appreciated = false;
  let following = false;
  let collections: { id: string; name: string; has: boolean }[] = [];
  if (viewer) {
    const [a, f, c] = await Promise.all([
      supabase.from("appreciations").select("project_id").eq("project_id", id).eq("user_id", viewer.id).maybeSingle(),
      supabase.from("follows").select("artist_id").eq("follower_id", viewer.id).eq("artist_id", project.owner.id).maybeSingle(),
      supabase.from("collections").select("id,name,collection_items(project_id)").eq("owner_id", viewer.id).order("created_at"),
    ]);
    appreciated = !!a.data;
    following = !!f.data;
    collections = ((c.data ?? []) as { id: string; name: string; collection_items: { project_id: string }[] }[]).map((col) => ({
      id: col.id,
      name: col.name,
      has: col.collection_items.some((i) => i.project_id === id),
    }));
  }

  const count = countOf(project.appreciations);
  const published = project.status === "published";

  return (
    <main className="page pt-10 pb-20 flex flex-col gap-8">
      {!published && (
        <p className="m-0 chip bg-soft text-body self-start">
          {project.status === "removed" ? "Removed by curators — only you can see this." : "Draft — only you can see this."}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Link href={{ pathname: "/explore", query: { d: project.discipline } }} className="chip bg-soft text-ink no-underline">
            {project.discipline}
          </Link>
          {project.featured && <span className="chip bg-saffron text-ink">Featured by SAC</span>}
        </div>
        <h1 className="h-display m-0 text-[clamp(34px,4.4vw,56px)] leading-[1.05]">{project.title}</h1>
        {project.summary && <p className="m-0 text-lg text-body max-w-[760px] leading-relaxed">{project.summary}</p>}

        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div className="flex items-center gap-3 flex-wrap">
            <Avatar person={project.owner} size={44} />
            <div className="flex flex-col">
              <Link href={`/a/${project.owner.username}`} className="text-ink font-semibold no-underline">
                {project.owner.display_name}
              </Link>
              {project.owner.headline && <span className="text-sm text-muted">{project.owner.headline}</span>}
            </div>
            {!isOwner && (
              <form action={toggleFollow}>
                <input type="hidden" name="artist_id" value={project.owner.id} />
                <input type="hidden" name="on" value={following ? "1" : "0"} />
                <input type="hidden" name="path" value={path} />
                <button className={`btn btn-sm text-sm ${following ? "bg-soft text-ink" : "btn-outline border-ink"}`} aria-pressed={following}>
                  {following ? "Following" : "Follow"}
                </button>
              </form>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            {isOwner ? (
              <>
                <span className="chip bg-soft text-body"><ThumbIcon size={16} /> {count} appreciations</span>
                <Link href={`/dashboard/projects/${id}/edit`} className="btn btn-dark text-sm">Edit project</Link>
              </>
            ) : (
              <>
                <form action={toggleAppreciation}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="on" value={appreciated ? "1" : "0"} />
                  <input type="hidden" name="path" value={path} />
                  <button className={`btn text-sm ${appreciated ? "btn-primary" : "btn-outline"}`} aria-pressed={appreciated} disabled={!published}>
                    <ThumbIcon size={16} />
                    {appreciated ? "Appreciated" : "Appreciate"} · {count}
                  </button>
                </form>
                {viewer ? (
                  <SaveToCollection projectId={id} path={path} collections={collections} />
                ) : null}
                <a href="#inquire" className="btn btn-dark text-sm">Get in touch</a>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-10 items-start">
        <div className="flex-[999_1_640px] min-w-0 flex flex-col gap-7">
          {project.cover_path && blocks.every((b) => b.media_path !== project.cover_path) && (
            <div className="aspect-[16/9] rounded-[14px] overflow-hidden">
              <Cover id={project.id} path={project.cover_path} />
            </div>
          )}
          {blocks.map((b) => (
            <BlockView key={b.id} b={b} />
          ))}
          {blocks.length === 0 && !project.cover_path && (
            <div className="aspect-[16/9] rounded-[14px] overflow-hidden"><Cover id={project.id} path={null} /></div>
          )}

          <section id="feedback" aria-labelledby="fb-title" className="border-t border-line pt-8 flex flex-col gap-5">
            <h2 id="fb-title" className="h-display m-0 text-[26px] font-semibold">Responses · {feedback.length}</h2>
            {project.feedback_open && project.feedback_question && (
              <div className="bg-accent-tint rounded-[14px] px-5 py-4 flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold tracking-[0.06em] uppercase text-accent">The artist would love to hear</span>
                <p className="m-0 text-lg font-medium leading-snug">{project.feedback_question}</p>
              </div>
            )}

            {project.feedback_open && published && !isOwner && (viewer ? (
              <FeedbackForm projectId={id} />
            ) : (
              <p className="m-0 card p-5 text-body">
                <Link href={`/login?next=${encodeURIComponent(path + "#feedback")}`}>Log in</Link> or{" "}
                <Link href="/join">join SAC</Link> to share a response.
              </p>
            ))}

            {feedback.map((f) => (
              <article key={f.id} className="card p-5 flex flex-col gap-3.5">
                <div className="flex justify-between gap-3 flex-wrap items-center">
                  {f.author && (
                    <div className="flex gap-2.5 items-center">
                      <Avatar person={f.author} size={36} />
                      <div>
                        <Link href={`/a/${f.author.username}`} className="font-semibold text-[15px] text-ink no-underline">{f.author.display_name}</Link>
                        <div className="text-[13px] text-muted">
                          {f.author.role === "artist" ? "Artist" : "Member"} · {timeAgo(f.created_at)}
                          {f.visibility === "artist" && " · Only visible to the artist"}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 items-center flex-wrap">
                    {isOwner ? (
                      <form action={setHelpful}>
                        <input type="hidden" name="feedback_id" value={f.id} />
                        <input type="hidden" name="value" value={f.helpful ? "0" : "1"} />
                        <input type="hidden" name="path" value={path} />
                        <button className={`btn btn-sm ${f.helpful ? "bg-good-tint text-good" : "btn-outline"}`} aria-pressed={f.helpful}>
                          {f.helpful ? "Highlighted" : "Highlight"}
                        </button>
                      </form>
                    ) : (
                      f.helpful && <span className="chip bg-good-tint text-good">Highlighted by the artist</span>
                    )}
                    {(viewer?.id === f.author?.id || viewer?.profile?.is_admin) && (
                      <form action={deleteFeedback}>
                        <input type="hidden" name="feedback_id" value={f.id} />
                        <input type="hidden" name="path" value={path} />
                        <button className="btn btn-sm btn-outline">Delete</button>
                      </form>
                    )}
                  </div>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  {f.working && (
                    <div><div className="text-[13px] font-semibold text-muted mb-1">What moved me</div><p className="m-0 text-[15px] leading-normal whitespace-pre-line">{f.working}</p></div>
                  )}
                  {f.explore && (
                    <div><div className="text-[13px] font-semibold text-muted mb-1">What I&apos;d love to see next</div><p className="m-0 text-[15px] leading-normal whitespace-pre-line">{f.explore}</p></div>
                  )}
                  {f.question && (
                    <div><div className="text-[13px] font-semibold text-muted mb-1">Question</div><p className="m-0 text-[15px] leading-normal whitespace-pre-line">{f.question}</p></div>
                  )}
                </div>
                {viewer && !isOwner && viewer.id !== f.author?.id && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted">Report this response</summary>
                    <ReportForm feedbackId={f.id} path={path} />
                  </details>
                )}
              </article>
            ))}
          </section>
        </div>

        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-6">
          {credits.length > 0 && (
            <section className="card p-5 flex flex-col gap-3.5">
              <h2 className="m-0 text-base font-semibold">Credits</h2>
              {credits.map((c) => (
                <div key={c.id} className="flex gap-3 items-center">
                  {c.person ? (
                    <Avatar person={c.person} size={36} />
                  ) : (
                    <span aria-hidden="true" className="w-9 h-9 rounded-full bg-soft shrink-0" />
                  )}
                  <div className="min-w-0">
                    {c.person ? (
                      <Link href={`/a/${c.person.username}`} className="text-ink font-semibold text-[15px] no-underline">{c.person.display_name}</Link>
                    ) : (
                      <span className="font-semibold text-[15px]">{c.name}</span>
                    )}
                    {c.role && <div className="text-[13px] text-muted">{c.role}</div>}
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="card p-5 flex flex-col gap-3">
            <h2 className="m-0 text-base font-semibold">Details</h2>
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
              <dt className="text-muted">Discipline</dt>
              <dd className="m-0">{project.discipline}</dd>
              <dt className="text-muted">Published</dt>
              <dd className="m-0">
                {project.published_at
                  ? new Date(project.published_at).toLocaleDateString("en-CA", { month: "short", year: "numeric" })
                  : "Not yet"}
              </dd>
            </dl>
            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {project.tags.map((t) => (
                  <Link key={t} href={{ pathname: "/explore", query: { q: t } }} className="text-[13px] text-body bg-soft px-2.5 py-1.5 rounded-full no-underline">
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {!isOwner && (
            <section id="inquire" className="bg-ink text-white rounded-[14px] p-5 flex flex-col gap-3">
              <h2 className="h-display m-0 text-xl font-semibold">Interested in this work?</h2>
              <p className="m-0 text-sm leading-normal text-[#D6D5D1]">
                Ask about buying, booking, a commission or a collaboration. Your message goes to {project.owner.display_name}.
              </p>
              {viewer ? (
                <div className="bg-white text-ink rounded-xl p-4">
                  <InquiryForm
                    artistId={project.owner.id}
                    artistName={project.owner.display_name}
                    projectId={id}
                    path={path}
                    email={viewer.email ?? ""}
                  />
                </div>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(path + "#inquire")}`} className="btn bg-white text-ink self-start">
                  Log in to get in touch
                </Link>
              )}
            </section>
          )}

          {viewer && !isOwner && published && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">Report this project</summary>
              <ReportForm projectId={id} path={path} />
            </details>
          )}
        </aside>
      </div>

      {more.length > 0 && (
        <section aria-labelledby="more-title" className="border-t border-line pt-8 flex flex-col gap-5">
          <div className="flex justify-between gap-3 flex-wrap items-baseline">
            <h2 id="more-title" className="h-display m-0 text-2xl font-semibold">More from {project.owner.display_name}</h2>
            <Link href={`/a/${project.owner.username}`} className="font-semibold">View profile</Link>
          </div>
          <ProjectGrid projects={more} showOwner={false} />
        </section>
      )}
    </main>
  );
}
