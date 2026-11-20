import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer, canDraft } from "@/lib/viewer";
import { initials, mediaUrl, personColor } from "@/lib/constants";
import { PROJECT_CARD_SELECT, type PersonLite, type ProjectCard as Card } from "@/lib/types";
import { ART_FORMS, ArtFormIcon, type ArtKind } from "@/components/ArtForm";
import { ProjectGrid } from "@/components/ProjectCard";
import { StarOutline } from "@/components/Star";
import { HeroArch } from "@/components/landing/LandingClient";
import { SubscribeForm } from "@/components/NewsletterForms";

type Artist = PersonLite & { headline: string | null; disciplines: string[]; location: string | null };

const CTA_KINDS: ArtKind[] = ["paint", "music", "dance", "callig", "theatre", "film", "sound", "photo"];
const CTA_SHAPES = ["rounded-[22px] -rotate-6", "rounded-full translate-y-4", "rounded-[22px] rotate-[5deg]", "rounded-full -translate-y-3", "rounded-full translate-y-2.5", "rounded-[22px] -rotate-[4deg] translate-y-6", "rounded-full", "rounded-[22px] rotate-[7deg] translate-y-4"];

function cityOf(location: string | null): string | null {
  const c = location?.split(",")[0]?.trim().toLowerCase();
  return c || null;
}

export default async function HomePage() {
  const supabase = await createClient();
  const viewer = await getViewer();

  const [featuredRes, latestRes, artistsRes, allArtistsRes] = await Promise.all([
    supabase.from("projects").select(PROJECT_CARD_SELECT).eq("status", "published").eq("featured", true).order("published_at", { ascending: false }).limit(6),
    supabase.from("projects").select(PROJECT_CARD_SELECT).eq("status", "published").order("published_at", { ascending: false }).limit(6),
    supabase
      .from("profiles")
      .select("id,username,display_name,avatar_path,banner_color,headline,disciplines,location")
      .eq("role", "artist")
      .eq("artist_status", "approved")
      .order("avatar_path", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("profiles").select("disciplines,location").eq("role", "artist").eq("artist_status", "approved").limit(5000),
  ]);

  const hasFeatured = (featuredRes.data?.length ?? 0) > 0;
  const work = ((hasFeatured ? featuredRes.data : latestRes.data) ?? []) as unknown as Card[];
  const artists = (artistsRes.data ?? []) as Artist[];
  const all = (allArtistsRes.data ?? []) as { disciplines: string[]; location: string | null }[];

  const counts: Record<string, number> = {};
  for (const a of all) for (const d of a.disciplines ?? []) counts[d] = (counts[d] ?? 0) + 1;
  const cities = new Set(all.map((a) => cityOf(a.location)).filter(Boolean)).size;

  const shareHref = viewer ? (canDraft(viewer.profile) ? "/dashboard/projects/new" : "/dashboard") : "/join";
  const marquee = ART_FORMS.map((a) => a.label);

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative bg-cream overflow-hidden">
        <StarOutline size={900} stroke="#EADFCB" strokeWidth={1.4} className="absolute -left-[380px] -top-[260px] animate-sac-spin-slow pointer-events-none hidden md:block" />
        <div className="page relative pt-12 pb-16 lg:pt-16 lg:pb-20 flex flex-wrap gap-12 items-center">
          <div className="flex-[1_1_480px] min-w-0 flex flex-col gap-6 animate-sac-rise">
            <span className="eyebrow">Space for Arts &amp; Culture</span>
            <h1 className="m-0 font-black text-[clamp(50px,6.2vw,90px)] leading-[0.98] tracking-[-0.045em]">
              Where every
              <br />
              art form <span className="serif-accent text-accent">takes</span>
              <br />
              <span className="serif-accent text-accent">the stage.</span>
            </h1>
            <p className="m-0 max-w-[480px] text-[19px] leading-relaxed text-body">
              Painters, musicians, dancers, calligraphers, theatre makers, filmmakers and sound artists of our community, celebrated together and shared with the world.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/artists" className="btn btn-dark min-h-[54px] px-7 text-base">Discover the artists</Link>
              <Link href={shareHref} className="btn btn-outline border-ink min-h-[54px] px-7 text-base">Showcase your work</Link>
            </div>
            {all.length > 0 && (
              <dl className="m-0 flex flex-wrap gap-8 pt-2">
                <div className="flex flex-col-reverse"><dt className="text-sm text-muted">artists</dt><dd className="m-0 text-3xl font-black tracking-[-0.03em]">{all.length}</dd></div>
                <div className="flex flex-col-reverse"><dt className="text-sm text-muted">art forms</dt><dd className="m-0 text-3xl font-black tracking-[-0.03em]">{ART_FORMS.length}</dd></div>
                {cities > 0 && (
                  <div className="flex flex-col-reverse"><dt className="text-sm text-muted">{cities === 1 ? "city" : "cities"}</dt><dd className="m-0 text-3xl font-black tracking-[-0.03em]">{cities}</dd></div>
                )}
              </dl>
            )}
          </div>
          <div className="flex-[1_1_520px] min-w-0">
            <HeroArch counts={counts} />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div aria-hidden="true" className="bg-accent text-white overflow-hidden">
        <div className="flex w-max animate-sac-marquee">
          {[...marquee, ...marquee].map((w, k) => (
            <span key={k} className="flex items-center gap-3.5 px-7 py-5 text-[26px] font-black tracking-[-0.02em] whitespace-nowrap">
              <StarOutline size={26} stroke="#FFD9A0" strokeWidth={4} />
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Art forms */}
      <section id="art-forms" className="page py-24 flex flex-col gap-10 scroll-mt-20">
        <div className="flex flex-wrap justify-between items-end gap-5">
          <div className="flex flex-col gap-2.5">
            <span className="eyebrow">Art forms</span>
            <h2 className="m-0 font-black text-[clamp(40px,4.6vw,64px)] leading-none tracking-[-0.04em]">
              Find your <span className="serif-accent text-accent">people.</span>
            </h2>
          </div>
          <p className="m-0 max-w-[380px] text-base leading-relaxed text-body">
            {ART_FORMS.length} art forms, one home. Pick one to meet the artists and see the work behind it.
          </p>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(270px, 100%), 1fr))" }}>
          {ART_FORMS.map((a) => {
            const n = counts[a.discipline] ?? 0;
            return (
              <Link
                key={a.discipline}
                href={{ pathname: "/explore", query: { d: a.discipline } }}
                className="art-hover group relative flex flex-col gap-2.5 p-6 rounded-[24px] bg-white border-[1.5px] border-line text-ink no-underline transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-ink hover:shadow-[0_22px_40px_rgba(20,20,22,0.10)] hover:text-ink"
              >
                <ArtFormIcon discipline={a.discipline} size={128} />
                <span className="text-[26px] font-black tracking-[-0.02em]">{a.label}</span>
                <span className="text-[15px] leading-normal text-body">{a.blurb}</span>
                <span className="flex justify-between items-center pt-2 text-sm font-extrabold">
                  <span>{n > 0 ? `${n} ${n === 1 ? "artist" : "artists"}` : "Be the first"}</span>
                  <span aria-hidden="true" className="text-accent text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Artists in the spotlight */}
      {artists.length > 0 && (
        <section id="artists" className="bg-cream">
          <div className="page py-24 flex flex-col gap-10">
            <div className="flex flex-wrap justify-between items-end gap-4">
              <div className="flex flex-col gap-2.5">
                <span className="eyebrow">In the spotlight</span>
                <h2 className="m-0 font-black text-[clamp(40px,4.6vw,64px)] leading-none tracking-[-0.04em]">
                  Artists in the <span className="serif-accent text-accent">spotlight.</span>
                </h2>
              </div>
              <Link href="/artists" className="font-extrabold text-[15px] py-2.5">All artists →</Link>
            </div>
            <div className="grid gap-x-6 gap-y-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(270px, 100%), 1fr))" }}>
              {artists.map((a) => {
                const photo = mediaUrl(a.avatar_path);
                const main = a.disciplines[0];
                return (
                  <Link key={a.id} href={`/a/${a.username}`} className="art-hover group flex flex-col gap-3.5 no-underline text-ink hover:text-ink">
                    <span
                      className="relative block aspect-[4/5] overflow-hidden"
                      style={{ borderRadius: "200px 200px 18px 18px", background: personColor(a.id, a.banner_color) }}
                    >
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <>
                          <StarOutline size={260} stroke="#FFFFFF" strokeWidth={1} className="absolute left-1/2 top-1/2 -ml-[130px] -mt-[130px] opacity-30" />
                          <span className="absolute inset-0 flex items-center justify-center font-black text-white text-[72px] tracking-[-0.04em]">
                            {initials(a.display_name)}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="shrink-0 w-[52px] h-[52px] rounded-full bg-white p-[3px] shadow-[0_6px_14px_rgba(20,20,22,0.10)]">
                        <ArtFormIcon discipline={main} size={46} className="w-full h-full" />
                      </span>
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-extrabold tracking-[0.12em] uppercase text-accent truncate">
                          {[main, cityOf(a.location) && a.location!.split(",")[0].trim()].filter(Boolean).join(" · ")}
                        </span>
                        <span className="text-[22px] font-black tracking-[-0.02em] truncate">{a.display_name}</span>
                      </span>
                    </span>
                    {a.headline && <span className="text-[15px] leading-normal text-body">{a.headline}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Work */}
      {work.length > 0 && (
        <section className="page py-24 flex flex-col gap-10">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-2.5">
              <span className="eyebrow">{hasFeatured ? "Curator’s picks" : "Just shared"}</span>
              <h2 className="m-0 font-black text-[clamp(40px,4.6vw,64px)] leading-none tracking-[-0.04em]">
                {hasFeatured ? (
                  <>Featured <span className="serif-accent text-accent">work.</span></>
                ) : (
                  <>New on <span className="serif-accent text-accent">SAC.</span></>
                )}
              </h2>
            </div>
            <Link href="/explore" className="font-extrabold text-[15px] py-2.5">Explore all work →</Link>
          </div>
          <ProjectGrid projects={work} />
        </section>
      )}

      {/* How it works */}
      <section id="how" className={`${work.length > 0 ? "bg-cream" : ""}`}>
        <div className="page py-24 flex flex-col gap-12">
          <div className="flex flex-col gap-2.5 items-center text-center">
            <span className="eyebrow">How SAC celebrates you</span>
            <h2 className="m-0 font-black text-[clamp(40px,4.6vw,64px)] leading-none tracking-[-0.04em]">
              From your studio to <span className="serif-accent text-accent">the spotlight.</span>
            </h2>
          </div>
          <ol className="m-0 p-0 list-none grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
            <li className="flex flex-col items-center text-center gap-3.5 px-5 py-3">
              <svg viewBox="0 0 160 140" width="190" height="166" aria-hidden="true"><ellipse cx="80" cy="128" rx="58" ry="7" fill="#EFE8DC" /><rect x="30" y="20" width="100" height="96" rx="10" fill="#FBE3E5" stroke="#141416" strokeWidth="3" /><rect x="42" y="32" width="76" height="52" rx="6" fill="#fff" stroke="#141416" strokeWidth="3" /><path d="M46 80l20-22 14 14 10-10 24 18" fill="none" stroke="#B00012" strokeWidth="3" strokeLinejoin="round" /><circle cx="98" cy="46" r="6" fill="#E8B54A" /><rect x="42" y="94" width="50" height="6" rx="3" fill="#141416" /><rect x="42" y="104" width="32" height="5" rx="2.5" fill="#C9C2B6" /><circle cx="124" cy="22" r="18" fill="#1F7A4D" stroke="#141416" strokeWidth="3" /><path d="M124 31V14m-7 7 7-7 7 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              <span className="text-[13px] font-black text-accent">STEP 1</span>
              <span className="text-[26px] font-black tracking-[-0.02em]">Share your work</span>
              <span className="text-base leading-normal text-body max-w-[320px]">Build a project with images, film, sound and words. Your page is made for your art form.</span>
            </li>
            <li className="flex flex-col items-center text-center gap-3.5 px-5 py-3">
              <svg viewBox="0 0 160 140" width="190" height="166" aria-hidden="true"><ellipse cx="80" cy="128" rx="58" ry="7" fill="#EFE8DC" /><path d="M58 84l-14 40 18-8 10 16 10-40z" fill="#B00012" stroke="#141416" strokeWidth="3" strokeLinejoin="round" /><path d="M102 84l14 40-18-8-10 16-10-40z" fill="#B00012" stroke="#141416" strokeWidth="3" strokeLinejoin="round" /><g transform="translate(80 60)"><rect x="-38" y="-38" width="76" height="76" fill="#E8B54A" stroke="#141416" strokeWidth="3" /><rect x="-38" y="-38" width="76" height="76" fill="#E8B54A" stroke="#141416" strokeWidth="3" transform="rotate(45)" /><circle r="30" fill="#fff" stroke="#141416" strokeWidth="3" /><path d="M-13 1l9 9 17-18" fill="none" stroke="#1F7A4D" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g></svg>
              <span className="text-[13px] font-black text-accent">STEP 2</span>
              <span className="text-[26px] font-black tracking-[-0.02em]">Curators approve it</span>
              <span className="text-base leading-normal text-body max-w-[320px]">SAC curators welcome you in and pick standout projects to feature.</span>
            </li>
            <li className="flex flex-col items-center text-center gap-3.5 px-5 py-3">
              <svg viewBox="0 0 160 140" width="190" height="166" aria-hidden="true"><path d="M44 8l-20 120h112L116 8z" fill="#FFF1D6" /><ellipse cx="80" cy="122" rx="56" ry="10" fill="#E8B54A" stroke="#141416" strokeWidth="3" /><rect x="64" y="4" width="32" height="18" rx="4" fill="#141416" /><circle cx="80" cy="74" r="10" fill="#141416" /><path d="M80 84v22M80 92l-14-8M80 92l14-12M80 106l-8 14M80 106l8 14" stroke="#141416" strokeWidth="4" strokeLinecap="round" /><path d="M30 40l-12-6M28 60H14M130 40l12-6M132 60h14" stroke="#B00012" strokeWidth="4" strokeLinecap="round" /></svg>
              <span className="text-[13px] font-black text-accent">STEP 3</span>
              <span className="text-[26px] font-black tracking-[-0.02em]">Take the spotlight</span>
              <span className="text-base leading-normal text-body max-w-[320px]">Featured on SAC, in community publications, at showcases and across social channels.</span>
            </li>
          </ol>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="page pt-20 scroll-mt-20">
        <div className="flex flex-wrap gap-10 items-start border-[1.5px] border-line rounded-[32px] bg-white px-7 sm:px-12 py-12">
          <div className="flex-[1_1_320px] flex flex-col gap-4">
            <span className="eyebrow">Newsletter</span>
            <h2 className="m-0 font-black text-[clamp(34px,3.6vw,52px)] leading-none tracking-[-0.04em]">
              Never miss an <span className="serif-accent text-accent">opening.</span>
            </h2>
            <p className="m-0 text-[17px] leading-relaxed text-body max-w-[420px]">
              Art events and showcases, work for sale, and residencies and grants, chosen by SAC&apos;s curators. Pick the topics you care about.
            </p>
          </div>
          <div className="flex-[1.4_1_420px] min-w-0">
            <SubscribeForm />
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section id="join" className="page py-20">
        <div className="relative bg-night text-white rounded-[32px] overflow-hidden px-7 sm:px-14 lg:px-[72px] py-12 sm:py-20 flex flex-wrap gap-10 items-center justify-between">
          <div className="relative flex-[1_1_460px] flex flex-col gap-5">
            <h2 className="m-0 font-black text-[clamp(40px,5vw,72px)] leading-[0.98] tracking-[-0.04em]">
              Your art. <span className="serif-accent text-[#FF6B73]">Our stage.</span>
            </h2>
            <p className="m-0 max-w-[460px] text-lg leading-relaxed text-[#D2D1D6]">
              Create your artist page in minutes. Once our curators approve it, the whole community can celebrate what you make.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={shareHref} className="btn btn-primary min-h-[54px] px-7 text-base">
                {viewer ? "Share your work" : "Join as an artist"}
              </Link>
              <Link href="/artists" className="btn border-white text-white hover:text-white hover:bg-white/10 min-h-[54px] px-7 text-base">
                Meet the artists
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="art-live relative flex-[0_1_440px] grid grid-cols-4 gap-3.5">
            {CTA_KINDS.map((k, i) => (
              <span key={k} className={`bg-white p-2 aspect-square ${CTA_SHAPES[i]}`}>
                <ArtFormIcon kind={k} size={96} className="w-full h-full" />
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
