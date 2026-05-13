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

const ZEIT_REGEX = /\b([0-1]?\d|2[0-3]):[0-5]\d\b/g;

function pdfZuBilder(pdfBuffer: Buffer, tmpDir: string): string[] {
  const pdfPath = join(tmpDir, "input.pdf");
  writeFileSync(pdfPath, pdfBuffer);
  execFileSync("pdftoppm", ["-jpeg", "-r", "300", "-l", "5", pdfPath, join(tmpDir, "page")]);
  return readdirSync(tmpDir)
    .filter(f => f.startsWith("page") && f.endsWith(".jpg"))
    .sort()
    .map(f => join(tmpDir, f));
}

function ocrSeite(bildPfad: string, index: number, tmpDir: string): string {
  const outputBase = join(tmpDir, `out_${index}`);
  execFileSync("tesseract", [bildPfad, outputBase, "-l", "deu+eng", "--psm", "11"]);
  return readFileSync(outputBase + ".txt", "utf-8");
}

export async function verarbeiteOcrBild(bildBuffer: Buffer): Promise<OcrErgebnis> {
  const tmpDir = mkdtempSync(join(tmpdir(), "ocr-"));
  try {
    const istPdf = bildBuffer.slice(0, 4).toString() === "%PDF";
    let bildPfade: string[];

    if (istPdf) {
      bildPfade = pdfZuBilder(bildBuffer, tmpDir);
    } else {
      const bildPfad = join(tmpDir, "input.jpg");
      writeFileSync(bildPfad, bildBuffer);
      bildPfade = [bildPfad];
    }

    if (bildPfade.length === 0) {
      throw new Error("Keine Seiten im PDF gefunden.");
    }

    const rohtext = bildPfade.map((p, i) => ocrSeite(p, i, tmpDir)).join("\n");

    const zeilen = rohtext.split("\n").filter(z => z.trim().length > 0);
    const extrahierteZeilen: ExtrahierteZeile[] = [];

    zeilen.forEach((zeile, index) => {
      const matches = [...zeile.matchAll(ZEIT_REGEX)].map(m => m[0]);
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
      vertrauenswuerdigkeit: 0,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
