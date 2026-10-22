import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinForm } from "./JoinForm";
import { CheckIcon } from "@/components/Icons";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage() {
  if (await getViewer()) redirect("/dashboard");
  return (
    <main className="flex flex-wrap flex-1">
      <section className="flex-[1_1_420px] bg-accent text-white px-6 sm:px-16 py-12 flex flex-col justify-center gap-6">
        <h1 className="h-display m-0 text-[clamp(34px,4vw,52px)] leading-[1.05] max-w-[520px]">
          Your work deserves an audience that pays attention.
        </h1>
        <p className="m-0 text-[17px] leading-relaxed text-[#E4E2FB] max-w-[520px]">
          Share projects in any discipline, ask the community for feedback, and get discovered by people who care about art.
        </p>
        <ul className="m-0 p-0 list-none flex flex-col gap-2.5 text-[15px]">
          {[
            "Painting, performance, theatre, sound and more",
            "Feedback from peers, not likes from strangers",
            "Free for artists in our community",
          ].map((t) => (
            <li key={t} className="flex gap-2.5 items-center">
              <CheckIcon size={18} className="text-saffron" />
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
