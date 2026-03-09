import Tesseract from "tesseract.js";

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

/**
 * Verarbeitet einen Bild-Buffer mit Tesseract.js und extrahiert Zeitangaben.
 */
export async function verarbeiteOcrBild(
  bildBuffer: Buffer
): Promise<OcrErgebnis> {
  const worker = await Tesseract.createWorker(["deu", "eng"], 1, {
    logger: () => {}, // Kein Logging
  });

  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // PSM 6: gleichmäßiger Textblock
  });

  const { data } = await worker.recognize(bildBuffer);
  await worker.terminate();

  const rohtext = data.text;
  const vertrauenswuerdigkeit = Math.round(data.confidence);

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
