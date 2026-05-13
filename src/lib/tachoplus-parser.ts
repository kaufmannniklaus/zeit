import { inflateSync } from "zlib";
import { execFileSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface TachoplusEintrag {
  datum: string;
  startzeit: string;
  endzeit: string;
  pauseMinuten: number;
  pauseBerechnet: boolean;
}

// ── PDF stream extraction ──────────────────────────────────────────────────

interface PdfStream {
  content: Buffer;
  isJpeg: boolean;
}

const STREAM_KW = Buffer.from("stream");
const ENDSTREAM = Buffer.from("endstream");
const JPEG_SOI  = Buffer.from([0xff, 0xd8]);

function findStreams(pdf: Buffer): PdfStream[] {
  const result: PdfStream[] = [];
  let pos = 0;

  while (pos < pdf.length) {
    const kwPos = pdf.indexOf(STREAM_KW, pos);
    if (kwPos === -1) break;

    let i = kwPos + STREAM_KW.length;
    // Skip optional trailing spaces (some generators add them)
    while (i < pdf.length && pdf[i] === 0x20) i++;

    // PDF spec: stream keyword followed by CR, LF, or CRLF
    if (pdf[i] === 0x0d) {
      i++; // CR
      if (i < pdf.length && pdf[i] === 0x0a) i++; // optional LF after CR
    } else if (pdf[i] === 0x0a) {
      i++; // LF only
    } else {
      // Not a valid stream marker (e.g. word "streamline" or binary content)
      pos = kwPos + STREAM_KW.length;
      continue;
    }

    const contentStart = i;
    const endPos = pdf.indexOf(ENDSTREAM, contentStart);
    if (endPos === -1) break;

    let contentEnd = endPos;
    if (contentEnd > contentStart && pdf[contentEnd - 1] === 0x0a) contentEnd--;
    if (contentEnd > contentStart && pdf[contentEnd - 1] === 0x0d) contentEnd--;

    const raw = pdf.slice(contentStart, contentEnd);

    // Try deflate decompression; if it fails the stream is uncompressed
    let content: Buffer;
    try {
      content = inflateSync(raw);
    } catch {
      content = raw;
    }

    const isJpeg = content.length > 2 && content[0] === JPEG_SOI[0] && content[1] === JPEG_SOI[1];
    result.push({ content, isJpeg });
    pos = endPos + ENDSTREAM.length;
  }

  return result;
}

// ── Text extraction from content streams ──────────────────────────────────

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

function extractTextFromContent(content: Buffer): string {
  const str = content.toString("latin1");
  const parts: string[] = [];
  let m: RegExpExecArray | null;

  const litTj = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*T[j'"]/g;
  while ((m = litTj.exec(str)) !== null) parts.push(decodeLiteral(m[1]) + " ");

  const hexTj = /<([0-9a-fA-F\s]{2,})>\s*T[j'"]/g;
  while ((m = hexTj.exec(str)) !== null) parts.push(hexToStr(m[1]) + " ");

  const tjArr = /\[([\s\S]{0,2000}?)\]\s*TJ/g;
  while ((m = tjArr.exec(str)) !== null) {
    const inner = m[1];
    const lit = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let s: RegExpExecArray | null;
    while ((s = lit.exec(inner)) !== null) parts.push(decodeLiteral(s[1]));
    const hex = /<([0-9a-fA-F\s]{2,})>/g;
    while ((s = hex.exec(inner)) !== null) parts.push(hexToStr(s[1]));
    parts.push(" ");
  }

  return parts.join("");
}

// ── Tesseract OCR for JPEG streams ─────────────────────────────────────────

function ocrJpeg(jpeg: Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "tachoocr-"));
  try {
    const imgPath = join(dir, "page.jpg");
    const outBase = join(dir, "out");
    writeFileSync(imgPath, jpeg);
    // --psm 6: assume uniform block of text (better for tables than --psm 11)
    execFileSync("tesseract", [imgPath, outBase, "-l", "deu+eng", "--psm", "6"]);
    return readFileSync(outBase + ".txt", "utf-8");
  } catch {
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
    const sorted    = [...dauerwerte].sort((a, b) => b - a);
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

export async function parseTachoPlusPdf(pdfBuffer: Buffer): Promise<TachoplusEintrag[]> {
  const streams = findStreams(pdfBuffer);
  const jpegStreams = streams.filter(s => s.isJpeg && s.content.length > 50_000);
  const textStreams = streams.filter(s => !s.isJpeg);

  console.log(`[tachoplus] streams=${streams.length} jpeg=${jpegStreams.length} text=${textStreams.length}`);

  // 1. Try text layer extraction
  let text = textStreams.map(s => extractTextFromContent(s.content)).join("\n");

  // 2. If no useful text, OCR the JPEG page images
  if (text.trim().length < 30 && jpegStreams.length > 0) {
    console.log("[tachoplus] no text layer – falling back to Tesseract OCR");
    text = jpegStreams.map(s => ocrJpeg(s.content)).join("\n");
  }

  console.log(`[tachoplus] text length=${text.length} sample: ${text.slice(0, 400).replace(/\n/g, "↵")}`);

  // 3. Parse text for date+time entries
  const treffer: Array<{ match: RegExpMatchArray; pos: number }> = [];
  let m: RegExpExecArray | null;
  const re = /\b(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g;
  while ((m = re.exec(text)) !== null) treffer.push({ match: m, pos: m.index! });

  console.log(`[tachoplus] date matches=${treffer.length}`);

  const eintraege: TachoplusEintrag[] = [];
  const gesehen = new Set<string>();

  for (let i = 0; i < treffer.length; i++) {
    const { match, pos } = treffer[i];
    const [, d, mo, y] = match;
    const segEnd  = treffer[i + 1]?.pos ?? pos + 300;
    const segment = text.slice(pos + match[0].length, segEnd);
    const eintrag = parseSegment(d, mo, y, segment);
    const key     = `${y}-${mo}-${d}`;
    if (eintrag && !gesehen.has(key)) { gesehen.add(key); eintraege.push(eintrag); }
  }

  return eintraege.sort((a, b) => a.datum.localeCompare(b.datum));
}
