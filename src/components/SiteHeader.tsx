import Form from "next/form";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SearchIcon } from "@/components/Icons";
import { StarMark } from "@/components/Star";
import { getViewer, canDraft } from "@/lib/viewer";

const navLink = "text-ink no-underline py-3 hover:text-accent";

export async function SiteHeader() {
  const viewer = await getViewer();
  const profile = viewer?.profile;

  return (
    <header className="bg-paper border-b border-line">
      <nav aria-label="Main" className="page max-w-[1400px] py-4 flex flex-wrap items-center gap-x-9 gap-y-3">
        <Link href="/" className="flex items-center gap-2.5 no-underline text-ink hover:text-ink" aria-label="SAC home">
          <StarMark size={34} />
          <span className="font-display font-black text-[22px] tracking-[-0.02em]">SAC</span>
        </Link>

        <div className="flex flex-wrap gap-x-8 font-display text-xs font-bold tracking-[0.14em] uppercase">
          <Link href="/explore" className={navLink}>Explore</Link>
          <Link href="/artists" className={navLink}>Artists</Link>
          {profile?.is_admin && <Link href="/admin" className={navLink}>Curators</Link>}
        </div>

        <Form action="/explore" role="search" className="flex-[1_1_200px] min-w-[170px] max-w-[420px] flex items-center gap-2 bg-white border border-line rounded-full px-4 h-11">
          <SearchIcon size={17} className="text-muted shrink-0" />
          <label htmlFor="site-search" className="sr-only">Search work and artists</label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search work and artists"
            className="border-0 bg-transparent flex-1 min-w-0 text-[15px] text-ink outline-none"
          />
        </Form>

        <div className="flex items-center gap-4 ml-auto">
          {profile ? (
            <>
              {canDraft(profile) && (
                <Link href="/dashboard/projects/new" className="btn btn-primary text-sm">Share your work</Link>
              )}
              <Link href="/dashboard" aria-label="Your dashboard" className="no-underline">
                <Avatar person={profile} size={44} />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={`${navLink} font-display text-xs font-bold tracking-[0.14em] uppercase`}>Log in</Link>
              <Link href="/join" className="btn btn-dark text-xs tracking-[0.14em] uppercase">
                Join SAC
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
