export interface ExtrahierteZeile {
  zeile: number;
  rohtext: string;
  datum?: string;       // YYYY-MM-DD (aus Claude API)
  startzeit?: string;
  endzeit?: string;
  pauseMinuten?: number;
  pause?: string;       // legacy: HH:MM aus Tesseract
}

export interface OcrResult {
  rohtextOcr: string;
  extrahierteZeilen: ExtrahierteZeile[];
  vertrauenswuerdigkeit: number;
}
