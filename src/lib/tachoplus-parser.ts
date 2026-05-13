import { inflateSync } from "zlib";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, rmSync, mkdtempSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface TachoplusEintrag {
  datum: string;
  startzeit: string;
  endzeit: string;
  pauseMinuten: number;
  pauseBerechnet: boolean;
}

// ── Text extraction from PDF content streams ───────────────────────────────

const STREAM_KW = Buffer.from("stream");
const ENDSTREAM  = Buffer.from("endstream");

function findTextStreams(pdf: Buffer): Buffer[] {
  const result: Buffer[] = [];
  let pos = 0;
  while (pos < pdf.length) {
    const kwPos = pdf.indexOf(STREAM_KW, pos);
    if (kwPos === -1) break;
    let i = kwPos + STREAM_KW.length;
    while (i < pdf.length && pdf[i] === 0x20) i++;
    if (pdf[i] === 0x0d) { i++; if (i < pdf.length && pdf[i] === 0x0a) i++; }
    else if (pdf[i] === 0x0a) { i++; }
    else { pos = kwPos + STREAM_KW.length; continue; }

    const start = i;
    const endPos = pdf.indexOf(ENDSTREAM, start);
    if (endPos === -1) break;
    let end = endPos;
    if (end > start && pdf[end - 1] === 0x0a) end--;
    if (end > start && pdf[end - 1] === 0x0d) end--;

    const raw = pdf.slice(start, end);
    let content: Buffer;
    try { content = inflateSync(raw); } catch { content = raw; }

    // Only keep content streams (contain PDF text operators)
    const s = content.toString("latin1");
    if (s.includes(" Tj") || s.includes("] TJ") || s.includes("> Tj")) {
      result.push(content);
    }
    pos = endPos + ENDSTREAM.length;
  }
  return result;
}

function hexToStr(hex: string): string {
  const clean = hex.replace(/\s/g, "");
  let r = "";
  for (let i = 0; i + 1 < clean.length; i += 2)
    r += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  return r;
}

function decodeLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}

function extractFromStream(buf: Buffer): string {
  const s = buf.toString("latin1");
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  const litTj = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*T[j'"]/g;
  while ((m = litTj.exec(s)) !== null) parts.push(decodeLiteral(m[1]) + " ");
  const hexTj = /<([0-9a-fA-F\s]{2,})>\s*T[j'"]/g;
  while ((m = hexTj.exec(s)) !== null) parts.push(hexToStr(m[1]) + " ");
  const tjArr = /\[([\s\S]{0,2000}?)\]\s*TJ/g;
  while ((m = tjArr.exec(s)) !== null) {
    const inner = m[1];
    const lit = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let x: RegExpExecArray | null;
    while ((x = lit.exec(inner)) !== null) parts.push(decodeLiteral(x[1]));
    const hex = /<([0-9a-fA-F\s]{2,})>/g;
    while ((x = hex.exec(inner)) !== null) parts.push(hexToStr(x[1]));
    parts.push(" ");
  }
  return parts.join("");
}

// ── pdftoppm + Tesseract OCR ───────────────────────────────────────────────

function ocrViaPdftoppm(pdfBuffer: Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "tachoocr-"));
  try {
    const pdfPath = join(dir, "input.pdf");
    writeFileSync(pdfPath, pdfBuffer);

    // First attempt: pdftotext (free if PDF has a text layer)
    try {
      const t = execFileSync("pdftotext", ["-layout", pdfPath, "-"]).toString("utf-8");
      if (/\b\d{2}\.\d{2}\.\d{4}\b/.test(t)) {
        console.log("[tachoplus] pdftotext found dates");
        return t;
      }
    } catch { /* no text layer */ }

    // Render each page as 300-DPI PNG
    execFileSync("pdftoppm", ["-r", "300", "-png", pdfPath, join(dir, "page")]);

    const pages = readdirSync(dir)
      .filter(f => f.startsWith("page") && f.endsWith(".png"))
      .sort()
      .map(f => join(dir, f));

    console.log(`[tachoplus] pdftoppm: ${pages.length} page(s)`);

    let text = "";
    for (let i = 0; i < pages.length; i++) {
      const outBase = join(dir, `out${i}`);
      // PSM 11: sparse text – finds text anywhere regardless of layout (best for mixed graphics+text)
      // --dpi 300: tell Tesseract the input resolution so it estimates character size correctly
      execFileSync("tesseract", [pages[i], outBase, "-l", "deu+eng", "--psm", "11", "--dpi", "300"]);
      text += readFileSync(outBase + ".txt", "utf-8") + "\n";
    }
    return text;
  } catch (e) {
    console.error("[tachoplus] pdftoppm/tesseract error:", e);
    return "";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── Time / date parsing ────────────────────────────────────────────────────

function zeitZuMinuten(z: string): number {
  const [h, min] = z.split(":").map(Number);
  return h * 60 + min;
}

function minutenZuZeit(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function parseSegment(d: string, mo: string, y: string, segment: string): TachoplusEintrag | null {
  const datum = `${y}-${mo}-${d}`;
  const alleZeiten: number[] = [];
  let m: RegExpExecArray | null;
  const re = /\b([0-1]?\d|2[0-3]):([0-5]\d)\b/g;
  while ((m = re.exec(segment)) !== null) alleZeiten.push(zeitZuMinuten(m[0]));
  if (alleZeiten.length < 2) return null;
  const wanduhrzeiten = alleZeiten.filter(t => t >= 180 && t <= 1439);
  if (wanduhrzeiten.length < 2) return null;
  const startMin = wanduhrzeiten[0];
  const endMin   = wanduhrzeiten[1];
  if (endMin <= startMin || endMin - startMin > 16 * 60) return null;
  const schichtDauer = endMin - startMin;
  const dauerwerte   = alleZeiten.filter(t => t > 0 && t < 180);
  let pauseMinuten = 0, pauseBerechnet = false;
  if (dauerwerte.length >= 2) {
    const sorted     = [...dauerwerte].sort((a, b) => b - a);
    const berechnete = schichtDauer - sorted.slice(0, 3).reduce((a, b) => a + b, 0);
    if (berechnete >= 0 && berechnete <= 120) {
      pauseMinuten = berechnete; pauseBerechnet = true;
    } else {
      const k = dauerwerte.find(t => t >= 15 && t <= 90);
      if (k !== undefined) { pauseMinuten = k; pauseBerechnet = true; }
    }
  }
  return { datum, startzeit: minutenZuZeit(startMin), endzeit: minutenZuZeit(endMin), pauseMinuten, pauseBerechnet };
}

function parseText(text: string): TachoplusEintrag[] {
  const treffer: Array<{ match: RegExpMatchArray; pos: number }> = [];
  let m: RegExpExecArray | null;
  const re = /\b(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g;
  while ((m = re.exec(text)) !== null) treffer.push({ match: m, pos: m.index! });

  const eintraege: TachoplusEintrag[] = [];
  const gesehen = new Set<string>();
  for (let i = 0; i < treffer.length; i++) {
    const { match, pos } = treffer[i];
    const [, d, mo, y]   = match;
    const segEnd  = treffer[i + 1]?.pos ?? pos + 300;
    const segment = text.slice(pos + match[0].length, segEnd);
    const eintrag = parseSegment(d, mo, y, segment);
    const key     = `${y}-${mo}-${d}`;
    if (eintrag && !gesehen.has(key)) { gesehen.add(key); eintraege.push(eintrag); }
  }
  return eintraege.sort((a, b) => a.datum.localeCompare(b.datum));
}

export async function parseTachoPlusPdf(pdfBuffer: Buffer): Promise<TachoplusEintrag[]> {
  // 1. Try direct text-stream extraction (fast, works for text-layer PDFs)
  const textStreams = findTextStreams(pdfBuffer);
  let text = textStreams.map(extractFromStream).join("\n");
  const datumRe = /\b\d{2}\.\d{2}\.\d{4}\b/;
  const hasText = datumRe.test(text);

  // 2. Image-based PDF: use pdftoppm (300 DPI) + Tesseract PSM 4
  if (!hasText) {
    console.log("[tachoplus] no text layer detected – using pdftoppm + Tesseract");
    text = ocrViaPdftoppm(pdfBuffer);
  }

  console.log(`[tachoplus] text length=${text.length} | sample: ${text.slice(0, 500).replace(/\n/g, "↵")}`);

  const eintraege = parseText(text);
  console.log(`[tachoplus] entries found: ${eintraege.length}`);
  return eintraege;
}
