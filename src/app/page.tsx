import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { DISCIPLINES } from "@/lib/constants";
import { PROJECT_CARD_SELECT, type PersonLite, type ProjectCard } from "@/lib/types";
import { ProjectGrid } from "@/components/ProjectCard";
import { Avatar } from "@/components/Avatar";

type Tab = "featured" | "following" | "new";
const TABS: { id: Tab; label: string }[] = [
  { id: "featured", label: "Featured by SAC" },
  { id: "following", label: "Following" },
  { id: "new", label: "New" },
];

// Strip characters that have meaning in Supabase filter syntax.
const clean = (q: string) => q.replace(/[%,()*\\:"']/g, " ").trim().slice(0, 80);

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; d?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "following" || sp.tab === "new" ? sp.tab : "featured";
  const discipline = (DISCIPLINES as readonly string[]).includes(sp.d ?? "") ? sp.d! : null;
  const q = clean(sp.q ?? "");
  const viewer = await getViewer();
  const supabase = await createClient();

  let followingIds: string[] | null = null;
  if (tab === "following" && viewer) {
    const { data } = await supabase.from("follows").select("artist_id").eq("follower_id", viewer.id);
    followingIds = (data ?? []).map((r) => r.artist_id);
  }

  const run = async (mode: Tab) => {
    let query = supabase.from("projects").select(PROJECT_CARD_SELECT).eq("status", "published");
    if (discipline) query = query.eq("discipline", discipline);
    if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,tags.cs.{${q.toLowerCase()}}`);
    if (mode === "featured") query = query.eq("featured", true);
    if (mode === "following") query = query.in("owner_id", followingIds?.length ? followingIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data } = await query.order("published_at", { ascending: false }).limit(60);
    return (data ?? []) as unknown as ProjectCard[];
  };

  let projects: ProjectCard[] = tab === "following" && !viewer ? [] : await run(tab);
  // Early on there may be nothing featured yet: show the newest work instead.
  let fellBack = false;
  if (tab === "featured" && projects.length === 0) {
    projects = await run("new");
    fellBack = projects.length > 0;
  }

  let artists: PersonLite[] = [];
  if (q) {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_path,banner_color")
      .eq("role", "artist")
      .eq("artist_status", "approved")
      .ilike("display_name", `%${q}%`)
      .limit(8);
    artists = (data ?? []) as PersonLite[];
  }

  const href = (next: Partial<{ tab: Tab; d: string | null }>) => {
    const query: Record<string, string> = {};
    const t = next.tab ?? tab;
    const d = next.d === undefined ? discipline : next.d;
    if (t !== "featured") query.tab = t;
    if (d) query.d = d;
    if (q) query.q = q;
    return { pathname: "/", query };
  };

  return (
    <main>
      {!q && (
        <section className="page pt-14 pb-9 flex flex-wrap gap-8 items-end justify-between">
          <div className="max-w-[760px] flex flex-col gap-4">
            <p className="m-0 text-sm font-semibold tracking-[0.08em] uppercase text-accent">A community home for every discipline</p>
            <h1 className="h-display m-0 text-[clamp(38px,5vw,64px)] leading-[1.04]">Show your work. Get real feedback. Get known.</h1>
            <p className="m-0 text-lg leading-relaxed text-muted">
              Painters, performers, theatre makers and sound artists from our community share their projects here, curated by people, not algorithms.
            </p>
          </div>
          {!viewer && (
            <div className="flex flex-wrap gap-3">
              <Link href="/join" className="btn btn-dark">Share your work</Link>
              <Link href="/artists" className="btn btn-outline">Meet the artists</Link>
            </div>
          )}
        </section>
      )}

      {q && (
        <section className="page pt-12 pb-6">
          <h1 className="h-display m-0 text-4xl">Results for “{q}”</h1>
          {artists.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {artists.map((a) => (
                <Link key={a.id} href={`/a/${a.username}`} className="flex items-center gap-2.5 border border-line rounded-full pl-1.5 pr-4 py-1.5 no-underline text-ink font-medium">
                  <Avatar person={a} size={32} />
                  {a.display_name}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-label="Filters" className="page flex flex-col gap-5">
        <div className="flex gap-7 border-b border-line overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={href({ tab: t.id })}
              aria-current={t.id === tab ? "page" : undefined}
              className={`py-3 min-h-11 whitespace-nowrap no-underline text-[15px] border-b-[2.5px] ${
                t.id === tab ? "border-ink text-ink font-semibold" : "border-transparent text-muted font-medium"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[null, ...DISCIPLINES].map((d) => (
            <Link
              key={d ?? "all"}
              href={href({ d })}
              aria-current={d === discipline ? "page" : undefined}
              className={`btn btn-sm text-sm ${d === discipline ? "btn-dark" : "btn-outline font-medium"}`}
            >
              {d ?? "All"}
            </Link>
          ))}
        </div>
      </section>

      <section className="page pt-8 pb-18">
        {fellBack && (
          <p className="mt-0 mb-6 text-sm text-muted">Nothing featured yet — here&apos;s the newest work from the community.</p>
        )}
        {projects.length > 0 ? (
          <ProjectGrid projects={projects} />
        ) : (
          <div className="py-16 px-6 text-center text-muted text-base border-[1.5px] border-dashed border-line-strong rounded-2xl">
            {tab === "following" && !viewer ? (
              <>
                <Link href="/login?next=/?tab=following">Log in</Link> to see new work from artists you follow.
              </>
            ) : tab === "following" ? (
              <>Follow artists to see their new projects here. <Link href="/artists">Find artists</Link></>
            ) : q || discipline ? (
              "No projects match yet. Try another discipline or search."
            ) : (
              "No projects yet. Be the first to share one."
            )}
          </div>
        )}
      </section>
    </main>
  );
}
