import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer, canDraft } from "@/lib/viewer";
import { initials, mediaUrl, personColor } from "@/lib/constants";
import type { PersonLite } from "@/lib/types";
import { StarMark, StarOutline } from "@/components/Star";
import { DisciplineTiles, FeaturedSwitcher, Pillars, type FeaturedItem } from "@/components/landing/LandingClient";

const MARQUEE = ["Painting", "Music", "Theatre", "Dance", "Calligraphy", "Film", "Poetry", "Sound"];
const MARQUEE_STAR = ["#F1C85D", "#6BCFA5", "#F1C85D", "#FFFFFF"];

const SHOWCASES = [
  { name: "Exhibitions", text: "Curated shows in community and partner spaces.", color: "#007041" },
  { name: "Performances", text: "Concerts, theatre and dance at community events.", color: "#98111D" },
  { name: "Publications", text: "Features in community magazines and newsletters.", color: "#B98A16" },
  { name: "Online", text: "Spotlights across social and video channels.", color: "#19A29C" },
];

const FRAMES = [
  "999px 999px 20px 20px",
  "20px",
  "20px 20px 999px 999px",
  "999px",
];

type ProjectRow = {
  id: string;
  title: string;
  discipline: string;
  cover_path: string | null;
  owner: { display_name: string; username: string } | null;
};
type Artist = PersonLite & { headline: string | null; disciplines: string[] };

export default async function HomePage() {
  const supabase = await createClient();
  const viewer = await getViewer();

  const select = "id,title,discipline,cover_path,owner:profiles!projects_owner_id_fkey(display_name,username)";
  const [featuredRes, latestRes, artistsRes] = await Promise.all([
    supabase.from("projects").select(select).eq("status", "published").eq("featured", true).order("published_at", { ascending: false }).limit(6),
    supabase.from("projects").select(select).eq("status", "published").order("published_at", { ascending: false }).limit(6),
    supabase
      .from("profiles")
      .select("id,username,display_name,avatar_path,banner_color,headline,disciplines")
      .eq("role", "artist")
      .eq("artist_status", "approved")
      .order("avatar_path", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const featuredRows = ((featuredRes.data?.length ? featuredRes.data : latestRes.data) ?? []) as unknown as ProjectRow[];
  const featured: FeaturedItem[] = featuredRows
    .filter((p) => p.owner)
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      title: p.title,
      discipline: p.discipline,
      cover_path: p.cover_path,
      artist: p.owner!.display_name,
      username: p.owner!.username,
    }));
  const artists = (artistsRes.data ?? []) as Artist[];
  const shareHref = viewer ? (canDraft(viewer.profile) ? "/dashboard/projects/new" : "/dashboard") : "/join";

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="page max-w-[1400px] pt-8 pb-16 flex flex-wrap gap-10 items-end">
        <div className="flex-[1_1_560px] min-w-0 flex flex-col gap-7 animate-sac-rise">
          <span className="eyebrow">Space for Arts &amp; Culture</span>
          <div className="relative">
            <h1 className="m-0 font-display font-black text-[clamp(64px,10.4vw,158px)] leading-[0.9] tracking-[-0.055em]">
              The art
              <br />
              of our
              <br />
              <span className="text-accent">Jamat.</span>
            </h1>
            <Link
              href="/artists"
              aria-label="Meet the artists"
              className="absolute hidden sm:block w-[132px] h-[132px]"
              style={{ left: "clamp(250px, 33vw, 480px)", top: "clamp(34px, 5vw, 70px)" }}
            >
              <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden="true" className="absolute inset-0 animate-sac-spin">
                <defs>
                  <path id="sac-ring" d="M66,66 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
                </defs>
                <text fill="#007041" fontFamily="'Montserrat Variable', sans-serif" fontWeight="800" fontSize="10.5" letterSpacing="2.6">
                  <textPath href="#sac-ring">MEET THE ARTISTS • MEET THE ARTISTS • </textPath>
                </text>
              </svg>
              <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" className="absolute left-[46px] top-[46px]">
                <g transform="translate(20 20)">
                  <rect x="-10" y="-10" width="20" height="20" fill="#F1C85D" />
                  <rect x="-10" y="-10" width="20" height="20" fill="#F1C85D" transform="rotate(45)" />
                </g>
                <path d="M15 25 25 15M17 15h8v8" fill="none" stroke="#141414" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </Link>
          </div>
          <p className="m-0 max-w-[470px] text-[19px] leading-relaxed text-body">
            Painters, musicians, performers, calligraphers and filmmakers from across the community, celebrated and shared with everyone who should know their work.
          </p>
          <div className="flex flex-wrap gap-6 items-center">
            <Link href="/explore" className="btn btn-primary min-h-[54px] px-8">Discover the work</Link>
            <Link href={shareHref} className="font-display font-bold text-[15px] text-ink py-3 underline underline-offset-[6px] decoration-2 decoration-gold">
              Share your work
            </Link>
          </div>
        </div>
        <div className="flex-[1_1_480px] min-w-0 relative">
          <StarOutline size={560} className="absolute left-1/2 top-[46%] -ml-[300px] -mt-[280px] animate-sac-spin-slow pointer-events-none" />
          <FeaturedSwitcher items={featured} />
        </div>
      </section>

      {/* Marquee */}
      <div aria-hidden="true" className="bg-forest text-white overflow-hidden py-5">
        <div className="flex w-max animate-sac-marquee">
          {[...MARQUEE, ...MARQUEE].map((w, k) => (
            <span key={k} className="flex items-center gap-[30px] pr-[30px] font-display font-extrabold text-[30px] tracking-[-0.02em] uppercase whitespace-nowrap">
              {w}
              <StarMark size={22} fill={MARQUEE_STAR[k % MARQUEE_STAR.length]} center={MARQUEE_STAR[k % MARQUEE_STAR.length]} />
            </span>
          ))}
        </div>
      </div>

      <Pillars />

      {/* Disciplines */}
      <section id="disciplines" className="bg-white border-y border-line">
        <div className="page max-w-[1400px] py-24 flex flex-col gap-9">
          <div className="flex flex-wrap justify-between items-end gap-5">
            <h2 className="m-0 font-display font-black text-[clamp(44px,6vw,92px)] leading-[0.92] tracking-[-0.05em]">
              Every discipline.
              <br />
              <span className="text-accent">One stage.</span>
            </h2>
            <p className="m-0 max-w-[340px] text-base leading-relaxed text-body">
              Hover or tap to step inside. From the canvas to the concert hall, every form of making has a home here.
            </p>
          </div>
          <DisciplineTiles />
        </div>
      </section>

      {/* Spotlight */}
      {artists.length > 0 && (
        <section id="artists" className="page max-w-[1400px] py-24 flex flex-col gap-11">
          <div className="flex flex-wrap justify-between items-end gap-5">
            <div className="flex flex-col gap-3.5">
              <span className="eyebrow">In the spotlight</span>
              <h2 className="m-0 font-display font-black text-[clamp(40px,5vw,72px)] leading-[0.95] tracking-[-0.05em]">
                Artists we can&apos;t stop
                <br />
                talking about.
              </h2>
            </div>
            <Link href="/artists" className="font-display text-xs font-extrabold tracking-[0.14em] uppercase text-ink py-3">
              See all artists ↗
            </Link>
          </div>
          <div className="grid gap-x-6 gap-y-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))" }}>
            {artists.map((a, k) => {
              const photo = mediaUrl(a.avatar_path);
              return (
                <Link key={a.id} href={`/a/${a.username}`} className="flex flex-col gap-4 no-underline text-ink group">
                  <span
                    className="relative block aspect-[4/5] overflow-hidden"
                    style={{ borderRadius: FRAMES[k % FRAMES.length], background: personColor(a.id, a.banner_color) }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <>
                        <StarOutline size={260} stroke="#FFFFFF" strokeWidth={1} className="absolute left-1/2 top-1/2 -ml-[130px] -mt-[130px] opacity-30" />
                        <span className="absolute inset-0 flex items-center justify-center font-display font-black text-white text-[72px] tracking-[-0.04em]">
                          {initials(a.display_name)}
                        </span>
                      </>
                    )}
                  </span>
                  <span className="flex flex-col gap-1.5">
                    {a.disciplines.length > 0 && (
                      <span className="font-display text-[11px] font-extrabold tracking-[0.14em] uppercase text-accent">{a.disciplines.slice(0, 2).join(" · ")}</span>
                    )}
                    <span className="font-display text-2xl font-extrabold tracking-[-0.03em]">{a.display_name}</span>
                    {a.headline && <span className="text-[15px] leading-normal text-body">{a.headline}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Where artists are seen */}
      <section id="seen" className={`page max-w-[1400px] pb-28 ${artists.length > 0 ? "" : "pt-24"}`}>
        <div className="border-t-2 border-ink grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}>
          <div className="py-7 pr-7 flex flex-col gap-2.5">
            <span className="eyebrow">Where our artists are seen</span>
            <span className="font-display font-extrabold text-[26px] leading-tight tracking-[-0.03em]">Far beyond this site.</span>
          </div>
          {SHOWCASES.map((v, k) => (
            <div key={v.name} className="p-7 border-l border-line flex flex-col gap-2.5">
              <span className="font-display font-black text-[40px] tracking-[-0.05em]" style={{ color: v.color }}>0{k + 1}</span>
              <span className="font-display font-extrabold text-[19px]">{v.name}</span>
              <span className="text-[15px] leading-normal text-body">{v.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section id="join" className="bg-forest text-white relative overflow-hidden">
        <StarOutline
          size={760}
          stroke="#F1C85D"
          inner="#6BCFA5"
          className="absolute -right-[200px] top-1/2 -mt-[380px] animate-sac-spin-slow pointer-events-none"
        />
        <div className="page max-w-[1400px] py-32 relative flex flex-col gap-7">
          <h2 className="m-0 max-w-[900px] font-display font-black text-[clamp(52px,7.6vw,124px)] leading-[0.9] tracking-[-0.055em]">
            Your work deserves a <span className="text-gold">bigger stage.</span>
          </h2>
          <p className="m-0 max-w-[520px] text-[19px] leading-relaxed text-[#CFE6DA]">
            Create your artist page, share your projects and let the whole community, and everyone beyond it, see what you make.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link href={shareHref} className="btn bg-gold text-ink hover:bg-white hover:text-ink min-h-[56px] px-8">
              {viewer ? "Share your work" : "Join as an artist"}
            </Link>
            <Link href="/artists" className="btn border-white text-white hover:text-white min-h-[56px] px-8">
              Meet the artists
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
