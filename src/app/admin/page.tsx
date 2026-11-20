import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { LINK_PLATFORMS, REPORT_CATEGORIES, mediaUrl, timeAgo, workTypeLabel } from "@/lib/constants";
import { countOf, type PersonLite, type Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { resolveReport, setFeatured, setRemoved } from "./actions";
import { ReviewPanel } from "./ReviewPanel";

export const metadata: Metadata = { title: "Curators" };

const external = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const viewer = await requireViewer("/admin");
  if (!viewer.profile.is_admin) notFound();
  const { show } = await searchParams;
  const supabase = await createClient();

  type Rep = {
    id: string;
    reason: string;
    category: string;
    created_at: string;
    reporter: PersonLite | null;
    project: { id: string; title: string; status: string } | null;
    feedback: { id: string; working: string | null; explore: string | null; project_id: string } | null;
  };
  type Proj = {
    id: string;
    title: string;
    status: string;
    featured: boolean;
    cover_path: string | null;
    published_at: string | null;
    owner: PersonLite | null;
    appreciations: { count: number }[];
  };

  const [pendingRes, reportsRes, projectsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "artist").eq("artist_status", "pending").order("created_at"),
    supabase
      .from("reports")
      .select("id,reason,category,created_at,reporter:profiles!reports_reporter_id_fkey(id,username,display_name,avatar_path,banner_color),project:projects!reports_project_id_fkey(id,title,status),feedback(id,working,explore,project_id)")
      .eq("status", "open")
      .order("created_at"),
    supabase
      .from("projects")
      .select("id,title,status,featured,cover_path,published_at,owner:profiles!projects_owner_id_fkey(id,username,display_name,avatar_path,banner_color),appreciations(count)")
      .in("status", show === "removed" ? ["removed"] : ["published"])
      .order("published_at", { ascending: false })
      .limit(50),
  ]);
  const pending = (pendingRes.data ?? []) as Profile[];

  // Each applicant's work (drafts included) and earlier reviews, for the checklist.
  type Draft = { id: string; owner_id: string; title: string; status: string; cover_path: string | null; work_type: string; original_credit: string | null };
  type Review = { profile_id: string; decision: string; note: string | null; created_at: string; curator: { display_name: string } | null };
  const ids = pending.map((p) => p.id);
  const [draftsRes, reviewsRes] = ids.length
    ? await Promise.all([
        supabase.from("projects").select("id,owner_id,title,status,cover_path,work_type,original_credit").in("owner_id", ids).neq("status", "removed").order("created_at"),
        supabase.from("artist_reviews").select("profile_id,decision,note,created_at,curator:profiles!artist_reviews_curator_id_fkey(display_name)").in("profile_id", ids).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const drafts = (draftsRes.data ?? []) as Draft[];
  const reviews = (reviewsRes.data ?? []) as unknown as Review[];
  const linkLabel = (id: string) => LINK_PLATFORMS.find((l) => l.id === id)?.label ?? "Link";
  const categoryLabel = (id: string) => REPORT_CATEGORIES.find((c) => c.id === id)?.label ?? "Something else";
  const reports = (reportsRes.data ?? []) as unknown as Rep[];
  const projects = (projectsRes.data ?? []) as unknown as Proj[];

  return (
    <main className="flex-1 bg-soft">
      <div className="page pt-8 pb-20 flex flex-col gap-6">
        <div>
          <h1 className="h-display m-0 text-[34px]">Curators</h1>
          <p className="m-0 mt-1.5 text-muted">Review artists with the checklist, feature work and handle reports. <Link href="/guidelines">Community guidelines</Link></p>
          <Link href="/admin/newsletter" className="btn btn-dark btn-sm mt-3">Newsletters</Link>
        </div>

        <section aria-labelledby="pending-h" className="card p-5 flex flex-col gap-3">
          <h2 id="pending-h" className="m-0 text-lg font-semibold">Artists waiting for approval · {pending.length}</h2>
          {pending.length === 0 && <p className="m-0 text-sm text-muted">No one is waiting.</p>}
          {pending.map((p) => {
            const work = drafts.filter((d) => d.owner_id === p.id);
            const past = reviews.filter((r) => r.profile_id === p.id);
            return (
              <article key={p.id} className="border-t border-[#EEEDE9] pt-4 flex flex-col gap-4">
                <div className="flex gap-3 items-start min-w-0">
                  <Avatar person={p} size={44} />
                  <div className="flex flex-col gap-1 min-w-0">
                    <Link href={`/a/${p.username}`} className="font-semibold text-ink no-underline">{p.display_name}</Link>
                    <span className="text-sm text-muted">
                      {p.disciplines.join(" · ") || "No art forms"} · {p.location || "No location"} · joined {timeAgo(p.created_at)}
                    </span>
                    <span className="text-sm text-body">{p.bio ? `${p.bio.slice(0, 220)}${p.bio.length > 220 ? "…" : ""}` : "No bio yet"}</span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {p.work_link && <a href={external(p.work_link)} target="_blank" rel="noreferrer">Link from sign-up</a>}
                      {(p.links ?? []).map((l, i) => (
                        <a key={i} href={external(l.url)} target="_blank" rel="noreferrer">{linkLabel(l.platform)}</a>
                      ))}
                      {!p.work_link && !(p.links ?? []).length && <span className="text-muted">No links</span>}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="label mb-0">Their work · {work.length}</span>
                  {work.length === 0 && <p className="m-0 text-sm text-muted">No projects yet. You can request changes and ask them to add one.</p>}
                  {work.map((d) => {
                    const img = mediaUrl(d.cover_path);
                    const label = workTypeLabel(d.work_type, d.original_credit) ?? "Original work";
                    return (
                      <div key={d.id} className="flex flex-wrap gap-3 items-center bg-white border border-line rounded-[10px] p-2.5">
                        <span className="w-16 h-12 rounded-md overflow-hidden shrink-0"><Cover id={d.id} path={d.cover_path} /></span>
                        <span className="flex flex-col min-w-0 flex-1">
                          <Link href={`/p/${d.id}`} className="font-semibold text-ink no-underline">{d.title}</Link>
                          <span className="text-[13px] text-muted">{label} · {d.status}</span>
                        </span>
                        {img ? (
                          <span className="flex gap-3 text-[13px] font-semibold">
                            <a href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(img)}`} target="_blank" rel="noreferrer">Google Lens</a>
                            <a href={`https://tineye.com/search?url=${encodeURIComponent(img)}`} target="_blank" rel="noreferrer">TinEye</a>
                          </span>
                        ) : (
                          <span className="text-[13px] text-muted">No cover to search</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {past.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="label mb-0">Earlier reviews</span>
                    {past.map((r, i) => (
                      <p key={i} className="m-0 text-sm bg-white border border-line rounded-[10px] px-3 py-2">
                        <b>{r.decision === "changes" ? "Changes requested" : r.decision === "declined" ? "Declined" : "Approved"}</b>
                        {" "}by {r.curator?.display_name ?? "a curator"} · {timeAgo(r.created_at)}
                        {r.note && <><br /><span className="text-body">{r.note}</span></>}
                      </p>
                    ))}
                  </div>
                )}

                <ReviewPanel profileId={p.id} name={p.display_name} isSelf={p.id === viewer.id} />
              </article>
            );
          })}
        </section>

        <section aria-labelledby="reports-h" className="card p-5 flex flex-col gap-3">
          <h2 id="reports-h" className="m-0 text-lg font-semibold">Open reports · {reports.length}</h2>
          {reports.length === 0 && <p className="m-0 text-sm text-muted">Nothing reported.</p>}
          {reports.map((r) => (
            <article key={r.id} className="border-t border-[#EEEDE9] pt-4 flex flex-col gap-2">
              <div className="text-sm text-muted">
                Reported by {r.reporter?.display_name ?? "a member"} · {timeAgo(r.created_at)}
              </div>
              <span className="chip bg-gold-tint text-[#7A4E00] text-xs self-start">{categoryLabel(r.category)}</span>
              <p className="m-0 text-[15px]">“{r.reason}”</p>
              {r.project && (
                <p className="m-0 text-sm">Project: <Link href={`/p/${r.project.id}`}>{r.project.title}</Link> ({r.project.status})</p>
              )}
              {r.feedback && (
                <p className="m-0 text-sm bg-soft rounded-lg px-3 py-2">
                  Feedback: {r.feedback.working || r.feedback.explore}{" "}
                  <Link href={`/p/${r.feedback.project_id}#feedback`}>View</Link>
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {r.project && r.project.status === "published" && (
                  <form action={setRemoved}>
                    <input type="hidden" name="project_id" value={r.project.id} />
                    <input type="hidden" name="value" value="1" />
                    <button className="btn btn-sm bg-danger-tint text-danger">Remove project</button>
                  </form>
                )}
                <form action={resolveReport}>
                  <input type="hidden" name="report_id" value={r.id} />
                  <button className="btn btn-sm btn-outline">Mark resolved</button>
                </form>
              </div>
              {r.feedback && <p className="m-0 hint">To remove feedback, open the project and use Delete on that feedback.</p>}
            </article>
          ))}
        </section>

        <section aria-labelledby="proj-h" className="card p-5 flex flex-col gap-3">
          <div className="flex justify-between items-baseline flex-wrap gap-3">
            <h2 id="proj-h" className="m-0 text-lg font-semibold">{show === "removed" ? "Removed projects" : "Recent projects"}</h2>
            <Link href={show === "removed" ? "/admin" : { pathname: "/admin", query: { show: "removed" } }} className="text-sm font-semibold">
              {show === "removed" ? "Show published" : "Show removed"}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line">Project</th>
                  <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line">Artist</th>
                  <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line text-right">Appreciations</th>
                  <th scope="col" className="py-2.5 px-2 font-semibold border-b border-line"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-2 border-b border-[#EEEDE9]">
                      <div className="flex gap-2.5 items-center">
                        <span className="w-10 h-[30px] rounded-md overflow-hidden shrink-0"><Cover id={p.id} path={p.cover_path} /></span>
                        <Link href={`/p/${p.id}`} className="text-ink font-semibold no-underline">{p.title}</Link>
                        {p.featured && <span className="chip bg-saffron text-ink text-xs">Featured</span>}
                      </div>
                    </td>
                    <td className="py-3 px-2 border-b border-[#EEEDE9]">{p.owner?.display_name}</td>
                    <td className="py-3 px-2 border-b border-[#EEEDE9] text-right">{countOf(p.appreciations)}</td>
                    <td className="py-3 px-2 border-b border-[#EEEDE9]">
                      <div className="flex gap-2 justify-end">
                        {p.status === "published" && (
                          <form action={setFeatured}>
                            <input type="hidden" name="project_id" value={p.id} />
                            <input type="hidden" name="value" value={p.featured ? "0" : "1"} />
                            <button className={`btn btn-sm ${p.featured ? "btn-outline" : "btn-dark"}`}>{p.featured ? "Unfeature" : "Feature"}</button>
                          </form>
                        )}
                        <form action={setRemoved}>
                          <input type="hidden" name="project_id" value={p.id} />
                          <input type="hidden" name="value" value={p.status === "removed" ? "0" : "1"} />
                          <button className="btn btn-sm btn-outline">{p.status === "removed" ? "Restore" : "Remove"}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
