import { inflateSync } from "zlib";

export interface TachoplusEintrag {
  datum: string;       // YYYY-MM-DD
  startzeit: string;   // HH:MM
  endzeit: string;     // HH:MM
  pauseMinuten: number;
  pauseBerechnet: boolean;
}

// ── PDF text extraction (no npm deps, Node.js built-ins only) ──────────────

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

function extractTextFromStream(content: string): string {
  const parts: string[] = [];

  // (literal string) Tj / ' / "
  const litTj = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*T[j'"]/g;
  let m: RegExpExecArray | null;
  while ((m = litTj.exec(content)) !== null) parts.push(decodeLiteral(m[1]) + " ");

  // <hex string> Tj
  const hexTj = /<([0-9a-fA-F\s]+)>\s*T[j'"]/g;
  while ((m = hexTj.exec(content)) !== null) parts.push(hexToStr(m[1]) + " ");

  // [(lit/hex ...) n ...] TJ
  const tjArr = /\[([\s\S]*?)\]\s*TJ/g;
  while ((m = tjArr.exec(content)) !== null) {
    const inner = m[1];
    const lit = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let s: RegExpExecArray | null;
    while ((s = lit.exec(inner)) !== null) parts.push(decodeLiteral(s[1]));
    const hex = /<([0-9a-fA-F\s]+)>/g;
    while ((s = hex.exec(inner)) !== null) parts.push(hexToStr(s[1]));
    parts.push(" ");
  }

  return parts.join("");
}

function extractPdfText(pdfBuffer: Buffer): string {
  const raw = pdfBuffer.toString("binary");
  const out: string[] = [];

  // Find every stream...endstream block (with or without FlateDecode)
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw)) !== null) {
    const bytes = Buffer.from(m[1], "binary");

    // Try deflate-decompress first; fall back to raw if it fails
    let content: string;
    try {
      content = inflateSync(bytes).toString("binary");
    } catch {
      content = m[1];
    }

    const extracted = extractTextFromStream(content);
    if (extracted.trim()) out.push(extracted + "\n");
  }

  return out.join("");
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
  let match: RegExpExecArray | null;
  const re = /\b([0-1]?\d|2[0-3]):([0-5]\d)\b/g;
  while ((match = re.exec(segment)) !== null) alleZeiten.push(zeitZuMinuten(match[0]));

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
    const summe = sorted.slice(0, 3).reduce((a, b) => a + b, 0);
    const berechnete = schichtDauer - summe;
    if (berechnete >= 0 && berechnete <= 120) {
      pauseMinuten = berechnete;
      pauseBerechnet = true;
    } else {
      const kandidat = dauerwerte.find(t => t >= 15 && t <= 90);
      if (kandidat !== undefined) { pauseMinuten = kandidat; pauseBerechnet = true; }
    }
  }

  return { datum, startzeit: minutenZuZeit(startMin), endzeit: minutenZuZeit(endMin), pauseMinuten, pauseBerechnet };
}

export async function parseTachoPlusPdf(pdfBuffer: Buffer): Promise<TachoplusEintrag[]> {
  const text = extractPdfText(pdfBuffer);

  // Log raw text for debugging (first 2000 chars)
  console.log("[tachoplus-parser] raw text sample:", text.slice(0, 2000));

  const treffer: Array<{ match: RegExpMatchArray; pos: number }> = [];
  let m: RegExpExecArray | null;
  const re = /\b(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g;
  while ((m = re.exec(text)) !== null) treffer.push({ match: m, pos: m.index! });

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
