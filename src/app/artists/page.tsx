import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINES } from "@/lib/constants";
import { Avatar } from "@/components/Avatar";
import { ArtFormIcon } from "@/components/ArtForm";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const discipline = (DISCIPLINES as readonly string[]).includes(d ?? "") ? d! : null;
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id,username,display_name,avatar_path,banner_color,headline,disciplines,available_for,location")
    .eq("role", "artist")
    .eq("artist_status", "approved");
  if (discipline) query = query.contains("disciplines", [discipline]);
  const { data } = await query.order("display_name").limit(200);
  const artists = (data ?? []) as Profile[];

  return (
    <main className="page max-w-[1400px] pt-14 pb-24 flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Artists</span>
        <h1 className="m-0 font-display font-black text-[clamp(44px,6vw,88px)] leading-[0.92] tracking-[-0.05em]">Meet the <span className="serif-accent text-accent">artists.</span></h1>
        <p className="m-0 text-lg text-body max-w-[560px]">The painters, musicians, performers, calligraphers and filmmakers of our community.</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {[null, ...DISCIPLINES].map((x) => (
          <Link
            key={x ?? "all"}
            href={x ? { pathname: "/artists", query: { d: x } } : "/artists"}
            aria-current={x === discipline ? "page" : undefined}
            className={`btn btn-sm text-sm ${x === discipline ? "btn-primary" : "btn-outline font-semibold"}`}
          >
            {x ?? "All"}
          </Link>
        ))}
      </div>
      {artists.length ? (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
          {artists.map((a) => (
            <Link key={a.id} href={`/a/${a.username}`} className="art-hover card p-5 flex gap-4 items-start no-underline text-ink hover:border-ink hover:text-ink transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(20,20,22,0.08)]">
              <Avatar person={a} size={56} />
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <span className="font-black text-[19px] tracking-[-0.02em]">{a.display_name}</span>
                {a.headline && <span className="text-sm text-body">{a.headline}</span>}
                {a.disciplines.length > 0 && <span className="text-[13px] text-muted">{a.disciplines.join(" · ")}</span>}
                {a.available_for.length > 0 && (
                  <span className="text-[13px] text-good font-medium">Available for {a.available_for.join(", ").toLowerCase()}</span>
                )}
              </div>
              {a.disciplines[0] && <ArtFormIcon discipline={a.disciplines[0]} size={52} />}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted">No artists here yet.</p>
      )}
    </main>
  );
}
