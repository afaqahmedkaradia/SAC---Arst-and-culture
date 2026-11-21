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
  "Photography",
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

// ---------------------------------------------------------------------------
// Policies (see supabase/migrations/0003_policies.sql)
// ---------------------------------------------------------------------------

export const OPERATOR = "Arts and Culture, Ismaili Council for Canada";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export type WorkType = "original" | "study" | "inspired" | "traditional" | "cover" | "collaboration" | "ai_assisted";

// What kind of work a project is. Shown publicly on the project page and its card.
export const WORK_TYPES: { id: WorkType; label: string; hint: string; needsCredit: boolean; sellable: boolean }[] = [
  { id: "original", label: "Original work", hint: "Your own idea and execution.", needsCredit: false, sellable: true },
  { id: "study", label: "Study or practice copy", hint: "A copy or close study of another artist’s work, made to learn.", needsCredit: true, sellable: false },
  { id: "inspired", label: "Inspired by", hint: "A new work that clearly draws on another work or style.", needsCredit: true, sellable: true },
  { id: "traditional", label: "Traditional form", hint: "An inherited form or pattern, such as classical scripts, folk designs or classical repertoire.", needsCredit: false, sellable: true },
  { id: "cover", label: "Cover or interpretation", hint: "A performance of someone else’s music, choreography or play.", needsCredit: true, sellable: false },
  { id: "collaboration", label: "Collaboration", hint: "Made together with others. Add them under Credits.", needsCredit: false, sellable: true },
  { id: "ai_assisted", label: "AI-assisted", hint: "AI tools were used to make part of the work.", needsCredit: false, sellable: false },
];

export function workTypeOf(id: string | null | undefined) {
  return WORK_TYPES.find((w) => w.id === id) ?? WORK_TYPES[0];
}

// The public label, e.g. "Study after Sadequain". Null for original work, which needs no label.
export function workTypeLabel(id: string | null | undefined, credit: string | null | undefined): string | null {
  const c = credit?.trim();
  switch (id) {
    case "study": return c ? `Study after ${c}` : "Study";
    case "inspired": return c ? `Inspired by ${c}` : "Inspired by another work";
    case "cover": return c ? `Cover of ${c}` : "Cover";
    case "traditional": return "Traditional form";
    case "collaboration": return "Collaboration";
    case "ai_assisted": return "AI-assisted";
    default: return null;
  }
}

export const LINK_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "website", label: "Website" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "vimeo", label: "Vimeo" },
  { id: "tiktok", label: "TikTok" },
  { id: "spotify", label: "Spotify" },
  { id: "soundcloud", label: "SoundCloud" },
  { id: "bandcamp", label: "Bandcamp" },
  { id: "behance", label: "Behance" },
  { id: "artstation", label: "ArtStation" },
  { id: "imdb", label: "IMDb" },
  { id: "other", label: "Other" },
] as const;
export type LinkPlatform = (typeof LINK_PLATFORMS)[number]["id"];
export type ProfileLink = { platform: LinkPlatform; url: string };

export const CV_KINDS = [
  { id: "exhibition", label: "Exhibition" },
  { id: "performance", label: "Performance" },
  { id: "award", label: "Award" },
  { id: "residency", label: "Residency" },
  { id: "education", label: "Education" },
  { id: "press", label: "Press" },
  { id: "other", label: "Other" },
] as const;
export type CvKind = (typeof CV_KINDS)[number]["id"];
export type CvEntry = { year: string; kind: CvKind; title: string; place?: string };

export const REPORT_CATEGORIES = [
  { id: "not_original", label: "Not original or not credited" },
  { id: "rights", label: "Uses my work, music or image without permission" },
  { id: "guidelines", label: "Breaks the community guidelines" },
  { id: "other", label: "Something else" },
] as const;

// The six checks a curator makes before approving an artist.
export const CURATOR_CHECKS = [
  { id: "community", label: "Community connection", hint: "Meets SAC’s eligibility rule" },
  { id: "real", label: "Real and reachable", hint: "Genuine name and details, no duplicate account" },
  { id: "own_work", label: "Their own work", hint: "Work types honest; reverse image search on the first project" },
  { id: "profile", label: "Complete profile", hint: "Photo, a bio of two sentences or more, an art form" },
  { id: "guidelines", label: "Within the guidelines", hint: "Including respectful treatment of faith and sacred material" },
  { id: "consent", label: "Rights and consent", hint: "People shown, especially children, appear with consent; music or footage is theirs or credited" },
] as const;

// Newsletter topics. Subscribers pick any; a newsletter goes to everyone
// subscribed to at least one of its topics.
export const NEWSLETTER_TOPICS = [
  { id: "events", label: "Art events and showcases", hint: "Exhibitions, performances and community showcases" },
  { id: "sales", label: "Art for sale and auctions", hint: "New work for sale, art sales and online auctions" },
  { id: "opportunities", label: "Residencies, grants and calls", hint: "Funding, residencies and calls for artists" },
  { id: "news", label: "SAC news and featured artists", hint: "Curator’s picks and what’s new on SAC" },
] as const;
export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number]["id"];
export const NEWSLETTER_TOPIC_IDS = NEWSLETTER_TOPICS.map((t) => t.id) as string[];

// Community details asked of artists at sign-up. Private: only the artist and curators see them.
export const COUNTRIES = ["Afghanistan","Åland Islands","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central African Republic","Chad","Chile","China","Christmas Island","Cocos (Keeling) Islands","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Cook Islands","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Curaçao","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Guiana","French Polynesia","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe","Guam","Guatemala","Guernsey","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macao","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique","Mauritania","Mauritius","Mayotte","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Niue","Norfolk Island","North Korea","North Macedonia","Northern Mariana Islands","Norway","Oman","Pakistan","Palau","Palestinian Territories","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Pitcairn Islands","Poland","Portugal","Puerto Rico","Qatar","Réunion","Romania","Russia","Rwanda","Samoa","San Marino","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Sint Maarten","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Georgia and South Sandwich Islands","South Korea","South Sudan","Spain","Sri Lanka","St. Barthélemy","St. Helena","St. Kitts and Nevis","St. Lucia","St. Martin","St. Pierre and Miquelon","St. Vincent and Grenadines","Sudan","Suriname","Svalbard and Jan Mayen","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tokelau","Tonga","Trinidad and Tobago","Tunisia","Türkiye","Turkmenistan","Turks and Caicos Islands","Tuvalu","U.S. Virgin Islands","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Wallis and Futuna","Western Sahara","Yemen","Zambia","Zimbabwe"] as const;
export const FAMILY_RELATIONSHIPS = ["Spouse or partner", "Parent", "Child", "Sibling", "Grandparent", "Other family member"] as const;
