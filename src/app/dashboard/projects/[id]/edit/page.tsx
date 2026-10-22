import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, isApprovedArtist } from "@/lib/viewer";
import type { BlockKind } from "@/lib/constants";
import { ProjectEditor } from "../../ProjectEditor";
import { deleteProject, unpublishProject } from "../../actions";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/dashboard/projects/${id}/edit`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("*").eq("id", id).eq("owner_id", viewer.id).maybeSingle();
  if (!p) notFound();
  if (p.status === "removed") {
    return (
      <main className="page py-16 max-w-[640px]">
        <h1 className="h-display text-3xl">This project was removed by curators</h1>
        <p className="text-body">If you think this was a mistake, reply to the curators&apos; email or contact the SAC team.</p>
      </main>
    );
  }

  const [{ data: blocks }, { data: credits }] = await Promise.all([
    supabase.from("project_blocks").select("kind,text_body,media_path,url,caption").eq("project_id", id).order("position"),
    supabase.from("project_credits").select("name,role,person:profiles(username)").eq("project_id", id).order("position"),
  ]);

  return (
    <>
      <ProjectEditor
        userId={viewer.id}
        canPublish={isApprovedArtist(viewer.profile)}
        initial={{
          id: p.id,
          status: p.status,
          title: p.title,
          summary: p.summary,
          discipline: p.discipline,
          tags: p.tags ?? [],
          cover_path: p.cover_path,
          feedback_open: p.feedback_open,
          feedback_question: p.feedback_question,
          blocks: (blocks ?? []).map((b) => ({ ...b, kind: b.kind as BlockKind })),
          credits: ((credits ?? []) as unknown as { name: string; role: string | null; person: { username: string } | null }[]).map((c) => ({
            name: c.name,
            role: c.role,
            username: c.person?.username ?? "",
          })),
        }}
      />
      <section className="bg-soft">
        <div className="page pb-16 flex flex-wrap gap-3">
          {p.status === "published" && (
            <form action={unpublishProject}>
              <input type="hidden" name="project_id" value={p.id} />
              <button className="btn btn-outline btn-sm">Unpublish (back to draft)</button>
            </form>
          )}
          <form action={deleteProject}>
            <input type="hidden" name="project_id" value={p.id} />
            <button className="btn btn-sm bg-danger-tint text-danger">Delete project</button>
          </form>
        </div>
      </section>
    </>
  );
}
