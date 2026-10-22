import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
// Fonts are bundled with the app (no request to Google at build or run time).
import "@fontsource-variable/inter/wght.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SAC — Space for Arts and Culture", template: "%s · SAC" },
  description:
    "A community home where painters, performers, theatre makers and sound artists share their work, get real feedback and get discovered.",
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
        <footer className="border-t border-line bg-soft">
          <div className="page py-8 flex flex-wrap gap-4 justify-between items-center text-sm text-muted">
            <p className="m-0">SAC is run by and for our community of artists.</p>
            <p className="m-0">Artists keep full rights to everything they share.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
