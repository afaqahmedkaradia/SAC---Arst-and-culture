import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage({
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
    return { pathname: "/explore", query };
  };

  return (
    <main>
      {!q && (
        <section className="page max-w-[1400px] pt-14 pb-10 flex flex-wrap gap-8 items-end justify-between">
          <div className="max-w-[760px] flex flex-col gap-4">
            <span className="eyebrow">Explore</span>
            <h1 className="h-display m-0 text-[clamp(44px,6vw,88px)] leading-[0.92] tracking-[-0.05em] font-black">
              The work of <span className="text-accent">our artists.</span>
            </h1>
            <p className="m-0 text-lg leading-relaxed text-body max-w-[560px]">
              Painting, music, theatre, dance, calligraphy, film and more, from across the Ismaili community.
            </p>
          </div>
          {!viewer && (
            <div className="flex flex-wrap gap-3">
              <Link href="/join" className="btn btn-primary">Share your work</Link>
              <Link href="/artists" className="btn btn-outline">Meet the artists</Link>
            </div>
          )}
        </section>
      )}

      {q && (
        <section className="page max-w-[1400px] pt-12 pb-6">
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

      <section aria-label="Filters" className="page max-w-[1400px] flex flex-col gap-5">
        <div className="flex gap-7 border-b border-line overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={href({ tab: t.id })}
              aria-current={t.id === tab ? "page" : undefined}
              className={`py-3 min-h-11 whitespace-nowrap no-underline font-display text-sm border-b-[2.5px] ${
                t.id === tab ? "border-accent text-ink font-bold" : "border-transparent text-muted font-semibold"
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
              className={`btn btn-sm text-sm ${d === discipline ? "btn-primary" : "btn-outline font-semibold"}`}
            >
              {d ?? "All"}
            </Link>
          ))}
        </div>
      </section>

      <section className="page max-w-[1400px] pt-8 pb-24">
        {fellBack && (
          <p className="mt-0 mb-6 text-sm text-muted">Fresh from the community: the newest work while our curators choose this month's features.</p>
        )}
        {projects.length > 0 ? (
          <ProjectGrid projects={projects} />
        ) : (
          <div className="py-16 px-6 text-center text-muted text-base border-[1.5px] border-dashed border-line-strong rounded-2xl">
            {tab === "following" && !viewer ? (
              <>
                <Link href="/login?next=/explore?tab=following">Log in</Link> to see new work from artists you follow.
              </>
            ) : tab === "following" ? (
              <>Follow artists to see their new projects here. <Link href="/artists">Find artists</Link></>
            ) : q || discipline ? (
              "No projects match yet. Try another discipline or search."
            ) : (
              "The stage is set. The first works are on their way."
            )}
          </div>
        )}
      </section>
    </main>
  );
}
