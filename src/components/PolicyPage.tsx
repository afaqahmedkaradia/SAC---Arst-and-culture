import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR } from "@/lib/constants";

// Shared layout for SAC's policy pages. They are drafts until legal review is done.
export function PolicyPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="page max-w-[820px] pt-14 pb-24 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="m-0 font-black text-[clamp(40px,5vw,64px)] leading-[0.98] tracking-[-0.04em]">{title}</h1>
        <p className="m-0 text-sm text-muted">Operated by {OPERATOR} · Last updated {updated}</p>
        <p className="m-0 text-sm bg-gold-tint text-[#5C3B00] rounded-xl px-4 py-3">
          <b>Draft.</b> This policy is being reviewed by legal counsel and may change before SAC&apos;s public launch.
        </p>
      </div>
      <div className="policy flex flex-col gap-6 text-[17px] leading-relaxed text-body">{children}</div>
      <nav aria-label="Policies" className="flex flex-wrap gap-x-6 gap-y-2 text-sm border-t border-line pt-6">
        <Link href="/guidelines">Community guidelines</Link>
        <Link href="/copyright">Copyright and takedowns</Link>
        <Link href="/terms">Terms of use</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
    </main>
  );
}

export function ContactLine() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <>the SAC team (contact details will be published before launch)</>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="m-0 mt-2 text-[26px] font-black tracking-[-0.02em] text-ink">{children}</h2>;
}
