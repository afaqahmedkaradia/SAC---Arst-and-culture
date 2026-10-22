import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { PROJECT_CARD_SELECT, type Profile, type ProjectCard } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { PinIcon } from "@/components/Icons";
import { ProjectGrid } from "@/components/ProjectCard";
import { InquiryForm } from "@/components/ProjectForms";
import { toggleFollow } from "@/app/actions/social";

type Tab = "projects" | "credits" | "collections" | "about";

async function loadProfile(username: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  return data as Profile | null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const p = await loadProfile((await params).username);
  return p ? { title: p.display_name, description: p.headline ?? undefined } : { title: "Profile not found" };
}

const external = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();
  const sp = await searchParams;
  const isArtist = profile.role === "artist" && profile.artist_status === "approved";
  const defaultTab: Tab = isArtist ? "projects" : "collections";
  const tab: Tab = (["projects", "credits", "collections", "about"] as const).includes(sp.tab as Tab) ? (sp.tab as Tab) : defaultTab;

  const viewer = await getViewer();
  const isMe = viewer?.id === profile.id;
  const supabase = await createClient();
  const path = `/a/${profile.username}`;

  let projectsQuery = supabase.from("projects").select(PROJECT_CARD_SELECT).eq("owner_id", profile.id);
  if (!isMe) projectsQuery = projectsQuery.eq("status", "published");

  const [projectsRes, followersRes, appreciationsRes, feedbackRes, helpfulRes, followRes, creditsRes, collectionsRes] = await Promise.all([
    projectsQuery.order("published_at", { ascending: false, nullsFirst: true }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("artist_id", profile.id),
    supabase.from("appreciations").select("project_id, projects!inner(owner_id)", { count: "exact", head: true }).eq("projects.owner_id", profile.id),
    supabase.from("feedback").select("*", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("feedback").select("*", { count: "exact", head: true }).eq("author_id", profile.id).eq("helpful", true),
    viewer
      ? supabase.from("follows").select("artist_id").eq("follower_id", viewer.id).eq("artist_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("project_credits").select("project_id").eq("profile_id", profile.id),
    supabase
      .from("collections")
      .select("id,name,collection_items(project_id, projects(id,cover_path,status))")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  const projects = (projectsRes.data ?? []) as unknown as ProjectCard[];
  const following = !!followRes.data;

  const creditIds = [...new Set((creditsRes.data ?? []).map((c) => c.project_id))];
  let credited: ProjectCard[] = [];
  if (creditIds.length) {
    const { data } = await supabase
      .from("projects")
      .select(PROJECT_CARD_SELECT)
      .in("id", creditIds)
      .eq("status", "published")
      .neq("owner_id", profile.id);
    credited = (data ?? []) as unknown as ProjectCard[];
  }

  type Col = { id: string; name: string; collection_items: { project_id: string; projects: { id: string; cover_path: string | null; status: string } | null }[] };
  const collections = ((collectionsRes.data ?? []) as unknown as Col[]).map((c) => ({
    ...c,
    items: c.collection_items.filter((i) => i.projects && i.projects.status === "published"),
  }));

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "projects", label: `Projects · ${projects.length}`, show: isArtist || projects.length > 0 },
    { id: "credits", label: `Credited on · ${credited.length}`, show: credited.length > 0 },
    { id: "collections", label: `Collections · ${collections.length}`, show: true },
    { id: "about", label: "About", show: true },
  ];

  const banner = profile.banner_color;

  return (
    <main className="flex-1">
      <div aria-hidden="true" className="relative h-[200px] sm:h-[240px] overflow-hidden" style={{ background: banner }}>
        <span className="absolute w-[360px] h-[360px] rounded-full right-[12%] -top-[90px] opacity-90" style={{ background: "#F5B83D" }} />
        <span className="absolute w-full h-[60px] left-0 bottom-0 opacity-80" style={{ background: "#E8603C" }} />
      </div>

      <div className="page pb-20 flex flex-wrap gap-10 items-start">
        <aside className="flex-[1_1_300px] max-w-[380px] min-w-0 flex flex-col gap-5 -mt-16 relative">
          <Avatar person={profile} size={128} ring />
          <div className="flex flex-col gap-1.5">
            <h1 className="h-display m-0 text-4xl">{profile.display_name}</h1>
            {profile.headline && <p className="m-0 text-base text-body">{profile.headline}</p>}
            {profile.disciplines.length > 0 && <p className="m-0 text-sm text-muted">{profile.disciplines.join(" · ")}</p>}
            {profile.location && (
              <p className="m-0 text-sm text-muted flex items-center gap-1.5"><PinIcon size={15} />{profile.location}</p>
            )}
          </div>

          {profile.available_for.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-muted">Available for</span>
              <div className="flex flex-wrap gap-2">
                {profile.available_for.map((a) => (
                  <span key={a} className="chip bg-good-tint text-good">{a}</span>
                ))}
              </div>
            </div>
          )}

          {isMe ? (
            <Link href="/dashboard/settings" className="btn btn-outline">Edit profile</Link>
          ) : (
            <div className="flex gap-2.5 flex-wrap">
              <form action={toggleFollow} className="flex-[1_1_120px]">
                <input type="hidden" name="artist_id" value={profile.id} />
                <input type="hidden" name="on" value={following ? "1" : "0"} />
                <input type="hidden" name="path" value={path} />
                <button className={`btn w-full ${following ? "bg-soft text-ink" : "btn-primary"}`} aria-pressed={following}>
                  {following ? "Following" : "Follow"}
                </button>
              </form>
              {isArtist && (
                <a href="#contact" className="btn btn-outline border-ink flex-[1_1_120px]">Get in touch</a>
              )}
            </div>
          )}

          <dl className="m-0 grid grid-cols-3 gap-2 border-y border-line py-4">
            <div><dt className="text-[13px] text-muted">Projects</dt><dd className="m-0 mt-0.5 h-display text-[22px] font-semibold">{projects.filter((p) => p.status === "published").length}</dd></div>
            <div><dt className="text-[13px] text-muted">Appreciations</dt><dd className="m-0 mt-0.5 h-display text-[22px] font-semibold">{appreciationsRes.count ?? 0}</dd></div>
            <div><dt className="text-[13px] text-muted">Followers</dt><dd className="m-0 mt-0.5 h-display text-[22px] font-semibold">{followersRes.count ?? 0}</dd></div>
          </dl>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Feedback given</span>
            <p className="m-0 text-[15px]">{feedbackRes.count ?? 0} responses · {helpfulRes.count ?? 0} marked helpful</p>
          </div>

          {(profile.website || profile.instagram) && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-muted">Links</span>
              {profile.website && <a href={external(profile.website)} target="_blank" rel="noreferrer">{profile.website.replace(/^https?:\/\//, "")}</a>}
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">
                  Instagram @{profile.instagram.replace(/^@/, "")}
                </a>
              )}
            </div>
          )}
          <p className="m-0 text-[13px] text-muted">
            Member since {new Date(profile.created_at).toLocaleDateString("en-CA", { month: "long", year: "numeric" })}
          </p>

          {isArtist && !isMe && (
            <section id="contact" className="card p-5 flex flex-col gap-3">
              <h2 className="m-0 text-base font-semibold">Get in touch</h2>
              {viewer ? (
                <InquiryForm artistId={profile.id} artistName={profile.display_name} path={path} email={viewer.email ?? ""} />
              ) : (
                <Link href={`/login?next=${encodeURIComponent(path + "#contact")}`} className="btn btn-outline">Log in to send a message</Link>
              )}
            </section>
          )}
        </aside>

        <section className="flex-[999_1_640px] min-w-0 pt-7 flex flex-col gap-6">
          <div className="flex gap-7 border-b border-line overflow-x-auto">
            {tabs.filter((t) => t.show).map((t) => (
              <Link
                key={t.id}
                href={{ pathname: path, query: { tab: t.id } }}
                aria-current={t.id === tab ? "page" : undefined}
                className={`py-3 min-h-11 whitespace-nowrap no-underline text-[15px] border-b-[2.5px] ${
                  t.id === tab ? "border-ink text-ink font-semibold" : "border-transparent text-muted font-medium"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {tab === "projects" &&
            (projects.length ? (
              <ProjectGrid projects={projects} showOwner={false} />
            ) : (
              <p className="text-muted">
                {isMe ? <>No projects yet. <Link href="/dashboard/projects/new">Create your first one</Link>.</> : "No projects yet."}
              </p>
            ))}

          {tab === "credits" && <ProjectGrid projects={credited} />}

          {tab === "collections" &&
            (collections.length ? (
              <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))" }}>
                {collections.map((c) => (
                  <Link key={c.id} href={`/c/${c.id}`} className="flex flex-col gap-2.5 no-underline text-ink">
                    <span aria-hidden="true" className="grid grid-cols-2 gap-1 aspect-[4/3] rounded-xl overflow-hidden bg-soft">
                      {[0, 1, 2, 3].map((i) => {
                        const item = c.items[i]?.projects;
                        return (
                          <span key={i} className="block overflow-hidden bg-soft">
                            {item && <Cover id={item.id} path={item.cover_path} />}
                          </span>
                        );
                      })}
                    </span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-sm text-muted -mt-1.5">{c.items.length} projects</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted">{isMe ? "Save projects you love from any project page." : "No collections yet."}</p>
            ))}

          {tab === "about" && (
            <div className="max-w-[720px] flex flex-col gap-4">
              {profile.bio ? (
                <div className="prose-sac">
                  {profile.bio.split(/\n{2,}/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line">{p}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted">{isMe ? <>Add a bio in <Link href="/dashboard/settings">your profile settings</Link>.</> : "No bio yet."}</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
