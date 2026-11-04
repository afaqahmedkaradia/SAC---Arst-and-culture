import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinForm } from "./JoinForm";
import { CheckIcon } from "@/components/Icons";
import { StarOutline } from "@/components/Star";
import { ArtFormIcon, type ArtKind } from "@/components/ArtForm";

const KINDS: ArtKind[] = ["paint", "music", "dance", "callig", "theatre", "film", "sound", "photo"];
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage() {
  if (await getViewer()) redirect("/dashboard");
  return (
    <main className="flex flex-wrap flex-1">
      <section className="relative overflow-hidden flex-[1_1_420px] bg-night text-white px-6 sm:px-16 py-12 flex flex-col justify-center gap-6">
        <StarOutline size={620} stroke="#E8B54A" inner="#B00012" className="absolute -right-[240px] -bottom-[220px] animate-sac-spin-slow pointer-events-none" />
        <span className="eyebrow relative text-[#FF6B73]">Space for Arts &amp; Culture</span>
        <h1 className="relative m-0 font-display font-black text-[clamp(40px,5vw,72px)] leading-[0.95] tracking-[-0.05em] max-w-[560px]">
          Your art. <span className="serif-accent text-[#FF6B73]">Our stage.</span>
        </h1>
        <p className="relative m-0 text-[17px] leading-relaxed text-[#D2D1D6] max-w-[520px]">
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
        <div aria-hidden="true" className="relative art-live grid grid-cols-4 gap-3 max-w-[360px] pt-2">
          {KINDS.map((k, i) => (
            <span key={k} className={`bg-white p-1.5 aspect-square ${i % 2 ? "rounded-full" : "rounded-[18px]"}`}>
              <ArtFormIcon kind={k} size={72} className="w-full h-full" />
            </span>
          ))}
        </div>
      </section>
      <section className="flex-[1_1_480px] px-6 sm:px-16 py-12 flex items-center justify-center">
        <JoinForm />
      </section>
    </main>
  );
}
