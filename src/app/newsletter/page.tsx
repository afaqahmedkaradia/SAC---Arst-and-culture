import type { Metadata } from "next";
import { SubscribeForm } from "@/components/NewsletterForms";

export const metadata: Metadata = { title: "Newsletter" };

export default function NewsletterPage() {
  return (
    <main className="page max-w-[820px] pt-14 pb-24 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">Newsletter</span>
        <h1 className="m-0 font-black text-[clamp(40px,5vw,64px)] leading-[0.98] tracking-[-0.04em]">
          Never miss an <span className="serif-accent text-accent">opening.</span>
        </h1>
        <p className="m-0 text-lg text-body max-w-[620px]">
          Hear about art events and showcases, work for sale, and opportunities like residencies and grants, straight from SAC&apos;s curators.
        </p>
      </div>
      <SubscribeForm />
    </main>
  );
}
