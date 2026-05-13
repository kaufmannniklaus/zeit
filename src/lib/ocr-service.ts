import Tesseract from "tesseract.js";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, readdirSync, rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface ExtrahierteZeile {
  zeile: number;
  rohtext: string;
  startzeit?: string;
  endzeit?: string;
  pause?: string;
}

export interface OcrErgebnis {
  rohtextOcr: string;
  extrahierteZeilen: ExtrahierteZeile[];
  vertrauenswuerdigkeit: number;
}

// Regex: findet Zeitangaben im Format HH:MM oder H:MM
const ZEIT_REGEX = /\b([0-1]?\d|2[0-3]):[0-5]\d\b/g;

function pdfZuBilder(pdfBuffer: Buffer): Buffer[] {
  const tmpDir = mkdtempSync(join(tmpdir(), "ocr-"));
  try {
    const pdfPath = join(tmpDir, "input.pdf");
    writeFileSync(pdfPath, pdfBuffer);
    execFileSync("pdftoppm", ["-jpeg", "-r", "200", "-l", "5", pdfPath, join(tmpDir, "page")]);
    return readdirSync(tmpDir)
      .filter(f => f.startsWith("page") && f.endsWith(".jpg"))
      .sort()
      .map(f => readFileSync(join(tmpDir, f)));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Verarbeitet einen Bild- oder PDF-Buffer mit Tesseract.js und extrahiert Zeitangaben.
 */
export async function verarbeiteOcrBild(
  bildBuffer: Buffer
): Promise<OcrErgebnis> {
  const istPdf = bildBuffer.slice(0, 4).toString() === "%PDF";
  const bilder = istPdf ? pdfZuBilder(bildBuffer) : [bildBuffer];

  const worker = await Tesseract.createWorker(["deu", "eng"], 1, {
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });

  let rohtext = "";
  let confidence = 0;
  for (const bild of bilder) {
    const { data } = await worker.recognize(bild);
    rohtext += (rohtext ? "\n" : "") + data.text;
    confidence += data.confidence;
  }
  await worker.terminate();
  const vertrauenswuerdigkeit = Math.round(confidence / bilder.length);

  const zeilen = rohtext.split("\n").filter((z) => z.trim().length > 0);
  const extrahierteZeilen: ExtrahierteZeile[] = [];

  zeilen.forEach((zeile, index) => {
    const matches = [...zeile.matchAll(ZEIT_REGEX)].map((m) => m[0]);
    if (matches.length >= 2) {
      const [startzeit, endzeit, pause] = matches;
      extrahierteZeilen.push({
        zeile: index + 1,
        rohtext: zeile.trim(),
        startzeit,
        endzeit,
        pause,
      });
    }
  });

  return {
    rohtextOcr: rohtext,
    extrahierteZeilen,
    vertrauenswuerdigkeit,
  };
}
