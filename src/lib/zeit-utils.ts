/**
 * Konvertiert "HH:MM"-String in Minuten seit Mitternacht.
 */
export function zeitStringZuMinuten(zeit: string): number {
  const [h, m] = zeit.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Konvertiert Minuten seit Mitternacht in "HH:MM"-String.
 */
export function minutenZuZeitString(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Berechnet effektive Arbeitszeit in Minuten.
 */
export function berechneEffektivzeit(
  startzeit: string,
  endzeit: string,
  pauseDauer: number
): number {
  const start = zeitStringZuMinuten(startzeit);
  const end = zeitStringZuMinuten(endzeit);
  return Math.max(0, end - start - pauseDauer);
}

/**
 * Formatiert Minuten als lesbaren String, z.B. "7h 30m".
 */
export function formatiereDauer(minuten: number): string {
  if (minuten < 0) {
    return `-${formatiereDauer(Math.abs(minuten))}`;
  }
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formatiert Minuten als Dezimalstunden, z.B. 7.5.
 */
export function minutenZuStunden(minuten: number): number {
  return Math.round((minuten / 60) * 100) / 100;
}

/**
 * Gibt ISO-Datumsstring (YYYY-MM-DD) für ein Date-Objekt zurück.
 */
export function datumZuString(datum: Date): string {
  return datum.toISOString().split("T")[0];
}

/**
 * Extrahiert HH:MM aus einem DateTime-Objekt.
 */
export function datumZuZeitString(datum: Date): string {
  return datum.toISOString().substring(11, 16);
}
