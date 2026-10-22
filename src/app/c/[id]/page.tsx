import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { PROJECT_CARD_SELECT, type PersonLite, type ProjectCard } from "@/lib/types";
import { ProjectCard as Card } from "@/components/ProjectCard";
import { Avatar } from "@/components/Avatar";
import { deleteCollection, removeFromCollection } from "@/app/actions/social";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: col } = await supabase
    .from("collections")
    .select("id,name,owner:profiles(id,username,display_name,avatar_path,banner_color)")
    .eq("id", id)
    .maybeSingle();
  if (!col) notFound();
  const owner = (col as unknown as { owner: PersonLite }).owner;

  const { data: items } = await supabase
    .from("collection_items")
    .select(`added_at, project:projects(${PROJECT_CARD_SELECT})`)
    .eq("collection_id", id)
    .order("added_at", { ascending: false });
  const projects = ((items ?? []) as unknown as { project: ProjectCard | null }[])
    .map((i) => i.project)
    .filter((p): p is ProjectCard => !!p && p.status === "published");

  const viewer = await getViewer();
  const isMine = viewer?.id === owner.id;
  const path = `/c/${id}`;

  return (
    <main className="page pt-12 pb-20 flex flex-col gap-6">
      <div className="flex flex-wrap justify-between gap-4 items-end">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold tracking-[0.08em] uppercase text-accent">Collection</span>
          <h1 className="h-display m-0 text-[clamp(32px,4vw,48px)]">{col.name}</h1>
          <Link href={`/a/${owner.username}`} className="flex items-center gap-2 text-body no-underline font-medium">
            <Avatar person={owner} size={28} />
            {owner.display_name}
          </Link>
        </div>
        {isMine && (
          <form action={deleteCollection}>
            <input type="hidden" name="collection_id" value={id} />
            <button className="btn btn-outline btn-sm">Delete collection</button>
          </form>
        )}
      </div>
      {projects.length ? (
        <div className="grid gap-x-6 gap-y-9" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))" }}>
          {projects.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <Card p={p} />
              {isMine && (
                <form action={removeFromCollection}>
                  <input type="hidden" name="collection_id" value={id} />
                  <input type="hidden" name="project_id" value={p.id} />
                  <input type="hidden" name="path" value={path} />
                  <button className="text-sm text-muted underline bg-transparent border-0 p-0 cursor-pointer min-h-11">Remove from collection</button>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">Nothing saved here yet.</p>
      )}
    </main>
  );
}
