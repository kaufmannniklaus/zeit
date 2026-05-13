import pdfParse from "pdf-parse";

export interface TachoplusEintrag {
  datum: string;       // YYYY-MM-DD
  startzeit: string;   // HH:MM
  endzeit: string;     // HH:MM
  pauseMinuten: number; // 0 = nicht ermittelbar
  pauseBerechnet: boolean; // true = aus PDF extrahiert, false = unbekannt
}

// Findet "DD.MM.YYYY Mo/Di/..." – nur Werktage mit tatsächlichen Einträgen
const DATUM_RE = /\b(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g;
// Zeitwert HH:MM
const ZEIT_RE = /\b([0-1]?\d|2[0-3]):([0-5]\d)\b/g;

function zeitZuMinuten(z: string): number {
  const [h, m] = z.split(":").map(Number);
  return h * 60 + m;
}

function minutenZuZeit(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function parseSegment(
  d: string, m: string, y: string,
  segment: string
): TachoplusEintrag | null {
  const datum = `${y}-${m}-${d}`;

  // Alle Zeitwerte aus dem Segment extrahieren
  const alleZeiten: number[] = [];
  let match;
  const re = /\b([0-1]?\d|2[0-3]):([0-5]\d)\b/g;
  while ((match = re.exec(segment)) !== null) {
    alleZeiten.push(zeitZuMinuten(match[0]));
  }

  if (alleZeiten.length < 2) return null;

  // Wanduhrzeiten: >= 03:00 und <= 23:59 (Anfang + Ende sind Tageszeiten)
  const wanduhrzeiten = alleZeiten.filter(t => t >= 180 && t <= 1439);
  if (wanduhrzeiten.length < 2) return null;

  const startMin = wanduhrzeiten[0];
  const endMin = wanduhrzeiten[1];
  if (endMin <= startMin || endMin - startMin > 16 * 60) return null;

  const schichtDauer = endMin - startMin;

  // Pause: nach Anfang/Ende suche nach Dauer-Werten im plausiblen Bereich (15–120 min)
  // Dauerwerte sind < 180 min (keine Wanduhrzeit)
  const dauerwerte = alleZeiten.filter(t => t > 0 && t < 180);

  // Heuristik: Pause ≈ Schichtdauer minus Summe der grössten Arbeitskategorien
  // Wenn Summe aller Dauerwerte annähernd Schichtdauer = sind es Arbeitskategorien
  let pauseMinuten = 0;
  let pauseBerechnet = false;

  if (dauerwerte.length >= 2) {
    // Sortiere absteigend – grösste Werte sind wahrscheinlich Lenken, Sonstige, Bereitschaft
    const sorted = [...dauerwerte].sort((a, b) => b - a);
    const summe = sorted.slice(0, 3).reduce((a, b) => a + b, 0);
    const berechnete = schichtDauer - summe;

    if (berechnete >= 0 && berechnete <= 120) {
      pauseMinuten = berechnete;
      pauseBerechnet = true;
    } else {
      // Fallback: kleinsten plausiblen Wert (15–90 min) nehmen
      const kandidat = dauerwerte.find(t => t >= 15 && t <= 90);
      if (kandidat !== undefined) {
        pauseMinuten = kandidat;
        pauseBerechnet = true;
      }
    }
  }

  return {
    datum,
    startzeit: minutenZuZeit(startMin),
    endzeit: minutenZuZeit(endMin),
    pauseMinuten,
    pauseBerechnet,
  };
}

export async function parseTachoPlusPdf(pdfBuffer: Buffer): Promise<TachoplusEintrag[]> {
  const { text } = await pdfParse(pdfBuffer);

  // Alle Datumstreffer mit Position finden
  const treffer: Array<{ match: RegExpMatchArray; pos: number }> = [];
  let m;
  const re = /\b(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g;
  while ((m = re.exec(text)) !== null) {
    treffer.push({ match: m, pos: m.index! });
  }

  const eintraege: TachoplusEintrag[] = [];
  const geseheneDaten = new Set<string>();

  for (let i = 0; i < treffer.length; i++) {
    const { match, pos } = treffer[i];
    const [, d, mo, y] = match;
    // Segment bis zum nächsten Datum-Treffer (max. 300 Zeichen)
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
