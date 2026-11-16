import type { Metadata } from "next";
import { H2, PolicyPage } from "@/components/PolicyPage";
import { WORK_TYPES } from "@/lib/constants";

export const metadata: Metadata = { title: "Community guidelines" };

export default function GuidelinesPage() {
  return (
    <PolicyPage eyebrow="Community guidelines" title="How we share and celebrate work" updated="November 2026">
      <p className="m-0">SAC is a place to celebrate the artists of our community. These guidelines keep it welcoming, honest and safe. Curators use them when they review artists and work.</p>

      <H2>Be honest about your work</H2>
      <p className="m-0">Studies, practice copies and covers are welcome. They are how many artists learn. What matters is that audiences know what they are looking at, so every project says what kind of work it is:</p>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        {WORK_TYPES.map((w) => (
          <li key={w.id}><b className="text-ink">{w.label}:</b> {w.hint}</li>
        ))}
      </ul>
      <p className="m-0">Studies, covers and “inspired by” work must name what they are based on. Studies, covers and AI-assisted work can be shown on SAC but not offered for sale. Passing off someone else&apos;s work as your own is not allowed. The first time, a curator will ask you to correct the label. Repeated or deliberate cases lead to removal and may close the account.</p>

      <H2>Only share what is yours to share</H2>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        <li>You made the work, or you are credited as one of its makers.</li>
        <li>Music, footage, photos and writing in your project are yours, or you have permission to use them.</li>
        <li>People who can be recognised in your photos and videos agreed to be shown. For anyone under 18, a parent or guardian agreed.</li>
      </ul>

      <H2>Respect our faith and our community</H2>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        <li>Treat sacred texts, religious imagery and images of the Imam with care and respect. Curators may ask for changes or remove work that does not.</li>
        <li>No hate, harassment or demeaning content about any person or group.</li>
        <li>No sexually explicit or graphically violent content.</li>
        <li>Be kind in responses and messages. Artists share work that matters to them.</li>
      </ul>

      <H2>What curators do</H2>
      <p className="m-0">Curators review every artist before their page goes live, using a published checklist: community connection, a real and reachable person, their own work, a complete profile, these guidelines, and rights and consent. Skill level is never a reason to decline. Curators may feature standout work as a Curator&apos;s pick. A pick celebrates the work; it is not an official endorsement by the Council.</p>

      <H2>Report a problem</H2>
      <p className="m-0">Every project has a &ldquo;Report this project&rdquo; link. Choose a reason, add any details, and a curator will look at it.</p>
    </PolicyPage>
  );
}
