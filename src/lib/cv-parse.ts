// Reads a CV or a LinkedIn "Save to PDF" export and suggests profile details.
// Runs entirely in the browser: no AI, no server, the file never leaves the device.
// Everything it finds is a suggestion the artist reviews before saving.

import { AVAILABLE_FOR, DISCIPLINES, type CvEntry, type CvKind, type LinkPlatform, type ProfileLink } from "@/lib/constants";

export type CvLine = { text: string; size?: number };

export type CvSuggestions = {
  source: "linkedin" | "cv";
  name?: string;
  headline?: string;
  bio?: string;
  location?: string;
  disciplines: string[];
  availableFor: string[];
  links: ProfileLink[];
  entries: CvEntry[];
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const clean = (s: string) => s.replace(/[ \t]+/g, " ").replace(/\s{2,}/g, " ").trim();
const YEAR = /\b(19[5-9]\d|20[0-4]\d)\b/g;
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const RANGE = new RegExp(
  `^\\s*(?:(?:${MONTHS})\\.?\\s+)?((?:19|20)\\d{2})\\s*(?:[-–—to]+\\s*(?:(?:${MONTHS})\\.?\\s+)?((?:19|20)\\d{2}|present|now|current|ongoing))?`,
  "i",
);
const PROVINCES =
  "ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU|Ontario|Quebec|Québec|British Columbia|Alberta|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland and Labrador|Prince Edward Island|Yukon";
const LOCATION = new RegExp(`^[A-Z][A-Za-zÀ-ÿ'.\\- ]{1,40},\\s*(?:${PROVINCES})\\b(?:,\\s*Canada)?$`);
const LOCATION_ANY = /^[A-Z][A-Za-zÀ-ÿ'.\- ]{1,40},\s*[A-Z][A-Za-zÀ-ÿ'.\- ]{1,40}(?:,\s*[A-Z][A-Za-zÀ-ÿ'.\- ]{1,40})?$/;

const SECTIONS: { kind: CvKind | "bio" | "skip" | "experience"; words: RegExp }[] = [
  { kind: "bio", words: /^(about( me)?|profile|summary|bio(graphy)?|artist'?s? statement|statement|introduction)$/i },
  { kind: "exhibition", words: /^((selected |solo |group |recent )?(exhibitions?|shows?)|(solo|group) (exhibitions?|shows?)|exhibition history)$/i },
  { kind: "performance", words: /^((selected )?(performances?|concerts?|productions?|screenings?|festivals?|recitals?|appearances?|filmography|discography|credits|theatre credits|stage credits))$/i },
  { kind: "award", words: /^((selected )?(awards?|honou?rs?|prizes?|grants?|fellowships?|scholarships?|awards (and|&) (honou?rs|grants)|grants (and|&) awards))$/i },
  { kind: "residency", words: /^((artist )?residenc(y|ies)|residencies (and|&) fellowships)$/i },
  { kind: "education", words: /^(education|training|academic background|studies|education (and|&) training)$/i },
  { kind: "press", words: /^((selected )?(press|publications?|media|reviews?|bibliography|articles|interviews|in the press))$/i },
  { kind: "experience", words: /^((work |professional |teaching |relevant )?experience|employment|teaching|positions?|commissions?|collections?|public collections?)$/i },
  { kind: "skip", words: /^(contact|skills|top skills|languages|certifications|references|interests|hobbies|software|tools|page \d+ of \d+)$/i },
];

function sectionOf(line: string) {
  const t = line.replace(/[:•\-–—]+$/g, "").trim();
  if (t.length > 45) return null;
  return SECTIONS.find((s) => s.words.test(t))?.kind ?? null;
}

const KIND_WORDS: [CvKind, RegExp][] = [
  ["residency", /residenc/i],
  ["award", /\b(award|prize|grant|fellowship|scholarship|honou?r|winner|finalist|shortlist)/i],
  ["education", /\b(BFA|MFA|BA|MA|PhD|B\.?Mus|M\.?Mus|diploma|degree|certificate|university|college|conservatory|academy|school of)/i],
  ["press", /\b(interview|article|featured in|review|magazine|podcast|newspaper|journal|published)/i],
  ["performance", /\b(perform|concert|recital|festival|production|premiere|screening|tour|stage|played|choreograph)/i],
  ["exhibition", /\b(exhibit|exhibition|show|gallery|museum|biennial|art fair|installation|solo|group)/i],
];
const guessKind = (s: string): CvKind => KIND_WORDS.find(([, re]) => re.test(s))?.[0] ?? "other";

const PLATFORMS: [LinkPlatform, RegExp][] = [
  ["linkedin", /linkedin\.com\/in\//i],
  ["instagram", /instagram\.com\//i],
  ["youtube", /youtube\.com\/|youtu\.be\//i],
  ["vimeo", /vimeo\.com\//i],
  ["tiktok", /tiktok\.com\//i],
  ["spotify", /open\.spotify\.com\//i],
  ["soundcloud", /soundcloud\.com\//i],
  ["bandcamp", /bandcamp\.com/i],
  ["behance", /behance\.net\//i],
  ["artstation", /artstation\.com\//i],
  ["imdb", /imdb\.com\//i],
];

const DISCIPLINE_WORDS: [string, RegExp][] = [
  ["Visual art", /\b(paint(er|ing|ings)?|visual art(ist)?|sculpt(or|ure)|illustrat(or|ion)|printmak|drawing|mixed media|ceramic|textile|mural)/i],
  ["Music", /\b(musician|music|composer|singer|vocalist|rubab|tabla|sitar|piano|guitar|violin|qawwali|ghazal|songwriter|producer)\b/i],
  ["Dance", /\b(dance|dancer|choreograph\w*|kathak|bharatanatyam|ballet)\b/i],
  ["Theatre", /\b(theatre|theater|actor|actress|playwright|stage director|drama)\b/i],
  ["Film", /\b(film(maker|making)?|director of photography|documentar\w*|cinematograph\w*|screenwriter|video artist)\b/i],
  ["Sound", /\b(sound design(er)?|audio engineer|sound artist|field recording|mixing engineer)\b/i],
  ["Calligraphy", /\bcalligraph\w*/i],
  ["Photography", /\bphotograph(er|y)\b/i],
  ["Writing", /\b(writer|poet|poetry|author|novelist|essayist)\b/i],
];

function findLinks(text: string): ProfileLink[] {
  const out: ProfileLink[] = [];
  const seen = new Set<string>();
  const add = (platform: LinkPlatform, raw: string) => {
    let url = raw.replace(/[).,;:'"\]]+$/, "");
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const key = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    if (seen.has(key) || out.length >= 8) return;
    seen.add(key);
    out.push({ platform, url });
  };
  // LinkedIn PDFs often break the profile address over two lines. Email addresses are removed first.
  const joined = text.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, " ").replace(/(linkedin\.com\/in\/[\w-]*)\s*\n\s*([\w-]+)\s*\(LinkedIn\)/gi, "$1$2 (LinkedIn)");
  const urls = joined.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|ca|net|org|art|studio|io|co|me|info|design|gallery|music|be)(?:\/[^\s,;)]*)?/gi) ?? [];
  for (const u of urls) {
    if (/@/.test(u) || /^(gmail|hotmail|outlook|yahoo|icloud)\./i.test(u)) continue;
    const platform = PLATFORMS.find(([, re]) => re.test(u))?.[0];
    if (platform) add(platform, u);
  }
  // A personal website: the first plain domain that isn't a known platform or an email provider.
  for (const u of urls) {
    if (PLATFORMS.some(([, re]) => re.test(u)) || /(gmail|hotmail|outlook|yahoo|icloud|google|facebook|twitter|x)\.com/i.test(u) || /@/.test(u)) continue;
    if (!/^(https?:\/\/)?(www\.)?[a-z0-9-]+\.(com|ca|net|org|art|studio|design|gallery|me|co|io)(\/.*)?$/i.test(u)) continue;
    add("website", u);
    break;
  }
  // "Instagram: @name" with no address.
  const ig = text.match(/instagram[:\s]+@([a-z0-9._]{2,30})/i);
  if (ig && !out.some((l) => l.platform === "instagram")) add("instagram", `instagram.com/${ig[1]}`);
  return out;
}

function guessDisciplines(text: string) {
  return DISCIPLINE_WORDS.map(([d, re]) => [d, (text.match(new RegExp(re.source, "gi")) ?? []).length] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d)
    .filter((d) => (DISCIPLINES as readonly string[]).includes(d));
}

function guessAvailable(text: string) {
  const out: string[] = [];
  if (/\b(commissions? (welcome|open|available)|available for commissions?|accepting commissions?)/i.test(text)) out.push("Commissions");
  if (/\b(available for (bookings?|performances?|events?)|book(ings)? (welcome|available))/i.test(text)) out.push("Bookings");
  if (/\b(teach(er|ing)|instructor|workshops?|lessons|mentor)/i.test(text)) out.push("Teaching");
  if (/\bcollaborat/i.test(text)) out.push("Collaborations");
  return out.filter((a) => (AVAILABLE_FOR as readonly string[]).includes(a));
}

// "2021–2023", "2019 - present" → a short year label, at most 9 characters.
function yearLabel(a: string, b?: string) {
  if (!b) return a;
  if (/present|now|current|ongoing/i.test(b)) return `${a}–`;
  return a === b ? a : `${a}–${b}`;
}

// One line of a CV list, e.g. "2024  Group show, Harbourfront Centre, Toronto".
export function parseEntryLine(raw: string, kindIn?: CvKind): CvEntry | null {
  let kind = kindIn;
  let line = clean(raw).replace(/^[•▪◦●\-–—*·]\s*/, "");
  if (line.length < 6) return null;
  let year = "";
  const m = line.match(RANGE);
  if (m) {
    year = yearLabel(m[1], m[2]);
    line = line.slice(m[0].length).replace(/^[\s,:;.)\]–—-]+/, "");
  } else {
    const tail = line.match(new RegExp(`[,(–—-]\\s*((?:19|20)\\d{2})(?:\\s*[-–—]\\s*((?:19|20)\\d{2}|present))?\\)?\\.?$`, "i"));
    if (!tail) return null;
    year = yearLabel(tail[1], tail[2]);
    line = line.slice(0, tail.index).replace(/[\s,;:–—-]+$/, "");
  }
  if (line.length < 3) return null;
  // Quick-add style: "2024, Exhibition, Title, Place". A leading type word sets the kind.
  const typed = line.match(/^(exhibition|performance|award|grant|residency|education|press|other)\s*[,:–—-]\s*/i);
  if (typed) {
    const w = typed[1].toLowerCase();
    kind = (w === "grant" ? "award" : w) as CvKind;
    line = line.slice(typed[0].length);
  }
  // "Title, Place" or "Title — Place": the last comma part that looks like a place.
  let title = line;
  let place = "";
  const dash = line.split(/\s+[–—]\s+|\s+-\s+/);
  if (dash.length >= 2) {
    title = dash[0];
    place = dash.slice(1).join(", ");
  } else {
    const parts = line.split(/,\s+/);
    // A very short first part ("BFA", "MA") belongs with the next one: "BFA, Painting".
    if (parts.length >= 3 && parts[0].length <= 6) parts.splice(0, 2, `${parts[0]}, ${parts[1]}`);
    if (parts.length >= 2) {
      title = parts[0];
      place = parts.slice(1).join(", ");
    }
  }
  title = title.replace(/^["“]|["”]$/g, "").trim().slice(0, 120);
  place = place.trim().slice(0, 120);
  if (!title) return null;
  return { year: year.slice(0, 9), kind: kind ?? guessKind(line), title, ...(place ? { place } : {}) };
}

// ---------------------------------------------------------------------------
// LinkedIn "Save to PDF"
// ---------------------------------------------------------------------------
function parseLinkedIn(lines: CvLine[], text: string): CvSuggestions {
  const t = lines.map((l) => clean(l.text)).filter(Boolean);
  const sizes = lines.filter((l) => l.size).map((l) => l.size!);
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const nameIdx = maxSize ? lines.findIndex((l) => l.size === maxSize && clean(l.text).length > 1) : -1;
  const at = (i: number) => clean(lines[i]?.text ?? "");

  let name: string | undefined;
  let headline: string | undefined;
  let location: string | undefined;
  if (nameIdx >= 0) {
    name = at(nameIdx);
    const after: string[] = [];
    for (let i = nameIdx + 1; i < lines.length && after.length < 4; i++) {
      const s = at(i);
      if (!s) continue;
      if (/^(summary|experience|education)$/i.test(s)) break;
      after.push(s);
    }
    const locAt = after.findIndex((s) => LOCATION.test(s) || LOCATION_ANY.test(s));
    if (locAt >= 0) location = after[locAt];
    const head = (locAt >= 0 ? after.slice(0, locAt) : after.slice(0, 1)).join(" ");
    headline = head || undefined;
  }

  const idx = (word: string) => t.findIndex((s) => s.toLowerCase() === word);
  const iSummary = idx("summary");
  const iExp = idx("experience");
  const iEdu = idx("education");
  const endOf = (start: number) => {
    const ends = [iExp, iEdu, t.length].filter((x) => x > start);
    return Math.min(...ends);
  };

  const bio = iSummary >= 0 ? t.slice(iSummary + 1, endOf(iSummary)).filter((s) => !/^page \d+ of \d+$/i.test(s)).join(" ").slice(0, 2000) : undefined;

  const entries: CvEntry[] = [];
  // Experience: [company], role, "Month Year - Month Year (duration)", [place], description…
  if (iExp >= 0) {
    const block = t.slice(iExp + 1, iEdu > iExp ? iEdu : t.length).filter((s) => !/^page \d+ of \d+$/i.test(s));
    let company = "";
    for (let i = 0; i < block.length; i++) {
      const m = block[i].match(RANGE);
      const looksDate = m && /\d{4}/.test(block[i]) && block[i].length < 70 && /(\(|present|\d{4}\s*[-–]\s*)/i.test(block[i]);
      if (!looksDate) continue;
      const role = block[i - 1] ?? "";
      if (block[i - 2] && !RANGE.test(block[i - 2]) && block[i - 2].length < 80) company = block[i - 2];
      if (!role || role.length > 100) continue;
      const year = yearLabel(m![1], m![2]);
      const where = company && company !== role ? company : "";
      entries.push({ year: year.slice(0, 9), kind: guessKind(`${role} ${where}`), title: role.slice(0, 120), ...(where ? { place: where.slice(0, 120) } : {}) });
    }
  }
  // Education: school, "Degree, Field · (2010 - 2014)"
  if (iEdu >= 0) {
    const block = t.slice(iEdu + 1).filter((s) => !/^page \d+ of \d+$/i.test(s));
    for (let i = 0; i < block.length; i++) {
      const m = block[i].match(/\((?:[A-Za-z]+\s+)?((?:19|20)\d{2})(?:\s*[-–]\s*(?:[A-Za-z]+\s+)?((?:19|20)\d{2}))?\)\s*$/);
      if (!m) continue;
      const degree = block[i].slice(0, m.index).replace(/[\s·,]+$/, "");
      const school = block[i - 1] ?? "";
      entries.push({ year: (m[2] ?? m[1]).slice(0, 9), kind: "education", title: (degree || school).slice(0, 120), ...(degree && school ? { place: school.slice(0, 120) } : {}) });
    }
  }

  return {
    source: "linkedin",
    name,
    headline: headline?.slice(0, 120),
    bio: bio || undefined,
    location: location?.slice(0, 80),
    disciplines: guessDisciplines(`${headline ?? ""} ${bio ?? ""} ${text}`),
    availableFor: guessAvailable(`${headline ?? ""} ${bio ?? ""}`),
    links: findLinks(text),
    entries: entries.slice(0, 30),
  };
}

// ---------------------------------------------------------------------------
// Any other CV
// ---------------------------------------------------------------------------
export function parseCv(lines: CvLine[]): CvSuggestions {
  const text = lines.map((l) => l.text).join("\n");
  if (/linkedin\.com\/in\//i.test(text) && /^\s*experience\s*$/im.test(text) && /^\s*(summary|education|top skills)\s*$/im.test(text)) {
    return parseLinkedIn(lines, text);
  }

  const t = lines.map((l) => clean(l.text)).filter(Boolean);
  let section: ReturnType<typeof sectionOf> = null;
  const bioParts: string[] = [];
  const entries: CvEntry[] = [];
  let pendingYear: string | null = null;
  let location: string | undefined;

  for (let i = 0; i < t.length; i++) {
    const s = t[i];
    if (!location && i < 25 && (LOCATION.test(s) || /\b(based in|lives and works in)\s+([A-Z][\w .'-]+)/.test(s))) {
      const based = s.match(/\b(?:based in|lives and works in)\s+([A-Z][\w .'-]+(?:,\s*[A-Z][\w .'-]+)?)/);
      location = (based ? based[1] : s).replace(/[.;]+$/, "").slice(0, 80);
    }
    const sec = sectionOf(s);
    if (sec) {
      section = sec;
      pendingYear = null;
      continue;
    }
    if (section === "skip") continue;
    if (section === "bio") {
      if (!YEAR.test(s) || s.length > 80) bioParts.push(s);
      YEAR.lastIndex = 0;
      continue;
    }
    // A year on its own line belongs to the next line.
    if (/^\s*((?:19|20)\d{2})(\s*[-–—]\s*((?:19|20)\d{2}|present))?\s*$/i.test(s)) {
      pendingYear = s.replace(/\s+/g, "");
      continue;
    }
    const kind = section && section !== "experience" ? (section as CvKind) : undefined;
    const entry = parseEntryLine(pendingYear ? `${pendingYear} ${s}` : s, kind);
    pendingYear = null;
    if (entry && (section || /^\s*[•▪◦●\-–—*·]?\s*((?:19|20)\d{2})/.test(s))) {
      if (section === "experience" && entry.kind === "other") entry.kind = guessKind(s);
      entries.push(entry);
    }
  }

  // No "About" section: use the first real paragraph near the top.
  let bio = bioParts.join(" ").trim();
  if (!bio) {
    const para = t.slice(0, 20).find((s) => s.length >= 140 && !/\b(19|20)\d{2}\b.*\b(19|20)\d{2}\b/.test(s) && !/@|https?:/.test(s));
    if (para) bio = para;
  }

  // Keep the most recent first, without duplicates.
  const seen = new Set<string>();
  const unique = entries
    .filter((e) => {
      const k = `${e.year}|${e.title.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (b.year || "").localeCompare(a.year || ""));

  return {
    source: "cv",
    bio: bio ? bio.slice(0, 2000) : undefined,
    location,
    disciplines: guessDisciplines(text),
    availableFor: guessAvailable(text),
    links: findLinks(text),
    entries: unique.slice(0, 30),
  };
}

// Plain pasted text, one line per line.
export function parseCvText(text: string): CvSuggestions {
  return parseCv(text.replace(/\r/g, "").split("\n").map((l) => ({ text: l })));
}
