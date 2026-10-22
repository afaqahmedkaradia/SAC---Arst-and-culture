import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINES } from "@/lib/constants";
import { Avatar } from "@/components/Avatar";
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
    <main className="page pt-12 pb-20 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="h-display m-0 text-[clamp(34px,4vw,52px)]">Artists</h1>
        <p className="m-0 text-lg text-muted">The painters, performers, makers and sound artists of our community.</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {[null, ...DISCIPLINES].map((x) => (
          <Link
            key={x ?? "all"}
            href={x ? { pathname: "/artists", query: { d: x } } : "/artists"}
            aria-current={x === discipline ? "page" : undefined}
            className={`btn btn-sm text-sm ${x === discipline ? "btn-dark" : "btn-outline font-medium"}`}
          >
            {x ?? "All"}
          </Link>
        ))}
      </div>
      {artists.length ? (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
          {artists.map((a) => (
            <Link key={a.id} href={`/a/${a.username}`} className="card p-5 flex gap-4 items-start no-underline text-ink hover:border-ink">
              <Avatar person={a} size={56} />
              <div className="min-w-0 flex flex-col gap-1">
                <span className="font-semibold text-[17px]">{a.display_name}</span>
                {a.headline && <span className="text-sm text-body">{a.headline}</span>}
                {a.disciplines.length > 0 && <span className="text-[13px] text-muted">{a.disciplines.join(" · ")}</span>}
                {a.available_for.length > 0 && (
                  <span className="text-[13px] text-good font-medium">Available for {a.available_for.join(", ").toLowerCase()}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted">No artists here yet.</p>
      )}
    </main>
  );
}
