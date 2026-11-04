import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { LogoMark } from "@/components/Star";
// Fonts are bundled with the app (no request to Google at build or run time).
import "@fontsource/fraunces/latin-600-italic.css";
import "@fontsource-variable/mulish/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SAC — Space for Arts and Culture", template: "%s · SAC" },
  description:
    "Celebrating the creative voices of our Jamat: painters, musicians, performers, calligraphers and filmmakers from across the Ismaili community.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:p-2 focus:bg-white">
          Skip to content
        </a>
        <SiteHeader />
        <div id="main" className="flex-1 flex flex-col">
          {children}
        </div>
        <footer className="bg-cream text-body border-t border-line">
          <div aria-hidden="true" className="stripe" />
          <div className="page max-w-[1400px] py-12 flex flex-wrap gap-10 justify-between items-start">
            <div className="flex flex-col gap-3 max-w-[380px]">
              <span className="flex items-center gap-2.5">
                <LogoMark size={32} />
                <span className="font-black text-ink text-lg">SAC</span>
              </span>
              <p className="m-0 text-sm leading-relaxed">
                Space for Arts &amp; Culture celebrates the creative voices of the Ismaili community. Artists keep full rights to everything they share.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-16 gap-y-6 text-sm">
              <div className="flex flex-col gap-2">
                <span className="eyebrow before:hidden text-xs">Explore</span>
                <Link href="/explore" className="text-ink no-underline py-1">Work</Link>
                <Link href="/artists" className="text-ink no-underline py-1">Artists</Link>
                <Link href="/#art-forms" className="text-ink no-underline py-1">Art forms</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow before:hidden text-xs">Take part</span>
                <Link href="/join" className="text-ink no-underline py-1">Join SAC</Link>
                <Link href="/login" className="text-ink no-underline py-1">Log in</Link>
              </div>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
