import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { ChatIcon, ThumbIcon } from "@/components/Icons";
import { countOf, type ProjectCard as Card } from "@/lib/types";

export function ProjectCard({ p, showOwner = true }: { p: Card; showOwner?: boolean }) {
  const count = countOf(p.appreciations);
  return (
    <article className="flex flex-col gap-3">
      <Link
        href={`/p/${p.id}`}
        aria-label={`${p.title}${p.owner ? ` by ${p.owner.display_name}` : ""}`}
        className="block relative aspect-[4/3] rounded-xl overflow-hidden"
      >
        <Cover id={p.id} path={p.cover_path} />
        {p.featured && (
          <span className="chip absolute top-3 left-3 bg-saffron text-ink text-xs">Featured by SAC</span>
        )}
        {p.feedback_open && (
          <span className="chip absolute bottom-3 left-3 bg-white text-ink text-xs">
            <ChatIcon size={14} />
            Open for feedback
          </span>
        )}
        {p.status === "draft" && (
          <span className="chip absolute top-3 right-3 bg-white text-ink text-xs">Draft</span>
        )}
      </Link>
      <div className="flex justify-between gap-3 items-start">
        <div className="flex flex-col gap-1 min-w-0">
          <Link href={`/p/${p.id}`} className="text-ink no-underline font-semibold text-base truncate">
            {p.title}
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted flex-wrap">
            {showOwner && p.owner && (
              <>
                <Avatar person={p.owner} size={20} />
                <Link href={`/a/${p.owner.username}`} className="text-body no-underline font-medium">
                  {p.owner.display_name}
                </Link>
                <span>·</span>
              </>
            )}
            <span>{p.discipline}</span>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[13px] text-muted whitespace-nowrap pt-0.5">
          <ThumbIcon size={15} />
          <span className="sr-only">Appreciations:</span>
          {count}
        </span>
      </div>
    </article>
  );
}

export function ProjectGrid({ projects, showOwner = true }: { projects: Card[]; showOwner?: boolean }) {
  return (
    <div className="grid gap-x-6 gap-y-9" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))" }}>
      {projects.map((p) => (
        <ProjectCard key={p.id} p={p} showOwner={showOwner} />
      ))}
    </div>
  );
}
