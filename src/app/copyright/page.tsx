import type { Metadata } from "next";
import { ContactLine, H2, PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Copyright and takedowns" };

export default function CopyrightPage() {
  return (
    <PolicyPage eyebrow="Copyright" title="Copyright and takedowns" updated="November 2026">
      <H2>Artists keep their rights</H2>
      <p className="m-0">Everything you share on SAC stays yours. By sharing it, you give SAC permission to display it on SAC, to resize it and crop previews so it fits the page, and to promote it with your name on SAC and in community channels. You can remove your work at any time, and that permission ends when you do. SAC always shows your name with your work and never otherwise alters it.</p>

      <H2>If your work appears on SAC without permission</H2>
      <p className="m-0">Write to <ContactLine /> with:</p>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        <li>your name and contact details;</li>
        <li>the work you own, and how you own it;</li>
        <li>the address of the page on SAC where it appears;</li>
        <li>what the infringement is, and when and where it happened.</li>
      </ul>
      <p className="m-0">We forward valid notices to the person who uploaded the work, as Canadian copyright law requires, and let you know we did. Where work clearly copies yours without a credit or a &ldquo;study&rdquo; label, we will also hide it while we look into it.</p>

      <H2>If your work was hidden or removed</H2>
      <p className="m-0">Reply to the curators&apos; email with why you believe you have the right to share it, such as your own authorship, a licence or permission. A curator who was not involved in the first decision will review it.</p>

      <H2>Repeat cases</H2>
      <p className="m-0">Accounts that repeatedly share work they do not have the right to share will be closed.</p>
    </PolicyPage>
  );
}
