import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinForm } from "./JoinForm";
import { CheckIcon } from "@/components/Icons";
import { StarOutline } from "@/components/Star";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage() {
  if (await getViewer()) redirect("/dashboard");
  return (
    <main className="flex flex-wrap flex-1">
      <section className="relative overflow-hidden flex-[1_1_420px] bg-forest text-white px-6 sm:px-16 py-12 flex flex-col justify-center gap-6">
        <StarOutline size={620} stroke="#F1C85D" inner="#6BCFA5" className="absolute -right-[240px] -bottom-[220px] animate-sac-spin-slow pointer-events-none" />
        <span className="eyebrow relative text-gold">Space for Arts &amp; Culture</span>
        <h1 className="relative m-0 font-display font-black text-[clamp(40px,5vw,72px)] leading-[0.95] tracking-[-0.05em] max-w-[560px]">
          Step into the spotlight.
        </h1>
        <p className="relative m-0 text-[17px] leading-relaxed text-[#CFE6DA] max-w-[520px]">
          Create your artist page, share your work in any discipline, and let the whole community celebrate it with you.
        </p>
        <ul className="relative m-0 p-0 list-none flex flex-col gap-2.5 text-[15px]">
          {[
            "Painting, music, theatre, dance, calligraphy and more",
            "Featured by curators across our community’s platforms",
            "Free for artists in our community",
          ].map((t) => (
            <li key={t} className="flex gap-2.5 items-center">
              <CheckIcon size={18} className="text-gold" />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex-[1_1_480px] px-6 sm:px-16 py-12 flex items-center justify-center">
        <JoinForm />
      </section>
    </main>
  );
}
