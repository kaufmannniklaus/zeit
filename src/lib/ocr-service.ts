import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { parseTachoPlusPdf } from "./tachoplus-parser";
import type { OcrResult, ExtrahierteZeile } from "@/types/ocr";

const ZEIT_REGEX = /\b([0-1]?\d|2[0-3]):[0-5]\d\b/g;

function bildMitTesseract(bildBuffer: Buffer): ExtrahierteZeile[] {
  const tmpDir = mkdtempSync(join(tmpdir(), "ocr-"));
  try {
    const bildPfad = join(tmpDir, "input.jpg");
    const outputBase = join(tmpDir, "out");
    writeFileSync(bildPfad, bildBuffer);
    execFileSync("tesseract", [bildPfad, outputBase, "-l", "deu+eng", "--psm", "11"]);
    const rohtext = readFileSync(outputBase + ".txt", "utf-8");

    const ergebnis: ExtrahierteZeile[] = [];
    rohtext.split("\n").filter(z => z.trim()).forEach((zeile, i) => {
      const matches = [...zeile.matchAll(ZEIT_REGEX)].map(m => m[0]);
      if (matches.length >= 2) {
        ergebnis.push({ zeile: i + 1, rohtext: zeile.trim(), startzeit: matches[0], endzeit: matches[1], pause: matches[2] });
      }
    });
    return ergebnis;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function verarbeiteOcrBild(bildBuffer: Buffer): Promise<OcrResult> {
  const istPdf = bildBuffer.slice(0, 4).toString() === "%PDF";

  if (istPdf) {
    const eintraege = await parseTachoPlusPdf(bildBuffer);
    const zeilen: ExtrahierteZeile[] = eintraege.map((e, i) => ({
      zeile: i + 1,
      rohtext: `${e.datum} ${e.startzeit}–${e.endzeit} Pause: ${e.pauseMinuten}min`,
      datum: e.datum,
      startzeit: e.startzeit,
      endzeit: e.endzeit,
      pauseMinuten: e.pauseMinuten,
      pauseBerechnet: e.pauseBerechnet,
    }));
    return {
      rohtextOcr: zeilen.map(z => z.rohtext).join("\n"),
      extrahierteZeilen: zeilen,
      vertrauenswuerdigkeit: 100,
    };
  }

  const zeilen = bildMitTesseract(bildBuffer);
  return {
    rohtextOcr: zeilen.map(z => z.rohtext).join("\n"),
    extrahierteZeilen: zeilen,
    vertrauenswuerdigkeit: 0,
  };
}
