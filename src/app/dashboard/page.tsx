import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, canDraft } from "@/lib/viewer";
import { timeAgo, INQUIRY_KINDS } from "@/lib/constants";
import { countOf, PROJECT_CARD_SELECT, type PersonLite, type ProjectCard } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { CheckIcon, PlusIcon } from "@/components/Icons";
import { ProjectGrid } from "@/components/ProjectCard";
import { setHelpful } from "@/app/actions/social";
import { signOut } from "@/app/(auth)/actions";
import { markInquiryRead, requestArtistAccount } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

type MyProject = {
  id: string;
  title: string;
  status: string;
  featured: boolean;
  cover_path: string | null;
  updated_at: string;
  appreciations: { count: number }[];
  feedback: { count: number }[];
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-[18px]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="m-0 mt-2 h-display text-[34px]">{value}</dd>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; password?: string; deleted?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await requireViewer("/dashboard");
  const me = viewer.profile;
  const supabase = await createClient();
  const isArtist = canDraft(me);
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const notices = [
    sp.welcome && "Welcome to SAC! Your account is ready.",
    sp.password && "Your password has been changed.",
    sp.deleted && "Project deleted.",
  ].filter(Boolean) as string[];

  // ---------------- Artist data ----------------
  let projects: MyProject[] = [];
  let stats = { appreciations: 0, followers: 0, feedback: 0, inquiries: 0 };
  type FB = { id: string; working: string | null; explore: string | null; helpful: boolean; created_at: string; project: { id: string; title: string } | null; author: PersonLite | null };
  type INQ = { id: string; kind: string; message: string; sender_email: string; read_at: string | null; created_at: string; sender: PersonLite | null; project: { id: string; title: string } | null };
  let feedback: FB[] = [];
  let inquiries: INQ[] = [];

  if (isArtist) {
    const { data } = await supabase
      .from("projects")
      .select("id,title,status,featured,cover_path,updated_at,appreciations(count),feedback(count)")
      .eq("owner_id", me.id)
      .order("updated_at", { ascending: false });
    projects = (data ?? []) as unknown as MyProject[];
    const ids = projects.map((p) => p.id);
    const none = ["00000000-0000-0000-0000-000000000000"];

    const [a, f, fb, inq, fbRecent] = await Promise.all([
      supabase.from("appreciations").select("*", { count: "exact", head: true }).in("project_id", ids.length ? ids : none).gte("created_at", since),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("artist_id", me.id).gte("created_at", since),
      supabase.from("feedback").select("*", { count: "exact", head: true }).in("project_id", ids.length ? ids : none).gte("created_at", since),
      supabase
        .from("inquiries")
        .select("id,kind,message,sender_email,read_at,created_at,sender:profiles!inquiries_sender_id_fkey(id,username,display_name,avatar_path,banner_color),project:projects(id,title)")
        .eq("artist_id", me.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("feedback")
        .select("id,working,explore,helpful,created_at,project:projects(id,title),author:profiles!feedback_author_id_fkey(id,username,display_name,avatar_path,banner_color)")
        .in("project_id", ids.length ? ids : none)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    inquiries = (inq.data ?? []) as unknown as INQ[];
    feedback = (fbRecent.data ?? []) as unknown as FB[];
    stats = {
      appreciations: a.count ?? 0,
      followers: f.count ?? 0,
      feedback: fb.count ?? 0,
      inquiries: inquiries.filter((i) => !i.read_at).length,
    };
  }

  // ---------------- Member data (everyone gets this) ----------------
  const { data: followRows } = await supabase.from("follows").select("artist_id").eq("follower_id", me.id);
  const followingIds = (followRows ?? []).map((r) => r.artist_id);
  const [feedRes, colRes, givenRes] = await Promise.all([
    followingIds.length
      ? supabase.from("projects").select(PROJECT_CARD_SELECT).eq("status", "published").in("owner_id", followingIds).order("published_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    supabase.from("collections").select("id,name,collection_items(count)").eq("owner_id", me.id).order("created_at", { ascending: false }),
    supabase.from("feedback").select("id,helpful,created_at,project:projects(id,title)").eq("author_id", me.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const feed = (feedRes.data ?? []) as unknown as ProjectCard[];
  const collections = (colRes.data ?? []) as unknown as { id: string; name: string; collection_items: { count: number }[] }[];
  const given = (givenRes.data ?? []) as unknown as { id: string; helpful: boolean; created_at: string; project: { id: string; title: string } | null }[];

  const checklist = [
    { done: me.artist_status === "approved", label: "Artist account approved" },
    { done: !!me.avatar_path, label: "Profile photo added" },
    { done: !!me.bio && me.disciplines.length > 0, label: "Bio and disciplines added" },
    { done: projects.filter((p) => p.status === "published").length >= 3, label: "3 or more projects published" },
  ];
  const completeness = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const statusPill: Record<string, string> = {
    published: "bg-good-tint text-good",
    draft: "bg-[#EEEDE9] text-body",
    removed: "bg-danger-tint text-danger",
  };

  return (
    <main className="flex-1 bg-soft">
      <div className="page pt-8 pb-20 flex flex-col gap-6">
        {notices.map((n) => (
          <p key={n} role="status" className="m-0 text-sm font-medium bg-good-tint text-good rounded-lg px-4 py-3">{n}</p>
        ))}

        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="h-display m-0 text-[34px]">Welcome back, {me.display_name.split(" ")[0]}</h1>
            <p className="m-0 mt-1.5 text-[15px] text-muted">
              {isArtist ? "Here's what happened with your work in the last 30 days." : "New work from the artists you follow, and your collections."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/dashboard/settings" className="btn btn-outline text-sm">Profile settings</Link>
            <Link href={`/a/${me.username}`} className="btn btn-outline text-sm">View profile</Link>
            {isArtist && (
              <Link href="/dashboard/projects/new" className="btn btn-primary"><PlusIcon /> New project</Link>
            )}
          </div>
        </div>

        {me.role === "artist" && me.artist_status === "pending" && (
          <p className="m-0 bg-accent-tint rounded-xl px-5 py-4 text-[15px] leading-relaxed">
            <strong>Your artist account is waiting for curator approval.</strong> In the meantime, complete your profile and draft your first projects. You&apos;ll be able to publish as soon as you&apos;re approved.
          </p>
        )}
        {me.role === "artist" && me.artist_status === "declined" && (
          <p className="m-0 bg-danger-tint text-ink rounded-xl px-5 py-4 text-[15px] leading-relaxed">
            Your artist account wasn&apos;t approved this time. You can still follow artists, give feedback and build collections. Reach out to the SAC curators if you have questions.
          </p>
        )}
        {me.role === "member" && (
          <div className="card p-5 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="m-0 text-lg font-semibold">Are you an artist?</h2>
              <p className="m-0 mt-1 text-sm text-muted">Request an artist account to share projects. A community curator will review it.</p>
            </div>
            <form action={requestArtistAccount}>
              <button className="btn btn-primary">Request an artist account</button>
            </form>
          </div>
        )}

        {isArtist && (
          <>
            <dl className="m-0 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <Stat label="Appreciations" value={stats.appreciations} />
              <Stat label="New followers" value={stats.followers} />
              <Stat label="Feedback received" value={stats.feedback} />
              <Stat label="Unread inquiries" value={stats.inquiries} />
            </dl>

            <div className="flex flex-wrap gap-6 items-start">
              <section aria-labelledby="fb-h" className="card flex-[3_1_420px] min-w-0 p-5 flex flex-col">
                <h2 id="fb-h" className="m-0 mb-2 text-lg font-semibold">Feedback on your work</h2>
                {feedback.length === 0 && (
                  <p className="text-sm text-muted">No feedback yet. Turn on &quot;Open for feedback&quot; on a project and ask a specific question.</p>
                )}
                {feedback.map((f) => (
                  <article key={f.id} className="border-t border-[#EEEDE9] py-4 flex gap-3.5">
                    {f.author && <Avatar person={f.author} size={40} />}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="text-sm text-muted">
                        <span className="font-semibold text-ink">{f.author?.display_name}</span> on{" "}
                        {f.project && <Link href={`/p/${f.project.id}#feedback`} className="font-semibold">{f.project.title}</Link>} · {timeAgo(f.created_at)}
                      </div>
                      <p className="m-0 text-[15px] leading-normal line-clamp-3">{f.working || f.explore}</p>
                      <form action={setHelpful} className="flex gap-2 flex-wrap">
                        <input type="hidden" name="feedback_id" value={f.id} />
                        <input type="hidden" name="value" value={f.helpful ? "0" : "1"} />
                        <input type="hidden" name="path" value="/dashboard" />
                        <button className={`btn btn-sm ${f.helpful ? "bg-good-tint text-good" : "btn-outline"}`} aria-pressed={f.helpful}>
                          {f.helpful ? "Marked helpful" : "Mark as helpful"}
                        </button>
                        {f.project && <Link href={`/p/${f.project.id}#feedback`} className="btn btn-sm btn-outline">Read in full</Link>}
                      </form>
                    </div>
                  </article>
                ))}
              </section>

              <div className="flex-[2_1_300px] min-w-0 flex flex-col gap-6">
                <section aria-labelledby="inq-h" className="card p-5 flex flex-col gap-3.5">
                  <h2 id="inq-h" className="m-0 text-lg font-semibold">Inquiries</h2>
                  {inquiries.length === 0 && <p className="m-0 text-sm text-muted">When someone uses &quot;Get in touch&quot;, their message appears here.</p>}
                  {inquiries.map((i) => (
                    <article key={i.id} className={`border rounded-xl p-3.5 flex flex-col gap-1.5 ${i.read_at ? "border-[#EEEDE9]" : "border-accent"}`}>
                      <span className="text-xs font-semibold tracking-[0.05em] uppercase text-accent">
                        {INQUIRY_KINDS.find((k) => k.value === i.kind)?.label ?? i.kind}
                        {!i.read_at && " · New"}
                      </span>
                      {i.project && <Link href={`/p/${i.project.id}`} className="text-[15px] font-semibold text-ink no-underline">About “{i.project.title}”</Link>}
                      <p className="m-0 text-sm leading-normal text-body whitespace-pre-line">{i.message}</p>
                      <span className="text-[13px] text-muted">From {i.sender?.display_name ?? "a member"} · {timeAgo(i.created_at)}</span>
                      <div className="flex gap-2 flex-wrap pt-1">
                        <a href={`mailto:${i.sender_email}?subject=${encodeURIComponent("Re: your message on SAC")}`} className="btn btn-sm btn-dark">Reply by email</a>
                        {!i.read_at && (
                          <form action={markInquiryRead}>
                            <input type="hidden" name="inquiry_id" value={i.id} />
                            <button className="btn btn-sm btn-outline">Mark as read</button>
                          </form>
                        )}
                      </div>
                    </article>
                  ))}
                  <p className="m-0 text-[13px] text-muted">Replies go by email. Selling on SAC is coming in a later phase.</p>
                </section>

                <section aria-labelledby="pc-h" className="card p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <h2 id="pc-h" className="m-0 text-lg font-semibold">Your profile</h2>
                    <span className="text-sm font-semibold text-accent">{completeness}% complete</span>
                  </div>
                  <div aria-hidden="true" className="h-2 rounded-full bg-[#EEEDE9] overflow-hidden">
                    <span className="block h-full bg-accent" style={{ width: `${completeness}%` }} />
                  </div>
                  <ul className="m-0 p-0 list-none flex flex-col gap-2 text-sm">
                    {checklist.map((c) => (
                      <li key={c.label} className="flex gap-2 items-center">
                        {c.done ? <CheckIcon size={16} className="text-good" /> : <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full border-2 border-[#C8C7C2] mx-px" />}
                        <span className={c.done ? "" : "text-body"}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <section aria-labelledby="pr-h" className="card p-5 flex flex-col gap-3">
              <h2 id="pr-h" className="m-0 text-lg font-semibold">Your projects</h2>
              {projects.length === 0 ? (
                <p className="m-0 text-sm text-muted">
                  Nothing here yet. <Link href="/dashboard/projects/new">Create your first project</Link>.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line">Project</th>
                        <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line">Status</th>
                        <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line text-right">Appreciations</th>
                        <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line text-right">Feedback</th>
                        <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line">Updated</th>
                        <th scope="col" className="py-2.5 px-2 border-b border-line"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-2 border-b border-[#EEEDE9]">
                            <div className="flex gap-2.5 items-center">
                              <span className="w-10 h-[30px] rounded-md overflow-hidden shrink-0"><Cover id={p.id} path={p.cover_path} /></span>
                              <Link href={`/p/${p.id}`} className="text-ink font-semibold no-underline">{p.title}</Link>
                            </div>
                          </td>
                          <td className="py-3 px-2 border-b border-[#EEEDE9]">
                            <span className={`chip ${p.featured ? "bg-[#FDF1D8] text-[#7A5208]" : statusPill[p.status] ?? ""}`}>
                              {p.featured ? "Featured" : p.status[0].toUpperCase() + p.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-2 border-b border-[#EEEDE9] text-right">{countOf(p.appreciations)}</td>
                          <td className="py-3 px-2 border-b border-[#EEEDE9] text-right">{countOf(p.feedback)}</td>
                          <td className="py-3 px-2 border-b border-[#EEEDE9] text-muted">{timeAgo(p.updated_at)}</td>
                          <td className="py-3 px-2 border-b border-[#EEEDE9] text-right">
                            {p.status !== "removed" && <Link href={`/dashboard/projects/${p.id}/edit`} className="font-semibold">Edit</Link>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <section aria-labelledby="feed-h" className="card p-5 flex flex-col gap-4">
          <div className="flex justify-between items-baseline gap-3 flex-wrap">
            <h2 id="feed-h" className="m-0 text-lg font-semibold">New from artists you follow</h2>
            <Link href={{ pathname: "/", query: { tab: "following" } }} className="text-sm font-semibold">See all</Link>
          </div>
          {feed.length ? (
            <ProjectGrid projects={feed} />
          ) : (
            <p className="m-0 text-sm text-muted">Follow artists to see their new work here. <Link href="/artists">Browse artists</Link></p>
          )}
        </section>

        <div className="flex flex-wrap gap-6 items-start">
          <section aria-labelledby="col-h" className="card flex-[1_1_320px] min-w-0 p-5 flex flex-col gap-3">
            <h2 id="col-h" className="m-0 text-lg font-semibold">Your collections</h2>
            {collections.length === 0 && <p className="m-0 text-sm text-muted">Use &quot;Save to collection&quot; on any project to start one.</p>}
            {collections.map((c) => (
              <Link key={c.id} href={`/c/${c.id}`} className="flex justify-between gap-3 py-2 border-t border-[#EEEDE9] no-underline text-ink">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted">{countOf(c.collection_items)} projects</span>
              </Link>
            ))}
          </section>
          <section aria-labelledby="given-h" className="card flex-[1_1_320px] min-w-0 p-5 flex flex-col gap-3">
            <h2 id="given-h" className="m-0 text-lg font-semibold">Feedback you&apos;ve given</h2>
            {given.length === 0 && <p className="m-0 text-sm text-muted">Find projects marked &quot;Open for feedback&quot; in Discover.</p>}
            {given.map((g) => (
              <div key={g.id} className="flex justify-between gap-3 py-2 border-t border-[#EEEDE9] text-sm">
                {g.project ? <Link href={`/p/${g.project.id}#feedback`} className="font-medium">{g.project.title}</Link> : <span>Removed project</span>}
                <span className="text-muted whitespace-nowrap">{g.helpful ? "Marked helpful · " : ""}{timeAgo(g.created_at)}</span>
              </div>
            ))}
          </section>
        </div>

        <form action={signOut} className="self-start">
          <button className="btn btn-outline btn-sm">Log out</button>
        </form>
      </div>
    </main>
  );
}
