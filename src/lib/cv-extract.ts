// Turns an uploaded CV (PDF, Word or text) into lines of text, in the browser.
// The PDF and Word readers load only when someone picks a file.

import type { CvLine } from "@/lib/cv-parse";

export const CV_ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
export const CV_MAX_BYTES = 10 * 1024 * 1024;

type PdfItem = { str: string; transform: number[]; height?: number; hasEOL?: boolean };

async function pdfLines(buf: ArrayBuffer): Promise<CvLine[]> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const out: CvLine[] = [];
  const pages = Math.min(pdf.numPages, 12);
  for (let p = 1; p <= pages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Keep the order the PDF writes its text in: that keeps LinkedIn's side column
    // apart from the main column. A new line starts at a line break or a change in height.
    let text = "";
    let size = 0;
    let y: number | null = null;
    const flush = () => {
      if (text.trim()) out.push({ text: text.trim(), size: Math.round(size * 10) / 10 });
      text = "";
      size = 0;
    };
    for (const raw of content.items as PdfItem[]) {
      if (typeof raw.str !== "string") continue;
      const itemY = raw.transform[5];
      const itemSize = Math.abs(raw.transform[3]) || raw.height || 0;
      if (y !== null && Math.abs(itemY - y) > Math.max(2, itemSize * 0.5)) flush();
      if (raw.str) {
        text += (text && !text.endsWith(" ") && !raw.str.startsWith(" ") ? " " : "") + raw.str;
        size = Math.max(size, itemSize);
        y = itemY;
      }
      if (raw.hasEOL) flush();
    }
    flush();
  }
  await pdf.destroy();
  return out;
}

async function docxLines(buf: ArrayBuffer): Promise<CvLine[]> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const files = unzipSync(new Uint8Array(buf), { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("That Word file couldn't be read.");
  const doc = new DOMParser().parseFromString(strFromU8(xml), "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const out: CvLine[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS(W, "p"))) {
    let line = "";
    let size = 0;
    for (const node of Array.from(p.getElementsByTagNameNS(W, "*"))) {
      if (node.localName === "t") line += node.textContent ?? "";
      else if (node.localName === "tab") line += "  ";
      else if (node.localName === "br") line += "\n";
      else if (node.localName === "sz") size = Math.max(size, Number(node.getAttributeNS(W, "val")) / 2 || 0);
    }
    for (const part of line.split("\n")) if (part.trim()) out.push({ text: part.trim(), ...(size ? { size } : {}) });
  }
  return out;
}

export async function extractCvLines(file: File): Promise<CvLine[]> {
  if (file.size > CV_MAX_BYTES) throw new Error("Please use a file under 10 MB.");
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return pdfLines(buf);
  if (name.endsWith(".docx")) return docxLines(buf);
  if (name.endsWith(".doc")) throw new Error("Older .doc files can't be read. Save it as .docx or PDF, or paste the text instead.");
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return new TextDecoder().decode(buf).replace(/\r/g, "").split("\n").map((text) => ({ text }));
  }
  throw new Error("Please choose a PDF, a Word (.docx) file or a text file.");
}
