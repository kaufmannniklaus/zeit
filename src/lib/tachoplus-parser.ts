import { inflateSync } from "zlib";

export interface TachoplusEintrag {
  datum: string;
  startzeit: string;
  endzeit: string;
  pauseMinuten: number;
  pauseBerechnet: boolean;
}

// ── PDF text extraction using Buffer.indexOf (works on binary data) ────────

const STREAM_KW  = Buffer.from("stream");
const ENDSTREAM  = Buffer.from("endstream");

function findStreams(pdf: Buffer): Buffer[] {
  // Diagnostic: log bytes around first "stream" occurrence
  const first = pdf.indexOf(STREAM_KW);
  if (first !== -1) {
    const ctx = pdf.slice(Math.max(0, first - 2), first + 12);
    console.log("[tachoplus-parser] first 'stream' at", first, "hex:", ctx.toString("hex"));
  } else {
    console.log("[tachoplus-parser] keyword 'stream' NOT found in buffer, size:", pdf.length);
    console.log("[tachoplus-parser] first 32 bytes hex:", pdf.slice(0, 32).toString("hex"));
  }

  const result: Buffer[] = [];
  let pos = 0;
  while (pos < pdf.length) {
    const kwPos = pdf.indexOf(STREAM_KW, pos);
    if (kwPos === -1) break;

    // Skip past "stream" keyword, then any spaces, then expect \n or \r[\n]
    let i = kwPos + STREAM_KW.length;
    while (i < pdf.length && pdf[i] === 0x20) i++; // skip spaces
    if (pdf[i] === 0x0d) i++; // skip optional CR
    if (i < pdf.length && pdf[i] === 0x0a) {
      i++; // consume LF → valid stream marker
    } else {
      // Not a stream data marker (e.g. "streamline" or inside binary)
      pos = kwPos + STREAM_KW.length;
      continue;
    }

    const contentStart = i;
    const endPos = pdf.indexOf(ENDSTREAM, contentStart);
    if (endPos === -1) break;

    let contentEnd = endPos;
    if (contentEnd > contentStart && pdf[contentEnd - 1] === 0x0a) contentEnd--;
    if (contentEnd > contentStart && pdf[contentEnd - 1] === 0x0d) contentEnd--;

    result.push(pdf.slice(contentStart, contentEnd));
    pos = endPos + ENDSTREAM.length;
  }
  return result;
}

function hexToStr(hex: string): string {
  const clean = hex.replace(/\s/g, "");
  let r = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    r += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  }
  return r;
}

function decodeLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}

function extractText(content: string): string {
  const parts: string[] = [];
  let m: RegExpExecArray | null;

  // (literal) Tj / ' / "
  const litTj = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*T[j'"]/g;
  while ((m = litTj.exec(content)) !== null) parts.push(decodeLiteral(m[1]) + " ");

  // <hex> Tj
  const hexTj = /<([0-9a-fA-F\s]{2,})>\s*T[j'"]/g;
  while ((m = hexTj.exec(content)) !== null) parts.push(hexToStr(m[1]) + " ");

  // [(lit/hex...)] TJ
  const tjArr = /\[([\s\S]{0,2000}?)\]\s*TJ/g;
  while ((m = tjArr.exec(content)) !== null) {
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

function extractPdfText(pdf: Buffer): string {
  const streams = findStreams(pdf);
  console.log("[tachoplus-parser] streams found:", streams.length);

  const parts: string[] = [];
  for (const stream of streams) {
    let content: string;
    try {
      content = inflateSync(stream).toString("latin1");
    } catch {
      content = stream.toString("latin1");
    }
    const t = extractText(content);
    if (t.trim()) parts.push(t + "\n");
  }
  return parts.join("");
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
  const endMin = wanduhrzeiten[1];
  if (endMin <= startMin || endMin - startMin > 16 * 60) return null;

  const schichtDauer = endMin - startMin;
  const dauerwerte = alleZeiten.filter(t => t > 0 && t < 180);
  let pauseMinuten = 0;
  let pauseBerechnet = false;

  if (dauerwerte.length >= 2) {
    const sorted = [...dauerwerte].sort((a, b) => b - a);
    const berechnete = schichtDauer - sorted.slice(0, 3).reduce((a, b) => a + b, 0);
    if (berechnete >= 0 && berechnete <= 120) {
      pauseMinuten = berechnete; pauseBerechnet = true;
    } else {
      const kandidat = dauerwerte.find(t => t >= 15 && t <= 90);
      if (kandidat !== undefined) { pauseMinuten = kandidat; pauseBerechnet = true; }
    }
  }

  return { datum, startzeit: minutenZuZeit(startMin), endzeit: minutenZuZeit(endMin), pauseMinuten, pauseBerechnet };
}

export async function parseTachoPlusPdf(pdfBuffer: Buffer): Promise<TachoplusEintrag[]> {
  const text = extractPdfText(pdfBuffer);
  console.log("[tachoplus-parser] total text length:", text.length, "| sample:", text.slice(0, 500).replace(/\n/g, "↵"));

  const treffer: Array<{ match: RegExpMatchArray; pos: number }> = [];
  let m: RegExpExecArray | null;
  const re = /\b(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g;
  while ((m = re.exec(text)) !== null) treffer.push({ match: m, pos: m.index! });

  console.log("[tachoplus-parser] date matches found:", treffer.length);

  const eintraege: TachoplusEintrag[] = [];
  const geseheneDaten = new Set<string>();

  for (let i = 0; i < treffer.length; i++) {
    const { match, pos } = treffer[i];
    const [, d, mo, y] = match;
    const segmentEnde = treffer[i + 1]?.pos ?? pos + 300;
    const segment = text.slice(pos + match[0].length, segmentEnde);
    const eintrag = parseSegment(d, mo, y, segment);
    const datumKey = `${y}-${mo}-${d}`;
    if (eintrag && !geseheneDaten.has(datumKey)) {
      geseheneDaten.add(datumKey);
      eintraege.push(eintrag);
    }
  }

  return eintraege.sort((a, b) => a.datum.localeCompare(b.datum));
}
