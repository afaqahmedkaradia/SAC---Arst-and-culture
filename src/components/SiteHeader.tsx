import Form from "next/form";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SearchIcon } from "@/components/Icons";
import { LogoMark } from "@/components/Star";
import { getViewer, canDraft } from "@/lib/viewer";

const navLink = "text-ink no-underline py-3 hover:text-accent";
const navText = "text-[15px] font-bold";

export async function SiteHeader() {
  const viewer = await getViewer();
  const profile = viewer?.profile;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md backdrop-saturate-150 border-b border-line">
      <nav aria-label="Main" className="page max-w-[1400px] py-4 flex flex-wrap items-center gap-x-9 gap-y-3">
        <Link href="/" className="flex items-center gap-2.5 no-underline text-ink hover:text-ink" aria-label="SAC home">
          <LogoMark size={40} />
          <span className="flex flex-col leading-[1.05]">
            <span className="font-black text-xl tracking-[0.02em]">SAC</span>
            <span className="hidden sm:block text-xs font-semibold text-muted">Space for Arts &amp; Culture</span>
          </span>
        </Link>

        <div className={`order-last w-full sm:order-none sm:w-auto flex flex-wrap gap-x-8 ${navText}`}>
          <Link href="/explore" className={navLink}>Explore</Link>
          <Link href="/#art-forms" className={navLink}>Art forms</Link>
          <Link href="/artists" className={navLink}>Artists</Link>
          {profile?.is_admin && <Link href="/admin" className={navLink}>Curators</Link>}
        </div>

        <Form action="/explore" role="search" className="hidden md:flex flex-[1_1_200px] min-w-[170px] max-w-[380px] items-center gap-2 bg-cream border border-line rounded-full px-4 h-11">
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
                <Link href="/dashboard/projects/new" className="btn btn-primary text-sm">+ Share your work</Link>
              )}
              <Link href="/dashboard" aria-label="Your dashboard" className="no-underline">
                <Avatar person={profile} size={44} />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={`${navLink} ${navText}`}>Log in</Link>
              <Link href="/join" className="btn btn-primary">Join SAC</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
