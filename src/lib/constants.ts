import { SUPABASE_URL } from "@/lib/env";

export const DISCIPLINES = [
  "Visual art",
  "Performance",
  "Theatre",
  "Dance",
  "Sound",
  "Music",
  "Film",
  "Calligraphy",
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

export const BANNER_COLORS = ["#007041", "#00532F", "#98111D", "#19A29C", "#3A4B39", "#141414", "#B98A16", "#0E2A1C"];

// A person's colour, falling back to the community palette for older values.
export function personColor(id: string, color: string | null | undefined): string {
  if (color && BANNER_COLORS.includes(color)) return color;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return BANNER_COLORS[Math.abs(h) % BANNER_COLORS.length];
}

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
  { bg: "#007041", a: "width:46%;aspect-ratio:1;border-radius:50%;background:#F1C85D;left:27%;top:14%", b: "width:100%;height:24%;background:#EBF4F0;left:0;bottom:0" },
  { bg: "#98111D", a: "width:60%;aspect-ratio:1;border-radius:999px 999px 0 0;left:20%;bottom:0;background:#F6E7C1", b: "width:22%;aspect-ratio:1;border-radius:50%;left:39%;top:14%;background:#F1C85D" },
  { bg: "#F6E7C1", a: "width:40%;aspect-ratio:1;left:30%;top:22%;border:6px solid #98111D;box-sizing:border-box", b: "width:40%;aspect-ratio:1;left:30%;top:22%;border:6px solid #007041;box-sizing:border-box;transform:rotate(45deg)" },
  { bg: "#19A29C", a: "width:72%;aspect-ratio:1;border-radius:50%;background:#EBF4F0;left:-12%;top:28%", b: "width:16%;height:62%;background:#0E2A1C;left:62%;top:18%;border-radius:4px" },
  { bg: "#3A4B39", a: "width:56%;aspect-ratio:1;border-radius:999px 999px 0 0;left:22%;bottom:0;background:#F1C85D", b: "width:100%;height:12%;background:#0E2A1C;left:0;bottom:0" },
  { bg: "#EBF4F0", a: "width:44%;height:60%;background:#007041;left:12%;top:18%;border-radius:999px 999px 6px 6px", b: "width:30%;height:42%;background:#98111D;left:56%;top:36%;border-radius:999px 999px 6px 6px" },
  { bg: "#F1C85D", a: "width:60%;aspect-ratio:1;border-radius:50%;background:#98111D;left:20%;top:44%", b: "width:100%;height:30%;background:#3A4B39;left:0;bottom:0" },
  { bg: "#141414", a: "width:9%;height:52%;background:#6BCFA5;left:22%;top:24%;border-radius:4px", b: "width:9%;height:30%;background:#F1C85D;left:40%;top:35%;border-radius:4px" },
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
