import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { PROJECT_CARD_SELECT, countOf, type PersonLite, type Profile, type ProjectCard } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { StarOutline } from "@/components/Star";
import { CV_KINDS, LINK_PLATFORMS, mediaUrl, personColor, timeAgo, type ProfileLink } from "@/lib/constants";
import { Cover } from "@/components/Cover";
import { PinIcon } from "@/components/Icons";
import { ProjectGrid } from "@/components/ProjectCard";
import { ArtFormIcon } from "@/components/ArtForm";
import { toggleFollow } from "@/app/actions/social";
import { ContactButton, OwnerBanner, ShareButton, VerifiedMark } from "./ProfileClient";

type Tab = "work" | "about" | "words" | "credits" | "collections";
const TABS: Tab[] = ["work", "about", "words", "credits", "collections"];

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
const fmt = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString("en-CA"));

type Word = {
  id: string;
  working: string | null;
  created_at: string;
  project: { id: string; title: string } | null;
  author: PersonLite | null;
};

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

  const viewer = await getViewer();
  const isMe = viewer?.id === profile.id;
  const supabase = await createClient();
  const path = `/a/${profile.username}`;

  let projectsQuery = supabase.from("projects").select(PROJECT_CARD_SELECT + ",summary").eq("owner_id", profile.id);
  projectsQuery = isMe ? projectsQuery.neq("status", "removed") : projectsQuery.eq("status", "published");

  const [projectsRes, followersRes, appreciationsRes, responsesRes, followRes, creditsRes, collectionsRes, wordsRes, inquiriesRes] = await Promise.all([
    projectsQuery.order("published_at", { ascending: false, nullsFirst: true }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("artist_id", profile.id),
    supabase.from("appreciations").select("project_id, projects!inner(owner_id)", { count: "exact", head: true }).eq("projects.owner_id", profile.id),
    supabase.from("feedback").select("*", { count: "exact", head: true }).eq("author_id", profile.id),
    viewer && !isMe
      ? supabase.from("follows").select("artist_id").eq("follower_id", viewer.id).eq("artist_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("project_credits").select("project_id").eq("profile_id", profile.id),
    supabase
      .from("collections")
      .select("id,name,collection_items(project_id, projects(id,cover_path,status))")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("feedback")
      .select("id,working,created_at,project:projects!inner(id,title,owner_id,status),author:profiles(id,username,display_name,avatar_path,banner_color)")
      .eq("helpful", true)
      .eq("visibility", "public")
      .eq("projects.owner_id", profile.id)
      .eq("projects.status", "published")
      .not("working", "is", null)
      .order("created_at", { ascending: false })
      .limit(12),
    isMe
      ? supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("artist_id", profile.id).is("read_at", null)
      : Promise.resolve({ count: 0 }),
  ]);

  const projects = (projectsRes.data ?? []) as unknown as (ProjectCard & { summary: string | null })[];
  const published = projects.filter((p) => p.status === "published");
  const spotlight = published.find((p) => p.featured) ?? published[0] ?? null;
  const rest = projects.filter((p) => p.id !== spotlight?.id);
  const hasFeatured = published.some((p) => p.featured);
  const following = !!followRes.data;
  const words = ((wordsRes.data ?? []) as unknown as Word[]).filter((w) => w.working?.trim());
  const unread = inquiriesRes.count ?? 0;

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

  const showWork = isArtist || projects.length > 0;
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "work", label: "Work", show: showWork },
    { id: "about", label: "About", show: true },
    { id: "words", label: `Kind words · ${words.length}`, show: words.length > 0 },
    { id: "credits", label: `Credited on · ${credited.length}`, show: credited.length > 0 },
    { id: "collections", label: `Collections · ${collections.length}`, show: collections.length > 0 || !isArtist },
  ];
  const visible = tabs.filter((t) => t.show).map((t) => t.id);
  const requested = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : null;
  const tab: Tab = requested && visible.includes(requested) ? requested : visible[0];

  const color = personColor(profile.id, profile.banner_color);
  const coverSrc = mediaUrl(spotlight?.cover_path);
  const handle = profile.instagram?.replace(/^@/, "");
  // Links from settings; older profiles may still only have the website and Instagram fields.
  const links: ProfileLink[] = (profile.links ?? []).length
    ? profile.links
    : [
        ...(profile.website ? [{ platform: "website" as const, url: external(profile.website) }] : []),
        ...(handle ? [{ platform: "instagram" as const, url: `https://instagram.com/${handle}` }] : []),
      ];
  const linkedin = links.find((l) => l.platform === "linkedin");
  const cv = [...(profile.cv ?? [])].sort((a, b) => (b.year || "").localeCompare(a.year || ""));
  const stats = [
    { n: published.length, label: published.length === 1 ? "Project" : "Projects" },
    { n: appreciationsRes.count ?? 0, label: "Appreciations" },
    { n: followersRes.count ?? 0, label: "Followers" },
    isMe && isArtist ? { n: unread, label: unread === 1 ? "New message" : "New messages" } : { n: responsesRes.count ?? 0, label: "Responses shared" },
  ];

  const banner =
    isMe && profile.role === "artist"
      ? profile.artist_status === "pending"
        ? ({ kind: "pending", key: "pending" } as const)
        : isArtist && hasFeatured && spotlight
          ? ({ kind: "featured", key: `featured-${spotlight.id}`, projectId: spotlight.id, title: spotlight.title } as const)
          : isArtist
            ? ({ kind: "approved", key: `approved-${profile.id}` } as const)
            : null
      : null;

  return (
    <main className="flex-1">
      {banner && (
        <div className="page pt-5">
          <OwnerBanner banner={banner} inquiries={unread} />
        </div>
      )}

      {/* Cover */}
      <div className="page pt-5">
        <div aria-hidden="true" className="relative h-[220px] sm:h-[320px] rounded-[28px] overflow-hidden" style={{ background: color }}>
          {coverSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverSrc} alt="" className="w-full h-full object-cover" />
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_50%,rgba(0,0,0,0.35)_100%)]" />
            </>
          ) : (
            <StarOutline size={520} stroke="#E8B54A" inner="#FFFFFF" strokeWidth={0.7} className="absolute right-[6%] -top-[160px] opacity-70 animate-sac-spin-slow" />
          )}
          <StarOutline size={220} stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} className="absolute -right-10 -top-10 animate-sac-spin-slow" />
        </div>
      </div>

      {/* Identity */}
      <section className="page">
        <div className="relative pl-0 sm:pl-7 flex flex-wrap items-start gap-x-8 gap-y-4">
          <span className="relative -mt-[76px] rounded-full shadow-[0_12px_30px_rgba(20,20,22,0.18)]">
            <Avatar person={profile} size={152} ring />
          </span>
          <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-2 sm:pt-5">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
              <h1 className="m-0 font-black text-[clamp(34px,4vw,52px)] leading-none tracking-[-0.04em]">{profile.display_name}</h1>
              {isArtist && (
                <span className="inline-flex items-center gap-1.5 bg-good-tint text-good rounded-full py-1.5 pl-2 pr-3 text-[13px] font-black">
                  <VerifiedMark size={20} />
                  SAC approved artist
                </span>
              )}
              {hasFeatured && (
                <span className="inline-flex items-center gap-1.5 bg-gold-tint text-[#8A5A00] rounded-full py-1.5 px-3 text-[13px] font-black">★ Curator’s pick</span>
              )}
            </div>
            {profile.headline && <p className="m-0 text-lg leading-normal text-body max-w-[640px]">{profile.headline}</p>}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[15px] font-semibold text-muted">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5"><PinIcon size={15} />{profile.location}</span>
              )}
              <span>Member since {new Date(profile.created_at).toLocaleDateString("en-CA", { month: "long", year: "numeric" })}</span>
              {handle && <span>@{handle}</span>}
              {linkedin && (
                <a href={external(linkedin.url)} target="_blank" rel="noreferrer" className="text-muted">LinkedIn ↗</a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 sm:pt-6">
            {isMe ? (
              <>
                <Link href="/dashboard/settings" className="btn btn-outline border-ink">Edit profile</Link>
                <ShareButton className="btn btn-dark" />
              </>
            ) : (
              <>
                {viewer ? (
                  <form action={toggleFollow}>
                    <input type="hidden" name="artist_id" value={profile.id} />
                    <input type="hidden" name="on" value={following ? "1" : "0"} />
                    <input type="hidden" name="path" value={path} />
                    <button className={`btn border-ink ${following ? "btn-dark" : "btn-outline"}`} aria-pressed={following}>
                      {following ? "✓ Following" : "+ Follow"}
                    </button>
                  </form>
                ) : (
                  <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn btn-outline border-ink">+ Follow</Link>
                )}
                {isArtist && (
                  <ContactButton
                    artistId={profile.id}
                    artistName={profile.display_name}
                    path={path}
                    email={viewer?.email ?? ""}
                    loggedIn={!!viewer}
                    className="btn btn-primary"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <dl className="m-0 mt-8 grid border border-line rounded-[20px] bg-cream overflow-hidden" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))" }}>
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-0.5 px-5 py-4 border-l border-line -ml-px">
              <dt className="text-sm font-semibold text-muted">{s.label}</dt>
              <dd className="m-0 text-[30px] font-black tracking-[-0.03em]">{fmt(s.n)}</dd>
            </div>
          ))}
        </dl>

        <nav aria-label="Profile sections" className="mt-7 flex gap-x-8 border-b-[1.5px] border-line overflow-x-auto">
          {tabs.filter((t) => t.show).map((t) => (
            <Link
              key={t.id}
              href={{ pathname: path, query: { tab: t.id } }}
              aria-current={t.id === tab ? "page" : undefined}
              className={`py-4 min-h-11 whitespace-nowrap no-underline text-base font-extrabold border-b-[3px] -mb-[1.5px] ${
                t.id === tab ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </section>

      <div className="page pt-9 pb-24 flex flex-wrap gap-10 items-start">
        <section className="flex-[999_1_640px] min-w-0 flex flex-col gap-9">
          {tab === "work" && (
            <>
              {spotlight ? (
                <div className="flex flex-wrap gap-7 items-stretch bg-cream rounded-[26px] p-4">
                  <Link href={`/p/${spotlight.id}`} className="relative block flex-[1_1_320px] min-w-0 aspect-[4/5] max-h-[560px] rounded-[18px] overflow-hidden group">
                    <span className="block w-full h-full transition-transform duration-700 group-hover:scale-105">
                      <Cover id={spotlight.id} path={spotlight.cover_path} />
                    </span>
                    {spotlight.featured && (
                      <span className="absolute left-3.5 top-3.5 bg-gold text-ink rounded-full py-1.5 px-3 text-xs font-black tracking-[0.06em] uppercase">★ Featured by SAC</span>
                    )}
                  </Link>
                  <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-4 justify-center p-3">
                    <span className="eyebrow before:hidden">{spotlight.featured ? "Curator’s pick" : "Latest project"} · {spotlight.discipline}</span>
                    <h2 className="m-0 font-black text-[clamp(32px,3.4vw,48px)] leading-none tracking-[-0.04em]">{spotlight.title}</h2>
                    {spotlight.summary && <p className="m-0 text-base leading-relaxed text-body">{spotlight.summary}</p>}
                    {spotlight.featured && (
                      <div className="bg-white rounded-[18px] px-5 py-4 border-l-4 border-good flex items-center gap-2.5 text-sm font-extrabold text-good">
                        <VerifiedMark size={20} />
                        Approved and featured by SAC curators
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 items-center">
                      <Link href={`/p/${spotlight.id}`} className="btn btn-dark">View project</Link>
                      <span className="text-sm font-bold text-muted">♥ {countOf(spotlight.appreciations)} appreciations</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-baseline gap-3">
                  <h3 className="m-0 text-2xl font-black tracking-[-0.02em]">{spotlight ? "All work" : "Work"}</h3>
                  {isMe && <Link href="/dashboard/projects/new" className="font-extrabold text-sm py-2">+ Add a project</Link>}
                </div>
                {rest.length ? (
                  <ProjectGrid projects={rest} showOwner={false} />
                ) : (
                  <p className="m-0 text-muted">
                    {isMe ? (
                      spotlight ? "Your other projects will appear here." : <>No projects yet. <Link href="/dashboard/projects/new">Share your first one</Link>.</>
                    ) : spotlight ? (
                      "More work coming soon."
                    ) : (
                      "No projects yet."
                    )}
                  </p>
                )}
              </div>
            </>
          )}

          {tab === "about" && (
            <div className="max-w-[760px] flex flex-col gap-8">
              {profile.bio ? (
                <div className="prose-sac">
                  {profile.bio.split(/\n{2,}/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line">{p}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted m-0">{isMe ? <>Add a bio in <Link href="/dashboard/settings">your profile settings</Link>.</> : "No bio yet."}</p>
              )}
              {profile.disciplines.length > 0 && (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
                  <div className="bg-cream rounded-[18px] p-5 flex flex-col gap-2">
                    <span className="eyebrow before:hidden text-xs">Art forms</span>
                    <span className="text-base font-bold">{profile.disciplines.join(", ")}</span>
                  </div>
                  {profile.available_for.length > 0 && (
                    <div className="bg-cream rounded-[18px] p-5 flex flex-col gap-2">
                      <span className="eyebrow before:hidden text-xs">Available for</span>
                      <span className="text-base font-bold">{profile.available_for.join(", ")}</span>
                    </div>
                  )}
                </div>
              )}
              {cv.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="m-0 text-2xl font-black tracking-[-0.02em]">CV and recognition</h2>
                  <ul className="m-0 p-0 list-none flex flex-col">
                    {cv.map((e, i) => (
                      <li key={i} className="flex flex-wrap gap-x-6 gap-y-1 py-3.5 border-b border-line">
                        <span className="w-16 shrink-0 font-black text-accent">{e.year}</span>
                        <span className="flex-1 min-w-[200px] flex flex-col">
                          <span className="font-bold">{e.title}</span>
                          <span className="text-sm text-muted">{[CV_KINDS.find((k) => k.id === e.kind)?.label, e.place].filter(Boolean).join(" · ")}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "words" && (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
              {words.map((w) => (
                <figure key={w.id} className="m-0 bg-cream rounded-[22px] p-6 flex flex-col gap-4">
                  {w.project && (
                    <Link href={`/p/${w.project.id}`} className="eyebrow before:hidden text-xs no-underline">On “{w.project.title}”</Link>
                  )}
                  <blockquote className="m-0 serif-accent text-xl leading-snug whitespace-pre-line">“{w.working}”</blockquote>
                  <figcaption className="flex items-center gap-2.5 text-[15px] font-extrabold">
                    {w.author && <Avatar person={w.author} size={36} />}
                    {w.author ? (
                      <Link href={`/a/${w.author.username}`} className="text-ink no-underline">{w.author.display_name}</Link>
                    ) : (
                      "A member"
                    )}
                    <span className="font-semibold text-muted">· {timeAgo(w.created_at)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {tab === "credits" && <ProjectGrid projects={credited} />}

          {tab === "collections" &&
            (collections.length ? (
              <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))" }}>
                {collections.map((c) => (
                  <Link key={c.id} href={`/c/${c.id}`} className="flex flex-col gap-2.5 no-underline text-ink">
                    <span aria-hidden="true" className="grid grid-cols-2 gap-1 aspect-[4/3] rounded-2xl overflow-hidden bg-soft">
                      {[0, 1, 2, 3].map((i) => {
                        const item = c.items[i]?.projects;
                        return (
                          <span key={i} className="block overflow-hidden bg-soft">
                            {item && <Cover id={item.id} path={item.cover_path} />}
                          </span>
                        );
                      })}
                    </span>
                    <span className="font-extrabold">{c.name}</span>
                    <span className="text-sm text-muted -mt-1.5">{c.items.length} projects</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted m-0">{isMe ? "Save projects you love from any project page." : "No collections yet."}</p>
            ))}
        </section>

        {/* Sidebar */}
        <aside className="flex-[1_1_300px] max-w-full lg:max-w-[340px] min-w-0 flex flex-col gap-4">
          {profile.disciplines.length > 0 && (
            <div className="border-[1.5px] border-line rounded-[22px] p-5 flex flex-col gap-3">
              <span className="eyebrow before:hidden text-xs">Art forms</span>
              {profile.disciplines.map((d) => (
                <Link
                  key={d}
                  href={{ pathname: "/artists", query: { d } }}
                  className="art-hover flex items-center gap-3 no-underline text-ink font-extrabold text-base hover:text-accent"
                >
                  <ArtFormIcon discipline={d} size={48} />
                  {d}
                </Link>
              ))}
            </div>
          )}

          {isArtist && (
            <div className="border-[1.5px] border-line rounded-[22px] p-5 flex flex-col gap-3.5">
              <span className="eyebrow before:hidden text-xs">Available for</span>
              {profile.available_for.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.available_for.map((a) => (
                    <span key={a} className="chip bg-good-tint text-good font-extrabold text-sm py-2 px-3.5">● {a}</span>
                  ))}
                </div>
              ) : (
                <span className="text-[15px] text-muted">
                  {isMe ? <>Tell people what you’re open to in <Link href="/dashboard/settings">settings</Link>.</> : "Get in touch to ask."}
                </span>
              )}
              {isMe ? (
                <span className="text-sm text-muted">
                  {unread > 0 ? `${unread} new ${unread === 1 ? "message" : "messages"} · ` : ""}
                  <Link href="/dashboard" className="font-extrabold">Open your dashboard</Link>
                </span>
              ) : (
                <ContactButton
                  artistId={profile.id}
                  artistName={profile.display_name}
                  path={path}
                  email={viewer?.email ?? ""}
                  loggedIn={!!viewer}
                  className="btn btn-dark w-full"
                  label={`Get in touch with ${profile.display_name.split(" ")[0]}`}
                />
              )}
            </div>
          )}

          {links.length > 0 && (
            <div className="border-[1.5px] border-line rounded-[22px] p-5 flex flex-col gap-1">
              <span className="eyebrow before:hidden text-xs mb-1.5">Find {profile.display_name.split(" ")[0]} online</span>
              {links.map((l, i) => (
                <a key={i} href={external(l.url)} target="_blank" rel="noreferrer" className="flex justify-between font-extrabold text-[15px] no-underline py-1.5">
                  {LINK_PLATFORMS.find((p) => p.id === l.platform)?.label ?? "Link"} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          )}

          {isArtist && (
            <div className="relative overflow-hidden bg-night text-white rounded-[22px] p-5 flex flex-col gap-2.5">
              <StarOutline size={160} stroke="rgba(232,181,74,0.4)" strokeWidth={1.4} className="absolute -right-10 -bottom-12" />
              <span className="text-xs font-extrabold tracking-[0.14em] uppercase text-gold">Part of SAC</span>
              <span className="text-xl font-black tracking-[-0.02em]">Approved by our curators</span>
              <span className="text-sm leading-normal text-[#C9C8CE]">
                Every artist on SAC is welcomed by community curators, who feature standout work across our platforms.
              </span>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
