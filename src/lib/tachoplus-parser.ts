import { inflateSync } from "zlib";

export interface TachoplusEintrag {
  datum: string;       // YYYY-MM-DD
  startzeit: string;   // HH:MM
  endzeit: string;     // HH:MM
  pauseMinuten: number;
  pauseBerechnet: boolean;
}

// Extracts all visible text from a PDF using only Node.js built-ins (no npm).
// Handles FlateDecode-compressed and uncompressed content streams.
function extractPdfText(pdfBuffer: Buffer): string {
  // Work in binary (latin1) to preserve raw byte values
  const data = pdfBuffer.toString("binary");
  const parts: string[] = [];

  // Match every stream...endstream block together with its dictionary header
  const streamRe = /(<<[\s\S]{1,1000}?>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;

  while ((m = streamRe.exec(data)) !== null) {
    const header = m[1];
    const raw = m[2];

    let content = raw;

    if (header.includes("/FlateDecode")) {
      try {
        content = inflateSync(Buffer.from(raw, "binary")).toString("binary");
      } catch {
        continue;
      }
    }

    // Skip non-text streams (images, fonts, etc.) – only keep streams that
    // contain PDF text operators
    if (!content.includes(" Tj") && !content.includes(") Tj") && !content.includes("] TJ")) {
      continue;
    }

    // Extract literal strings from BT...ET text blocks
    const btRe = /BT([\s\S]*?)ET/g;
    let bt: RegExpExecArray | null;
    while ((bt = btRe.exec(content)) !== null) {
      const block = bt[1];

      // (string) Tj  or  (string) '
      const tjRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*T[j'"]/g;
      let tj: RegExpExecArray | null;
      while ((tj = tjRe.exec(block)) !== null) {
        parts.push(decodePdfString(tj[1]));
      }

      // [(str1) n (str2) ...] TJ
      const tjArrRe = /\[([\s\S]*?)\]\s*TJ/g;
      let tja: RegExpExecArray | null;
      while ((tja = tjArrRe.exec(block)) !== null) {
        const strRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
        let s: RegExpExecArray | null;
        while ((s = strRe.exec(tja[1])) !== null) {
          parts.push(decodePdfString(s[1]));
        }
        parts.push(" ");
      }

      parts.push("\n");
    }
  }

  return parts.join("");
}

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")");
}

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
  let match;
  const re = /\b([0-1]?\d|2[0-3]):([0-5]\d)\b/g;
  while ((match = re.exec(segment)) !== null) {
    alleZeiten.push(zeitZuMinuten(match[0]));
  }

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
      if (kandidat !== undefined) {
        pauseMinuten = kandidat;
        pauseBerechnet = true;
      }
    }
  }

  return { datum, startzeit: minutenZuZeit(startMin), endzeit: minutenZuZeit(endMin), pauseMinuten, pauseBerechnet };
}

export async function parseTachoPlusPdf(pdfBuffer: Buffer): Promise<TachoplusEintrag[]> {
  const text = extractPdfText(pdfBuffer);

  const treffer: Array<{ match: RegExpMatchArray; pos: number }> = [];
  let m: RegExpExecArray | null;
  const re = /\b(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g;
  while ((m = re.exec(text)) !== null) {
    treffer.push({ match: m, pos: m.index! });
  }

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
