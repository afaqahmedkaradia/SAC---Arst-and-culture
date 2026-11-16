import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, H2, PolicyPage } from "@/components/PolicyPage";
import { OPERATOR } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Terms" title="Terms of use" updated="November 2026">
      <p className="m-0">SAC, Space for Arts and Culture, is operated by {OPERATOR} (&ldquo;SAC&rdquo;, &ldquo;we&rdquo;). By creating an account you agree to these terms and to the <Link href="/guidelines">community guidelines</Link>.</p>

      <H2>Your account</H2>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        <li>Give accurate details and keep your password safe.</li>
        <li>Artist pages go live after a curator&apos;s review. Curators may approve, ask for changes, or decline an application.</li>
        <li>People under 18 need a parent or guardian&apos;s permission to have an account.</li>
      </ul>

      <H2>Your work</H2>
      <ul className="m-0 pl-6 list-disc flex flex-col gap-1.5">
        <li>You keep full ownership of everything you share. You give SAC the display and promotion permission described in our <Link href="/copyright">copyright policy</Link>.</li>
        <li>When you publish, you confirm that you made the work, that you have the right to share everything in it, and that its work type is accurate.</li>
        <li>You are responsible for what you share. If a claim is made against SAC because of something you shared without the right to, you agree to help resolve it and to cover the costs it causes.</li>
      </ul>

      <H2>What we may do</H2>
      <p className="m-0">We may hide or remove work, responses or accounts that break these terms or the guidelines, and we may change or pause the service. We will tell you when we remove your work and why.</p>

      <H2>Connections between members and artists</H2>
      <p className="m-0">SAC helps people find and contact artists. Any purchase, booking, commission or collaboration is an agreement between the people involved. SAC and the Ismaili Council for Canada are not a party to it and do not endorse or guarantee any artist, work or arrangement. A Curator&apos;s pick celebrates work; it is not an official endorsement. Views and works on SAC are the artists&apos; own.</p>

      <H2>Limits</H2>
      <p className="m-0">SAC is provided as it is, as a community service. To the extent the law allows, we are not responsible for losses that come from using it or from arrangements made through it.</p>

      <H2>Questions</H2>
      <p className="m-0">Contact <ContactLine />.</p>
    </PolicyPage>
  );
}
