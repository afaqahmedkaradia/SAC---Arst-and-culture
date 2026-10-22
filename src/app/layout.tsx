import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { StarMark } from "@/components/Star";
// Fonts are bundled with the app (no request to Google at build or run time).
import "@fontsource-variable/montserrat/wght.css";
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
        <footer className="bg-night text-[#B9CBBF]">
          <div aria-hidden="true" className="stripe" />
          <div className="page max-w-[1400px] py-10 flex flex-wrap gap-8 justify-between items-start">
            <div className="flex flex-col gap-3 max-w-[380px]">
              <span className="flex items-center gap-2.5">
                <StarMark size={28} />
                <span className="font-display font-black text-white text-lg">SAC</span>
              </span>
              <p className="m-0 text-sm leading-relaxed">
                Space for Arts &amp; Culture celebrates the creative voices of the Ismaili community. Artists keep full rights to everything they share.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-10 gap-y-3 font-display text-xs font-bold tracking-[0.14em] uppercase">
              <Link href="/explore" className="text-white no-underline py-2">Explore</Link>
              <Link href="/artists" className="text-white no-underline py-2">Artists</Link>
              <Link href="/join" className="text-white no-underline py-2">Join SAC</Link>
              <Link href="/login" className="text-white no-underline py-2">Log in</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
