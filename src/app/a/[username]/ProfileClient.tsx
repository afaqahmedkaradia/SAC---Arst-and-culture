"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InquiryForm } from "@/components/ProjectForms";

export function ShareButton({ className = "", label = "Share your page" }: { className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the person closed the share sheet */
    }
  };
  return (
    <button type="button" onClick={share} className={className}>
      <span aria-live="polite">{copied ? "✓ Link copied" : label}</span>
    </button>
  );
}

type Banner =
  | { kind: "featured"; key: string; projectId: string; title: string }
  | { kind: "approved"; key: string }
  | { kind: "pending"; key: string };

// Shown only to the profile's owner. Celebration banners can be dismissed;
// the dismissal is remembered in this browser per banner.
export function OwnerBanner({ banner, inquiries }: { banner: Banner; inquiries: number }) {
  const [hidden, setHidden] = useState(true);
  const storageKey = `sac-banner-${banner.key}`;
  useEffect(() => {
    try {
      setHidden(banner.kind !== "pending" && localStorage.getItem(storageKey) === "1");
    } catch {
      setHidden(false);
    }
  }, [storageKey, banner.kind]);
  if (hidden) return null;
  const close = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* storage unavailable */
    }
    setHidden(true);
  };

  if (banner.kind === "pending") {
    return (
      <div role="status" className="flex flex-wrap gap-4 items-center bg-gold-tint border-[1.5px] border-gold rounded-[20px] px-5 py-4">
        <span aria-hidden="true" className="text-3xl">◷</span>
        <div className="flex-[1_1_360px] flex flex-col gap-1">
          <span className="text-lg font-black">Your artist page is with our curators</span>
          <span className="text-[15px] text-body">
            Keep building your projects as drafts. You can publish them as soon as your page is approved.
          </span>
        </div>
        <Link href="/dashboard/projects/new" className="btn btn-dark">Add a project</Link>
      </div>
    );
  }

  const featured = banner.kind === "featured";
  return (
    <div role="status" className="relative flex flex-wrap gap-x-5 gap-y-4 items-center bg-good-tint border-[1.5px] border-good rounded-[20px] pl-5 pr-16 py-5 animate-sac-rise">
      <VerifiedMark size={52} />
      <div className="flex-[1_1_380px] flex flex-col gap-1">
        <span className="text-lg font-black">
          {featured ? <>Congratulations! Curators featured “{banner.title}”.</> : <>You’re an SAC approved artist. Your page is live.</>}
        </span>
        <span className="text-[15px] leading-normal text-[#2F4A3B]">
          {featured
            ? "It’s in Curator’s picks on the homepage and at the top of your page. Share it with your people."
            : "Everyone can now see your projects, follow you and get in touch. Share your page to get started."}
          {inquiries > 0 && (
            <>
              {" "}You have {inquiries} new {inquiries === 1 ? "message" : "messages"} waiting.{" "}
              <Link href="/dashboard" className="font-extrabold text-good">Open your dashboard</Link>
            </>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <ShareButton className="btn bg-good text-white hover:bg-[#165C39]" />
        {featured ? (
          <Link href={`/p/${banner.projectId}`} className="btn bg-white text-good border-good hover:text-good">See the project</Link>
        ) : (
          <Link href="/dashboard/projects/new" className="btn bg-white text-good border-good hover:text-good">+ Share new work</Link>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="absolute right-3 top-3 w-11 h-11 rounded-full border-0 bg-transparent cursor-pointer text-2xl text-[#2F4A3B] hover:bg-white/60"
      >
        ×
      </button>
    </div>
  );
}

export function VerifiedMark({ size = 20, color = "#1F7A4D" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <g transform="translate(12 12)" fill={color}>
        <rect x="-8" y="-8" width="16" height="16" />
        <rect x="-8" y="-8" width="16" height="16" transform="rotate(45)" />
      </g>
      <path d="M8 12.2l2.6 2.6L16 9.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "Get in touch" opens a dialog with the inquiry form.
export function ContactButton({
  artistId,
  artistName,
  path,
  email,
  loggedIn,
  className = "",
  label = "Get in touch",
}: {
  artistId: string;
  artistName: string;
  path: string;
  email: string;
  loggedIn: boolean;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  if (!loggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={className}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-label={`Get in touch with ${artistName}`}
        className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100vh-40px)] rounded-[26px] border-0 p-0 backdrop:bg-[rgba(20,20,22,0.55)]"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="p-7 flex flex-col gap-5">
          <div className="flex justify-between items-start gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[26px] font-black tracking-[-0.03em]">Get in touch with {artistName}</span>
              <span className="text-[15px] text-muted">They’ll reply to you by email.</span>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="shrink-0 w-11 h-11 rounded-full border-0 bg-soft cursor-pointer text-2xl"
            >
              ×
            </button>
          </div>
          <InquiryForm artistId={artistId} artistName={artistName} path={path} email={email} />
        </div>
      </dialog>
    </>
  );
}
