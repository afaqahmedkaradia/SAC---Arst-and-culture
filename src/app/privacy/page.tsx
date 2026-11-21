import type { Metadata } from "next";
import { ContactLine, H2, PolicyPage } from "@/components/PolicyPage";
import { OPERATOR } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Privacy" title="Your privacy" updated="November 2026">
      <p className="m-0">{OPERATOR} operates SAC and is responsible for the personal information it holds. We collect only what we need to run SAC.</p>

      <H2>What we collect</H2>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        <li><b className="text-ink">Account details:</b> your name, email address and password (stored encrypted).</li>
        <li><b className="text-ink">Community connection (artists):</b> the Jamatkhana you attend, your country of birth and the country you live in, and, if you choose, details of an Ismaili family member. This is private: only SAC curators see it, and only to confirm artist accounts. It never appears on your profile.</li>
        <li><b className="text-ink">What you choose to share:</b> your profile, links, CV, photo and projects. These are public.</li>
        <li><b className="text-ink">Activity:</b> who you follow, what you appreciate and save, responses you write, and messages you send to artists.</li>
      </ul>

      <H2>How we use it</H2>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        <li>To run your account, show your work and deliver messages between members and artists.</li>
        <li>To review artist applications and keep SAC safe.</li>
        <li>To email you about your account, such as a curator&apos;s decision or a new message. We only send news or promotions if you agree to receive them, and every such email has an unsubscribe link.</li>
      </ul>
      <p className="m-0">We do not sell your information. When you message an artist, they receive your name and email so they can reply.</p>

      <H2>Where it is kept</H2>
      <p className="m-0">SAC uses trusted service providers to host the site, store data and send email. They may store information outside Canada, and they may only use it to provide their service to us.</p>

      <H2>Your choices</H2>
      <p className="m-0">You can edit your profile at any time, and remove projects and responses. To see, correct or delete your information, or to close your account, contact <ContactLine />.</p>
    </PolicyPage>
  );
}
