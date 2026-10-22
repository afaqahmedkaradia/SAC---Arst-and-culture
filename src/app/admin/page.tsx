import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/viewer";
import { timeAgo } from "@/lib/constants";
import { countOf, type PersonLite, type Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { resolveReport, setArtistStatus, setFeatured, setRemoved } from "./actions";

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
      .select("id,reason,created_at,reporter:profiles!reports_reporter_id_fkey(id,username,display_name,avatar_path,banner_color),project:projects!reports_project_id_fkey(id,title,status),feedback(id,working,explore,project_id)")
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
  const reports = (reportsRes.data ?? []) as unknown as Rep[];
  const projects = (projectsRes.data ?? []) as unknown as Proj[];

  return (
    <main className="flex-1 bg-soft">
      <div className="page pt-8 pb-20 flex flex-col gap-6">
        <div>
          <h1 className="h-display m-0 text-[34px]">Curators</h1>
          <p className="m-0 mt-1.5 text-muted">Approve artists, feature work and handle reports.</p>
        </div>

        <section aria-labelledby="pending-h" className="card p-5 flex flex-col gap-3">
          <h2 id="pending-h" className="m-0 text-lg font-semibold">Artists waiting for approval · {pending.length}</h2>
          {pending.length === 0 && <p className="m-0 text-sm text-muted">No one is waiting.</p>}
          {pending.map((p) => (
            <article key={p.id} className="border-t border-[#EEEDE9] pt-4 flex flex-wrap gap-4 justify-between items-start">
              <div className="flex gap-3 items-start min-w-0">
                <Avatar person={p} size={44} />
                <div className="flex flex-col gap-1 min-w-0">
                  <Link href={`/a/${p.username}`} className="font-semibold text-ink no-underline">{p.display_name}</Link>
                  <span className="text-sm text-muted">{p.disciplines.join(" · ") || "No disciplines"} · joined {timeAgo(p.created_at)}</span>
                  {p.work_link ? (
                    <a href={external(p.work_link)} target="_blank" rel="noreferrer" className="text-sm break-all">{p.work_link}</a>
                  ) : (
                    <span className="text-sm text-muted">No link to their work</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <form action={setArtistStatus}>
                  <input type="hidden" name="profile_id" value={p.id} />
                  <input type="hidden" name="status" value="approved" />
                  <button className="btn btn-primary btn-sm">Approve</button>
                </form>
                <form action={setArtistStatus}>
                  <input type="hidden" name="profile_id" value={p.id} />
                  <input type="hidden" name="status" value="declined" />
                  <button className="btn btn-outline btn-sm">Decline</button>
                </form>
              </div>
            </article>
          ))}
        </section>

        <section aria-labelledby="reports-h" className="card p-5 flex flex-col gap-3">
          <h2 id="reports-h" className="m-0 text-lg font-semibold">Open reports · {reports.length}</h2>
          {reports.length === 0 && <p className="m-0 text-sm text-muted">Nothing reported.</p>}
          {reports.map((r) => (
            <article key={r.id} className="border-t border-[#EEEDE9] pt-4 flex flex-col gap-2">
              <div className="text-sm text-muted">
                Reported by {r.reporter?.display_name ?? "a member"} · {timeAgo(r.created_at)}
              </div>
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
