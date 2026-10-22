import Form from "next/form";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SearchIcon } from "@/components/Icons";
import { getViewer, canDraft } from "@/lib/viewer";

export async function SiteHeader() {
  const viewer = await getViewer();
  const profile = viewer?.profile;

  return (
    <header className="border-b border-line bg-white">
      <nav aria-label="Main" className="page py-3.5 flex flex-wrap items-center gap-x-7 gap-y-3.5">
        <Link href="/" className="flex items-center gap-2.5 no-underline text-ink hover:text-ink">
          <span className="w-10 h-10 rounded-[10px] bg-accent text-white flex items-center justify-center font-display font-bold text-sm">
            SAC
          </span>
          <span className="font-display font-semibold text-[17px] hidden sm:inline">Space for Arts and Culture</span>
        </Link>

        <div className="flex gap-5 text-[15px] font-medium">
          <Link href="/" className="text-body no-underline">Discover</Link>
          <Link href="/artists" className="text-body no-underline">Artists</Link>
          {profile?.is_admin && (
            <Link href="/admin" className="text-body no-underline">Curators</Link>
          )}
        </div>

        <Form action="/" role="search" className="flex-[1_1_220px] min-w-[180px] flex items-center gap-2 bg-soft rounded-full px-4 h-11">
          <SearchIcon size={18} className="text-muted shrink-0" />
          <label htmlFor="site-search" className="sr-only">Search projects and artists</label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search projects, artists, tags"
            className="border-0 bg-transparent flex-1 min-w-0 text-[15px] text-ink outline-none"
          />
        </Form>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              {canDraft(profile) ? (
                <Link href="/dashboard/projects/new" className="btn btn-primary">Share your work</Link>
              ) : null}
              <Link href="/dashboard" aria-label="Your dashboard" className="no-underline">
                <Avatar person={profile} size={44} />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink no-underline font-medium text-[15px] px-2 py-3">Log in</Link>
              <Link href="/join" className="btn btn-primary">Join SAC</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
