import { SUPABASE_URL } from "@/lib/env";

export const DISCIPLINES = [
  "Visual art",
  "Performance",
  "Theatre",
  "Dance",
  "Sound",
  "Music",
  "Film",
  "Writing",
  "Other",
] as const;

export const AVAILABLE_FOR = ["Commissions", "Bookings", "Exhibitions", "Collaborations", "Teaching"] as const;

export const INQUIRY_KINDS = [
  { value: "buying", label: "Buying a work" },
  { value: "booking", label: "Booking a performance" },
  { value: "commission", label: "A commission" },
  { value: "collaboration", label: "A collaboration" },
  { value: "other", label: "Something else" },
] as const;

export const BANNER_COLORS = ["#2B2A6B", "#3D33E0", "#E8603C", "#1F7A6B", "#8E2C48", "#15151A", "#F5B83D", "#D9D4F7"];

export type BlockKind = "image" | "audio" | "video" | "text" | "pdf";

export const BLOCK_LABELS: Record<BlockKind, string> = {
  image: "Image",
  audio: "Audio",
  video: "Video link",
  text: "Text",
  pdf: "PDF",
};

// Public address of a file in the "media" storage bucket.
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/media/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

// Turn a YouTube or Vimeo page link into an embeddable player address.
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") || u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{6,})/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/(\d{5,})/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

// Placeholder artwork for projects without a cover: flat shapes in the SAC palette.
const COVERS: Array<{ bg: string; a: string; b: string }> = [
  { bg: "#2B2A6B", a: "width:46%;aspect-ratio:1;border-radius:50%;background:#F5B83D;left:27%;top:14%", b: "width:100%;height:24%;background:#E8603C;left:0;bottom:0" },
  { bg: "#1B1B22", a: "width:38%;height:72%;background:#F4F3F0;left:31%;top:14%;border-radius:4px", b: "width:14%;aspect-ratio:1;border-radius:50%;background:#F5B83D;left:10%;top:12%" },
  { bg: "#C9E3D6", a: "width:70%;height:5%;background:#1F7A6B;left:15%;top:48%;border-radius:4px", b: "width:34%;aspect-ratio:1;border-radius:50%;border:8px solid #1F7A6B;box-sizing:border-box;left:33%;top:25%" },
  { bg: "#E8603C", a: "width:72%;aspect-ratio:1;border-radius:50%;background:#F4D9CC;left:-12%;top:28%", b: "width:16%;height:62%;background:#15151A;left:62%;top:18%;border-radius:4px" },
  { bg: "#F4F3F0", a: "width:44%;height:60%;background:#2B2A6B;left:12%;top:18%;transform:rotate(-6deg)", b: "width:32%;height:42%;background:#F5B83D;left:52%;top:34%;transform:rotate(5deg)" },
  { bg: "#8E2C48", a: "width:50%;aspect-ratio:1;border-radius:50%;border:12px solid #F5B83D;box-sizing:border-box;left:25%;top:12%", b: "width:100%;height:14%;background:#15151A;left:0;bottom:0" },
  { bg: "#D9D4F7", a: "width:32%;aspect-ratio:1;border-radius:50%;background:#3D33E0;left:18%;top:26%", b: "width:24%;aspect-ratio:1;border-radius:50%;background:#E8603C;left:54%;top:44%" },
  { bg: "#1F7A6B", a: "width:9%;height:52%;background:#C9E3D6;left:22%;top:24%;border-radius:4px", b: "width:9%;height:30%;background:#C9E3D6;left:40%;top:35%;border-radius:4px" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toStyle(css: string): Record<string, string> {
  const out: Record<string, string> = { position: "absolute" };
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const key = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = decl.slice(i + 1).trim();
  }
  return out;
}

export function placeholderCover(id: string) {
  const c = COVERS[hash(id) % COVERS.length];
  return { background: c.bg, a: toStyle(c.a), b: toStyle(c.b) };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} h ago`;
  const d = h / 24;
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)} days ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
