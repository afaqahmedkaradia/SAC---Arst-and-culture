"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ART_FORMS, ArtFormIcon } from "@/components/ArtForm";
import { StarOutline } from "@/components/Star";
import { BASE_PATH } from "@/lib/env";

const SLIDES = ART_FORMS.filter((a) => a.photo);

// Where each art-form badge sits around the arch (left as % of the stage, top in px).
const BADGE_SPOTS: [string, number][] = [
  ["2%", 90],
  ["78%", 40],
  ["86%", 250],
  ["80%", 450],
  ["0%", 300],
  ["7%", 500],
  ["44%", 575],
];

const SLIDE_MS = 4500;

// Hero: a photo in an arch, ringed by illustrated art-form badges. It rotates on
// its own; picking a badge jumps to that art form and pauses the rotation briefly.
export function HeroArch({ counts }: { counts: Record<string, number> }) {
  const [i, setI] = useState(2);
  const [tick, setTick] = useState(0);
  const lastPick = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => {
      if (Date.now() - lastPick.current < 9000) return;
      setI((v) => (v + 1) % SLIDES.length);
      setTick((v) => v + 1);
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  const pick = (k: number) => {
    lastPick.current = Date.now();
    setI(k);
    setTick((v) => v + 1);
  };
  const cur = SLIDES[i];
  const n = counts[cur.discipline] ?? 0;

  return (
    <div className="relative w-full max-w-[600px] h-[520px] sm:h-[660px] mx-auto">
      <StarOutline
        size={520}
        stroke="#E8B54A"
        inner="#E8B54A"
        strokeWidth={0.6}
        className="absolute left-1/2 top-[60px] -ml-[260px] animate-sac-spin-slow pointer-events-none hidden sm:block"
      />
      <svg aria-hidden="true" viewBox="0 0 300 120" width="300" height="120" className="absolute right-0 top-0 hidden sm:block">
        <path d="M10 100C60 20 120 110 170 50S270 20 290 40" fill="none" stroke="#B00012" strokeWidth="6" strokeLinecap="round" />
      </svg>

      <Link
        href={{ pathname: "/explore", query: { d: cur.discipline } }}
        aria-label={`Explore ${cur.label.toLowerCase()}`}
        className="absolute left-1/2 top-[30px] sm:top-[50px] w-[280px] sm:w-[360px] -ml-[140px] sm:-ml-[180px] h-[440px] sm:h-[540px] overflow-hidden bg-night border-[6px] border-white shadow-[0_30px_60px_rgba(20,20,22,0.22)] block text-white no-underline hover:text-white"
        style={{ borderRadius: "180px 180px 24px 24px" }}
      >
        {SLIDES.map((s, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.discipline}
            src={`${BASE_PATH}/landing/${s.photo}.jpg`}
            alt={k === i ? s.photoAlt : ""}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: s.photoPos,
              opacity: k === i ? 1 : 0,
              transform: `scale(${k === i ? 1.05 : 1})`,
              transition: "opacity .9s ease, transform 6s ease",
            }}
            loading={k === 2 ? "eager" : "lazy"}
          />
        ))}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_55%,rgba(0,0,0,0.65)_100%)]" />
        <span className="absolute left-5 right-5 bottom-5 flex flex-col gap-0.5">
          <span aria-hidden="true" className="block h-[3px] rounded bg-white/30 overflow-hidden mb-2.5">
            <span key={tick} className="block h-full bg-gold origin-left animate-[sac-bar_4.5s_linear_both]" />
          </span>
          <span className="text-xs font-extrabold tracking-[0.12em] uppercase text-[#FFD9A0]">
            {n > 0 ? `${n} ${n === 1 ? "artist" : "artists"}` : "Art form"}
          </span>
          <span className="text-[22px] font-black tracking-[-0.02em]">Explore {cur.label.toLowerCase()} →</span>
        </span>
      </Link>

      <div role="group" aria-label="Choose an art form" className="[--badge-k:0.78] sm:[--badge-k:1]">
        {SLIDES.map((s, k) => {
          const on = k === i;
          return (
            <button
              key={s.discipline}
              type="button"
              onClick={() => pick(k)}
              aria-label={s.label}
              aria-pressed={on}
              className={`art-hover absolute w-[60px] h-[60px] sm:w-[78px] sm:h-[78px] rounded-full bg-white border-0 p-1.5 cursor-pointer transition-transform duration-300 hover:scale-110 ${
                on ? "art-live z-10 scale-110 shadow-[0_0_0_4px_#B00012,0_14px_28px_rgba(176,0,18,0.3)]" : "shadow-[0_10px_24px_rgba(20,20,22,0.14)]"
              }`}
              style={{ left: BADGE_SPOTS[k][0], top: `calc(${BADGE_SPOTS[k][1]}px * var(--badge-k))` }}
            >
              <ArtFormIcon discipline={s.discipline} size={66} className="w-full h-full" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
