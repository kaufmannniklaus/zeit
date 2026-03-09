export interface ZeitEintrag {
  id: string;
  datum: string; // YYYY-MM-DD
  startzeit: string; // HH:MM
  endzeit: string; // HH:MM
  pauseDauer: number;
  effektivzeit: number; // minutes
  notiz?: string | null;
  erstelltAm: string;
}

export interface Absenz {
  id: string;
  datum: string; // YYYY-MM-DD
  typ: "FERIEN" | "KRANK" | "FEIERTAG" | "SONSTIGES";
  bezeichnung?: string | null;
  erstelltAm: string;
}

export interface KpiDaten {
  ueberstundenMinuten: number;
  durchschnittWocheMinuten: number;
  durchschnittTagMinuten: number;
  schnitt26WochenMinuten: number;
  erlaubteMinutenNaechsteWoche: number;
  sollstundenProWocheMinuten: number;
}
