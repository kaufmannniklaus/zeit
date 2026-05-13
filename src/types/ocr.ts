export interface ExtrahierteZeile {
  zeile: number;
  rohtext: string;
  datum?: string;          // YYYY-MM-DD
  startzeit?: string;      // HH:MM
  endzeit?: string;        // HH:MM
  pauseMinuten?: number;   // Minuten
  pauseBerechnet?: boolean; // false = Schätzung, true = aus PDF
  pause?: string;          // legacy Tesseract
}

export interface OcrResult {
  rohtextOcr: string;
  extrahierteZeilen: ExtrahierteZeile[];
  vertrauenswuerdigkeit: number;
}
