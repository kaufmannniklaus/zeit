export interface ExtrahierteZeile {
  zeile: number;
  rohtext: string;
  startzeit?: string;
  endzeit?: string;
  pause?: string;
}

export interface OcrResult {
  rohtextOcr: string;
  extrahierteZeilen: ExtrahierteZeile[];
  vertrauenswuerdigkeit: number;
}
