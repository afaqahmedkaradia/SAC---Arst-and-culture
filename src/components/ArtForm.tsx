// Illustrations for each art form, drawn in the SAC palette. They animate while an
// ancestor sets --play: running (see .art-hover and .art-live in globals.css).

const INK = "#141416";
const CRIMSON = "#B00012";
const GOLD = "#E8B54A";
const GREEN = "#1F7A4D";
const TEAL = "#19A29C";
const CREAM = "#FBF3E8";
const BLUSH = "#FBE3E5";
const SAND = "#FFF1D6";
const MINT = "#E6F2EB";

export type ArtKind =
  | "paint"
  | "music"
  | "dance"
  | "callig"
  | "theatre"
  | "film"
  | "sound"
  | "photo"
  | "writing"
  | "performance"
  | "other";

const BY_DISCIPLINE: Record<string, ArtKind> = {
  "Visual art": "paint",
  Painting: "paint",
  Music: "music",
  Dance: "dance",
  Calligraphy: "callig",
  Theatre: "theatre",
  Film: "film",
  Sound: "sound",
  Photography: "photo",
  Writing: "writing",
  Performance: "performance",
};

export function artKind(discipline: string | null | undefined): ArtKind {
  return (discipline && BY_DISCIPLINE[discipline]) || "other";
}

const s3 = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Art({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case "paint":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={BLUSH} />
          <path d="M58 24c-23 0-40 15-40 34 0 16 13 27 27 27 6 0 9-3 9-8 0-5 3-8 9-8h8c15 0 25-9 25-21 0-14-16-24-38-24z" fill="#fff" {...s3} />
          <circle cx="38" cy="50" r="6" fill={CRIMSON} />
          <circle cx="52" cy="38" r="6" fill={GOLD} />
          <circle cx="70" cy="37" r="6" fill={GREEN} />
          <circle cx="84" cy="49" r="6" fill={TEAL} />
          <circle cx="44" cy="68" r="6" fill={BLUSH} {...s3} />
          <g transform="rotate(32 92 70)">
            <g className="art-brush">
              <rect x="88" y="40" width="9" height="36" rx="4" fill={GOLD} {...s3} />
              <rect x="88" y="75" width="9" height="9" fill="#fff" {...s3} />
              <path d="M88 84c0 8 2 14 4.5 19 2.5-5 4.5-11 4.5-19z" fill={CRIMSON} {...s3} />
            </g>
          </g>
        </>
      );
    case "music":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={SAND} />
          <rect x="55" y="10" width="10" height="32" rx="2" fill={GOLD} {...s3} />
          <path d="M55 17h-7M55 25h-7M65 21h7M65 29h7" {...s3} fill="none" />
          <path d="M60 106c-15 0-24-10-24-23 0-10 6-17 13-21l3-20h16l3 20c7 4 13 11 13 21 0 13-9 23-24 23z" fill={CRIMSON} {...s3} />
          <circle cx="60" cy="86" r="11" fill={CREAM} {...s3} />
          <g className="art-strings">
            <path d="M57 14v84M60 14v84M63 14v84" stroke={INK} strokeWidth="1.3" />
          </g>
          <rect x="52" y="94" width="16" height="4" rx="1" fill={INK} />
          <g className="art-notes">
            <path d="M88 42V25l12-3v15" fill="none" {...s3} />
            <circle cx="85" cy="42" r="4.5" fill={INK} />
            <circle cx="97" cy="38" r="4.5" fill={INK} />
          </g>
          <g className="art-notes" style={{ animationDelay: ".5s" }}>
            <path d="M27 50V35" {...s3} />
            <ellipse cx="23.5" cy="51" rx="5" ry="4" fill={GREEN} />
          </g>
        </>
      );
    case "dance":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={BLUSH} />
          <ellipse className="art-dash" cx="60" cy="96" rx="48" ry="11" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="6 8" strokeLinecap="round" />
          <circle cx="60" cy="22" r="8" fill={INK} />
          <path d="M60 30v26" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path className="art-arm" d="M60 38c-8-4-16-12-20-24" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M60 38c10 4 20 6 31 1" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          <g className="art-skirt">
            <path d="M54 54h12l28 34c-20 10-48 10-68 0z" fill={CRIMSON} {...s3} />
            <path d="M27 89c20 9 46 9 66 0" stroke={GOLD} strokeWidth="5" fill="none" />
          </g>
          <path d="M53 98l-2 9M67 98l2 9" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "callig":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={MINT} />
          <path d="M18 72h26v24a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill={GREEN} {...s3} />
          <rect x="23" y="64" width="16" height="8" rx="1" fill={INK} />
          <path
            className="art-draw"
            d="M50 94c8-26 22-40 34-36 10 3 4 18-6 18-8 0-6-14 8-24 8-6 16-8 22-6"
            fill="none"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray="100"
          />
          <circle cx="98" cy="80" r="3.5" fill={GOLD} />
          <circle cx="90" cy="90" r="2.5" fill={GOLD} />
          <path d="M70 98l4-4 4 4-4 4z" fill={GOLD} />
          <g className="art-pen">
            <g transform="rotate(38 74 38)">
              <rect x="70" y="4" width="8" height="44" rx="2" fill={GOLD} {...s3} />
              <path d="M70 48l4 12 4-12z" fill={INK} />
            </g>
          </g>
        </>
      );
    case "theatre":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={SAND} />
          <path d="M14 18h92v7c-12 10-34 10-46 2-12 8-34 8-46-2z" fill={CRIMSON} {...s3} />
          <g className="art-m1">
            <g transform="translate(20 44) rotate(-12)">
              <path d="M0 0h36v18c0 18-9 28-18 28S0 36 0 18z" fill={GOLD} {...s3} />
              <path d="M7 14q4-5 8 0M21 14q4-5 8 0M9 27q9 10 18 0" fill="none" {...s3} />
            </g>
          </g>
          <g className="art-m2">
            <g transform="translate(62 50) rotate(12)">
              <path d="M0 0h36v18c0 18-9 28-18 28S0 36 0 18z" fill="#fff" {...s3} />
              <path d="M7 12q4 5 8 0M21 12q4 5 8 0M10 34q8-9 16 0" fill="none" {...s3} />
              <circle cx="9" cy="21" r="2.5" fill={CRIMSON} />
            </g>
          </g>
        </>
      );
    case "film":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={MINT} />
          <g className="art-reel">
            <circle cx="84" cy="34" r="20" fill={GOLD} {...s3} />
            <circle cx="84" cy="34" r="4" fill={INK} />
            <circle cx="84" cy="23" r="4.5" fill={CREAM} stroke={INK} strokeWidth="2" />
            <circle cx="93.5" cy="39.5" r="4.5" fill={CREAM} stroke={INK} strokeWidth="2" />
            <circle cx="74.5" cy="39.5" r="4.5" fill={CREAM} stroke={INK} strokeWidth="2" />
          </g>
          <rect x="18" y="58" width="66" height="42" rx="3" fill={INK} />
          <path d="M27 72h48M27 84h32" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
          <rect x="18" y="48" width="66" height="10" fill="#fff" {...s3} />
          <path d="M32 49l-6 8M48 49l-6 8M64 49l-6 8M80 49l-6 8" stroke={CRIMSON} strokeWidth="5" />
          <g className="art-clap">
            <path d="M18 46l64-14 2 10-64 14z" fill="#fff" {...s3} />
            <path d="M32 43l-4 9M48 39l-4 9M64 36l-4 9" stroke={CRIMSON} strokeWidth="5" />
          </g>
        </>
      );
    case "sound":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={BLUSH} />
          <path d="M30 62v-8a30 30 0 0 1 60 0v8" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <rect x="21" y="56" width="15" height="26" rx="7" fill={CRIMSON} {...s3} />
          <rect x="84" y="56" width="15" height="26" rx="7" fill={CRIMSON} {...s3} />
          {[
            [42, 14, GOLD, 0],
            [49.5, 26, GREEN, 0.15],
            [57, 36, CRIMSON, 0.3],
            [64.5, 22, GOLD, 0.45],
            [72, 30, GREEN, 0.2],
          ].map(([x, h, c, d]) => (
            <rect
              key={x as number}
              className="art-bar"
              style={{ animationDelay: `${d}s` }}
              x={x as number}
              y={84 - (h as number) / 2}
              width="5"
              height={h as number}
              rx="2.5"
              fill={c as string}
            />
          ))}
        </>
      );
    case "photo":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={SAND} />
          <path d="M44 44l6-11h20l6 11z" fill={INK} />
          <rect x="20" y="42" width="80" height="54" rx="8" fill={INK} />
          <circle cx="60" cy="69" r="18" fill={GOLD} stroke={CREAM} strokeWidth="4" />
          <circle cx="60" cy="69" r="8" fill={INK} />
          <circle cx="56" cy="65" r="3" fill="#fff" />
          <rect x="82" y="48" width="10" height="6" rx="2" fill={CRIMSON} />
          <g className="art-flash">
            <path d="M98 22l3 9M110 32l-9 2M88 18v9" stroke={CRIMSON} strokeWidth="4" strokeLinecap="round" />
          </g>
        </>
      );
    case "writing":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={MINT} />
          <path d="M22 40c12-6 26-6 38 2v58c-12-8-26-8-38-2z" fill="#fff" {...s3} />
          <path d="M98 40c-12-6-26-6-38 2v58c12-8 26-8 38-2z" fill={CREAM} {...s3} />
          <path d="M30 54c8-3 15-3 22 0M30 66c8-3 15-3 22 0M30 78c8-3 15-3 22 0M68 54c8-3 15-3 22 0M68 66c8-3 15-3 14 0" stroke="#9A968E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <g className="art-pen">
            <path d="M104 10C86 20 78 36 74 52l6-2c6-12 16-24 24-40z" fill={CRIMSON} {...s3} />
            <path d="M74 52l-3 9" {...s3} />
          </g>
        </>
      );
    case "performance":
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={SAND} />
          <path d="M40 10L20 104h80L80 10z" fill="#FFF8E8" />
          <ellipse cx="60" cy="100" rx="40" ry="8" fill={GOLD} {...s3} />
          <rect x="46" y="4" width="28" height="14" rx="4" fill={INK} />
          <g className="art-notes">
            <circle cx="60" cy="48" r="9" fill={INK} />
            <path d="M60 57v24M60 64l-14-6M60 64l16-12M60 81l-8 14M60 81l8 14" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
            <rect x="72" y="44" width="8" height="12" rx="4" fill={CRIMSON} {...s3} />
          </g>
          <path d="M22 40l-10-5M20 58H8M98 40l10-5M100 58h12" stroke={CRIMSON} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    default:
      return (
        <>
          <circle cx="60" cy="62" r="46" fill={BLUSH} />
          <g className="art-reel">
            <g transform="translate(60 62)">
              <rect x="-24" y="-24" width="48" height="48" fill={GOLD} {...s3} />
              <rect x="-24" y="-24" width="48" height="48" fill={GOLD} {...s3} transform="rotate(45)" />
              <circle r="11" fill={CRIMSON} {...s3} />
            </g>
          </g>
          <g className="art-flash">
            <path d="M22 26l4 8M98 26l-4 8M20 98l6-5M100 98l-6-5" stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
          </g>
        </>
      );
  }
}

export function ArtFormIcon({
  discipline,
  kind,
  size = 64,
  className = "",
  title,
}: {
  discipline?: string | null;
  kind?: ArtKind;
  size?: number;
  className?: string;
  title?: string;
}) {
  const k = kind ?? artKind(discipline);
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`shrink-0 overflow-visible ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <Art kind={k} />
    </svg>
  );
}

// The art forms shown on the homepage. `discipline` is the stored value used for filters.
export const ART_FORMS: { discipline: string; label: string; blurb: string; photo?: string; photoPos?: string; photoAlt?: string }[] = [
  { discipline: "Visual art", label: "Painting", blurb: "Oil, acrylic, watercolour, murals and mixed media.", photo: "painter", photoPos: "64% 40%", photoAlt: "A painter at work on a large crimson and gold canvas" },
  { discipline: "Music", label: "Music", blurb: "Rubab, tabla, vocals, composition and production.", photo: "musician", photoPos: "50% 30%", photoAlt: "A musician playing the rubab on stage" },
  { discipline: "Dance", label: "Dance", blurb: "Kathak, folk, contemporary and choreography.", photo: "dancer", photoPos: "50% 35%", photoAlt: "A Kathak dancer mid-spin" },
  { discipline: "Calligraphy", label: "Calligraphy", blurb: "Reed pen, ink, illumination and gold leaf.", photo: "calligraphy", photoPos: "50% 50%", photoAlt: "Hands making ink strokes with gold leaf" },
  { discipline: "Theatre", label: "Theatre", blurb: "Drama, devised work, spoken word and storytelling.", photo: "theatre", photoPos: "50% 55%", photoAlt: "Three actors performing under a spotlight" },
  { discipline: "Film", label: "Film", blurb: "Shorts, documentaries, music videos and animation.", photo: "filmmaker", photoPos: "55% 35%", photoAlt: "A filmmaker with a cinema camera on a city street" },
  { discipline: "Sound", label: "Sound", blurb: "Sound design, scores, field recordings and mixing.", photo: "sound", photoPos: "50% 30%", photoAlt: "A sound designer at a mixing console" },
  { discipline: "Photography", label: "Photography", blurb: "Portrait, documentary, street and fine-art photography." },
];
