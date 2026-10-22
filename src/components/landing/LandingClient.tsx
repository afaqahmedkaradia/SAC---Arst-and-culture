"use client";

import Link from "next/link";
import { useState } from "react";
import { Cover } from "@/components/Cover";
import { StarOutline } from "@/components/Star";

export type FeaturedItem = {
  id: string;
  title: string;
  discipline: string;
  cover_path: string | null;
  artist: string;
  username: string;
};

const ARCH = "999px 999px 24px 24px";

// Hero art: a tall arch showing a featured work, a floating caption card and a
// smaller arch that previews the next one. Click it to rotate the feature.
export function FeaturedSwitcher({ items }: { items: FeaturedItem[] }) {
  const [i, setI] = useState(0);
  if (items.length === 0) {
    return (
      <div className="relative h-[560px] lg:h-[640px]">
        <div className="absolute left-[6%] top-0 w-[64%] h-[92%] overflow-hidden bg-accent-tint" style={{ borderRadius: ARCH }}>
          <StarOutline size={420} stroke="#007041" inner="#F1C85D" strokeWidth={0.8} className="absolute left-1/2 top-1/2 -ml-[210px] -mt-[210px] animate-sac-spin-slow" />
        </div>
        <div className="absolute left-0 bottom-16 bg-white rounded-[18px] px-5 py-4 flex flex-col gap-1 shadow-[0_14px_34px_rgba(20,20,20,0.12)] animate-sac-float">
          <span className="font-display text-[11px] font-extrabold tracking-[0.14em] uppercase text-crimson">Coming soon</span>
          <span className="font-display text-[22px] font-extrabold tracking-[-0.02em]">Your work could be here</span>
          <Link href="/join" className="text-sm font-semibold">Share your work →</Link>
        </div>
      </div>
    );
  }
  const item = items[i % items.length];
  const next = items[(i + 1) % items.length];
  return (
    <div className="relative h-[560px] lg:h-[640px]">
      <Link
        href={`/p/${item.id}`}
        aria-label={`${item.title} by ${item.artist}`}
        className="absolute left-[6%] top-0 w-[64%] h-[92%] overflow-hidden block shadow-[0_30px_60px_rgba(0,83,47,0.16)]"
        style={{ borderRadius: ARCH }}
      >
        <Cover id={item.id} path={item.cover_path} />
      </Link>
      <div className="absolute left-0 bottom-16 bg-white rounded-[18px] px-5 py-4 flex flex-col gap-1 shadow-[0_14px_34px_rgba(20,20,20,0.12)] animate-sac-float min-w-[220px] max-w-[300px]">
        <span className="font-display text-[11px] font-extrabold tracking-[0.14em] uppercase text-crimson">
          Featured · {(i % items.length) + 1}/{items.length}
        </span>
        <Link href={`/a/${item.username}`} className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-ink no-underline">
          {item.artist}
        </Link>
        <span className="text-sm text-muted">
          {item.discipline} · “{item.title}”
        </span>
      </div>
      {items.length > 1 && (
        <button
          type="button"
          onClick={() => setI(i + 1)}
          aria-label={`Show the next featured work: ${next.title}`}
          className="absolute right-0 bottom-0 w-[150px] h-[200px] sm:w-[176px] sm:h-[236px] border-0 p-0 bg-transparent cursor-pointer"
        >
          <span className="absolute inset-0 overflow-hidden block border-[5px] border-paper" style={{ borderRadius: "999px 999px 18px 18px" }}>
            <Cover id={next.id} path={next.cover_path} />
          </span>
          <span className="absolute -left-4 top-1/2 -mt-6 w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

const PILLARS = [
  { name: "Spotlight", text: "Our curators feature artists on SAC and across the community’s platforms, so great work reaches the people who will love it.", cta: "See who’s featured", href: "/explore" },
  { name: "Showcase", text: "Every artist gets a portfolio page made for their discipline: canvases, stages, scores, sound and film.", cta: "Build your page", href: "/join" },
  { name: "Connect", text: "Collectors, venues, festivals and fellow artists reach you directly for sales, bookings and collaborations.", cta: "Meet the artists", href: "/artists" },
  { name: "Grow", text: "Coming next: residencies, grants and open calls created for artists in our community.", cta: "Join to hear first", href: "/join" },
];

export function Pillars() {
  const [p, setP] = useState(0);
  const active = PILLARS[p];
  return (
    <section id="what" className="page max-w-[1400px] py-24 lg:py-28 flex flex-wrap gap-14 items-center">
      <div className="flex-[1_1_520px] min-w-0 flex flex-col gap-6">
        <span className="eyebrow">What we do</span>
        <div role="tablist" aria-label="What SAC does" className="flex flex-col">
          {PILLARS.map((x, k) => (
            <button
              key={x.name}
              role="tab"
              type="button"
              aria-selected={k === p}
              onClick={() => setP(k)}
              onMouseEnter={() => setP(k)}
              className={`flex items-center gap-2 bg-transparent border-0 border-b border-line py-3.5 cursor-pointer text-left font-display font-black text-[clamp(40px,4.4vw,64px)] leading-none tracking-[-0.05em] min-h-11 transition-colors ${
                k === p ? "text-ink" : "text-[#C2C2BC]"
              }`}
            >
              <span className="text-sm font-bold tracking-[0.1em] w-11 text-crimson">0{k + 1}</span>
              <span className="flex-1">{x.name}</span>
              <span aria-hidden="true" className={`text-[34px] transition-all ${k === p ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}`}>→</span>
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" className="flex-[1_1_420px] min-w-0 relative bg-accent text-white rounded-[28px] p-10 lg:p-11 min-h-[380px] overflow-hidden flex flex-col justify-end gap-4">
        <StarOutline size={300} stroke="#F1C85D" strokeWidth={1.6} className="absolute -right-[60px] -top-[60px] animate-sac-spin" />
        <span className="font-display font-black text-[88px] leading-[0.9] tracking-[-0.05em] text-gold">0{p + 1}</span>
        <p className="m-0 font-display font-semibold text-2xl leading-snug max-w-[440px]">{active.text}</p>
        <Link href={active.href} className="self-start text-white font-display font-bold text-sm tracking-[0.08em] uppercase py-2.5 underline underline-offset-[6px] decoration-gold">
          {active.cta}
        </Link>
      </div>
    </section>
  );
}

const TILES = [
  { name: "Visual art", label: "Painting", bg: "#007041", fg: "#FFFFFF", text: "Oil, watercolour, murals and mixed media from studios across the community." },
  { name: "Music", label: "Music", bg: "#F1C85D", fg: "#141414", text: "Composers, vocalists and players, from qawwali and ghazal to jazz and electronic." },
  { name: "Theatre", label: "Theatre", bg: "#141414", fg: "#FFFFFF", text: "Devised work, drama and storytelling, from the first rehearsal to opening night." },
  { name: "Calligraphy", label: "Calligraphy", bg: "#98111D", fg: "#FFFFFF", text: "Letterforms and illumination carrying centuries of craft into today." },
  { name: "Dance", label: "Dance", bg: "#19A29C", fg: "#FFFFFF", text: "Classical, contemporary and cultural forms, on stage and on film." },
  { name: "Film", label: "Film", bg: "#EBF4F0", fg: "#00532F", text: "Shorts and documentaries telling our stories in our own words." },
  { name: "Sound", label: "Sound", bg: "#3A4B39", fg: "#F1C85D", text: "Sound design, field recordings and scores that make a space feel alive." },
];

export function DisciplineTiles() {
  const [d, setD] = useState(0);
  return (
    <div className="flex gap-2.5 h-[420px] overflow-x-auto">
      {TILES.map((t, k) => {
        const active = k === d;
        const style = { background: t.bg, color: t.fg };
        const base = "relative min-w-0 h-full rounded-[22px] p-6 overflow-hidden transition-[flex] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]";
        if (active) {
          return (
            <div key={t.name} className={`${base} flex-[5_1_380px]`} style={style}>
              <StarOutline size={220} stroke={t.fg} strokeWidth={1.4} className="absolute -right-[50px] -top-[50px] opacity-35" />
              <div className="relative flex flex-col justify-between h-full gap-4">
                <span className="font-display text-xs font-extrabold tracking-[0.14em]">0{k + 1}</span>
                <div className="flex flex-col gap-3">
                  <span className="font-display font-black text-[clamp(36px,4vw,56px)] leading-[0.95] tracking-[-0.04em]">{t.label}</span>
                  <span className="text-base leading-normal max-w-[360px]">{t.text}</span>
                  <Link
                    href={{ pathname: "/explore", query: { d: t.name } }}
                    className="font-display text-[13px] font-extrabold tracking-[0.1em] uppercase no-underline self-start py-2"
                    style={{ color: t.fg }}
                  >
                    Explore {t.label.toLowerCase()} ↗
                  </Link>
                </div>
              </div>
            </div>
          );
        }
        return (
          <button
            key={t.name}
            type="button"
            onMouseEnter={() => setD(k)}
            onFocus={() => setD(k)}
            onClick={() => setD(k)}
            aria-label={`Show ${t.label}`}
            className={`${base} flex-[1_0_70px] border-0 cursor-pointer`}
            style={style}
          >
            <span className="relative flex flex-col justify-between items-center h-full">
              <span className="font-display text-xs font-extrabold">0{k + 1}</span>
              <span className="[writing-mode:vertical-rl] rotate-180 font-display font-extrabold text-xl uppercase whitespace-nowrap">{t.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
