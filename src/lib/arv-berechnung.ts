import { zeitStringZuMinuten, minutenZuZeitString } from "./zeit-utils";

export interface Pause {
  minuten: number;
  erstelltAm: string;
  endezeit?: string; // "HH:MM" – explizites Pause-Ende (überschreibt erstelltAm für Berechnungen)
}

// ARV-Regel 1 (Schweiz, Art. 15 ArG)
export const ARV = {
  LIMIT_6H: 360,        // 6h in Minuten
  LIMIT_9H: 540,        // 9h in Minuten
  PFLICHT_BIS_6H: 15,   // mind. 15 min Pause bis 6h Arbeit
  PFLICHT_BIS_9H: 30,   // mind. 30 min Pause bis 9h Arbeit
  PFLICHT_UEBER_9H: 45, // mind. 45 min Pause über 9h Arbeit
  MIN_PAUSE: 15,        // Jede Einzelpause muss mind. 15 min lang sein (Art. 15 ArG)
} as const;

// Jede Pause muss mind. 15 min lang sein – fehlende Minuten auf 15 aufrunden
function mindestPauseFehlend(fehlend: number): number {
  return fehlend > 0 ? Math.max(fehlend, ARV.MIN_PAUSE) : 0;
}

export type ArvNotifTyp =
  | "ARV_6H_30MIN"
  | "ARV_6H_15MIN"
  | "ARV_9H_30MIN"
  | "ARV_9H_15MIN";

interface Checkpoint {
  typ: ArvNotifTyp;
  nettoMin: number;       // Netto-Arbeitsminuten bei denen die Benachrichtigung auslöst
  pausenPflicht: number;  // Benötigte Gesamtpause zu diesem Zeitpunkt
  titel: string;
  body: string;
}

const CHECKPOINTS: Checkpoint[] = [
  {
    typ: "ARV_6H_30MIN",
    nettoMin: ARV.LIMIT_6H - 30,
    pausenPflicht: ARV.PFLICHT_BIS_6H,
    titel: "ARV Erinnerung",
    body: "In 30 min sind 6h Arbeitszeit erreicht – mindestens 15 min Pause nötig.",
  },
  {
    typ: "ARV_6H_15MIN",
    nettoMin: ARV.LIMIT_6H - 15,
    pausenPflicht: ARV.PFLICHT_BIS_6H,
    titel: "ARV Pause fällig!",
    body: "In 15 min Pause fällig. Bis 6h Arbeitszeit: mind. 15 min Pause.",
  },
  {
    typ: "ARV_9H_30MIN",
    nettoMin: ARV.LIMIT_9H - 30,
    pausenPflicht: ARV.PFLICHT_BIS_9H,
    titel: "ARV Erinnerung",
    body: "In 30 min sind 9h Arbeitszeit erreicht – mindestens 30 min Pause total nötig.",
  },
  {
    typ: "ARV_9H_15MIN",
    nettoMin: ARV.LIMIT_9H - 15,
    pausenPflicht: ARV.PFLICHT_BIS_9H,
    titel: "ARV Pause fällig!",
    body: "In 15 min Pause fällig. Bis 9h Arbeitszeit: mind. 30 min Pause total.",
  },
];

export function gesamtPausenMinuten(pausen: Pause[]): number {
  return pausen.reduce((s, p) => s + p.minuten, 0);
}

/**
 * Netto-Arbeitsminuten = (Jetzt - Start) - Gesamtpausen
 */
export function berechneNettoMinuten(
  startzeit: string,
  jetztMinutenAbsMitternacht: number,
  pausen: Pause[]
): number {
  const start = zeitStringZuMinuten(startzeit);
  return Math.max(0, jetztMinutenAbsMitternacht - start - gesamtPausenMinuten(pausen));
}

/**
 * Absoluter Wanduhrzeitpunkt (Minuten ab Mitternacht) bei dem ein Checkpoint feuert:
 * absolutWallClock = start + nettoMin + gesamtPausen
 */
function checkpointZuAbsolutMin(
  startzeit: string,
  nettoMin: number,
  pausen: Pause[]
): number {
  return zeitStringZuMinuten(startzeit) + nettoMin + gesamtPausenMinuten(pausen);
}

/**
 * Gibt die nächste fällige ARV-Benachrichtigung zurück,
 * oder null wenn keine mehr nötig / alle schon gesendet.
 */
export function naechsteArvNotification(
  startzeit: string,
  pausen: Pause[],
  bereitsGesendet: string[]
): { typ: ArvNotifTyp; faelligUm: Date; titel: string; body: string } | null {
  const gesamtPausen = gesamtPausenMinuten(pausen);
  const jetzt = new Date();

  for (const cp of CHECKPOINTS) {
    if (bereitsGesendet.includes(cp.typ)) continue;
    if (gesamtPausen >= cp.pausenPflicht) continue; // Pflichtpause bereits erfüllt

    const absolutMin = checkpointZuAbsolutMin(startzeit, cp.nettoMin, pausen);
    const faelligUm = new Date();
    faelligUm.setHours(Math.floor(absolutMin / 60), absolutMin % 60, 0, 0);

    if (faelligUm > jetzt) {
      return { typ: cp.typ, faelligUm, titel: cp.titel, body: cp.body };
    }
  }

  return null;
}

/**
 * Prüft beim Feierabend: >9h Arbeit ohne 45 min Pause → ARV-Verletzung
 */
export function pruefeFeierabendArv(
  startzeit: string,
  endzeit: string,
  pausen: Pause[]
): { verletzt: boolean; fehlendeMinuten: number } {
  const nettoMin =
    zeitStringZuMinuten(endzeit) -
    zeitStringZuMinuten(startzeit) -
    gesamtPausenMinuten(pausen);

  if (nettoMin > ARV.LIMIT_9H) {
    const fehlend = mindestPauseFehlend(Math.max(0, ARV.PFLICHT_UEBER_9H - gesamtPausenMinuten(pausen)));
    if (fehlend > 0) return { verletzt: true, fehlendeMinuten: fehlend };
  }
  return { verletzt: false, fehlendeMinuten: 0 };
}

/**
 * ARV-Status für Live-Anzeige im Tracker
 */
export function arvStatus(
  nettoMinuten: number,
  gesamtPausenMin: number
): { farbe: "gruen" | "gelb" | "rot"; text: string } {
  if (nettoMinuten >= ARV.LIMIT_9H) {
    if (gesamtPausenMin >= ARV.PFLICHT_UEBER_9H)
      return { farbe: "gruen", text: "ARV OK – 45 min Pause ✓" };
    const fehlend = mindestPauseFehlend(ARV.PFLICHT_UEBER_9H - gesamtPausenMin);
    return { farbe: "rot", text: `ARV: noch ${fehlend} min Pause nötig (45 min Pflicht >9h)` };
  }
  if (nettoMinuten >= ARV.LIMIT_6H) {
    if (gesamtPausenMin >= ARV.PFLICHT_BIS_9H)
      return { farbe: "gruen", text: "ARV OK – 30 min Pause ✓" };
    if (gesamtPausenMin >= ARV.PFLICHT_BIS_6H) {
      const fehlend = mindestPauseFehlend(ARV.PFLICHT_BIS_9H - gesamtPausenMin);
      return { farbe: "gelb", text: `ARV: noch ${fehlend} min für 9h-Regel` };
    }
    const fehlend = mindestPauseFehlend(ARV.PFLICHT_BIS_6H - gesamtPausenMin);
    return { farbe: "rot", text: `ARV: ${fehlend} min Pause fehlen (15 min Pflicht bis 6h)` };
  }
  const bisLimit = ARV.LIMIT_6H - nettoMinuten;
  if (bisLimit <= 30 && gesamtPausenMin < ARV.PFLICHT_BIS_6H) {
    return { farbe: "gelb", text: `ARV: In ${bisLimit} min Pause fällig (15 min)` };
  }
  return { farbe: "gruen", text: "ARV OK" };
}

export interface PausenDeadlines {
  // Wenn keine Pause: beide Deadlines anzeigen
  ersteDeadline: string | null;    // "HH:MM" – späteste 1. Pause (6h-Regel)
  zweiteDeadline: string | null;   // "HH:MM" – späteste 2. Pause (9h-Regel)
  // Wenn Pause(n) vorhanden: nächste Deadline
  naechsteDeadline: string | null; // "HH:MM"
  naechsteTyp: "sechs_stunden" | "neun_stunden" | null;
}

/**
 * Berechnet die spätesten Pausenzeiten basierend auf:
 * - 6h-Regel: max. 6h am Stück ohne Pause (Art. 15 ArG)
 * - 9h-Netto-Regel: bei 9h Netto muss mind. 30min Pause total gemacht worden sein
 *
 * Wenn keine Pause: zeigt 1. Deadline (start+6h) und 2. Deadline (start+9h15min)
 * Nach einer Pause: zeigt min(letzte_pause_ende+6h, start+9h15min)
 */
export function berechnePausenDeadlines(
  startzeit: string,
  pausen: Pause[]
): PausenDeadlines {
  const startMin = zeitStringZuMinuten(startzeit);
  const gesamtPausen = gesamtPausenMinuten(pausen);

  // 9h-Netto-Deadline: start + 9h + 15min (Mindestpause) = absoluter spätester Zeitpunkt
  const neunStundenDeadlineMin = startMin + ARV.LIMIT_9H + ARV.PFLICHT_BIS_6H;

  if (pausen.length === 0) {
    return {
      ersteDeadline: minutenZuZeitString(startMin + ARV.LIMIT_6H),
      zweiteDeadline: minutenZuZeitString(neunStundenDeadlineMin),
      naechsteDeadline: null,
      naechsteTyp: null,
    };
  }

  // Letzte Pause: endezeit hat Vorrang, sonst erstelltAm als Fallback
  const letztePause = pausen[pausen.length - 1];
  const letztePauseEndMin = letztePause.endezeit
    ? zeitStringZuMinuten(letztePause.endezeit)
    : (() => {
        const d = new Date(letztePause.erstelltAm);
        return d.getHours() * 60 + d.getMinutes();
      })();

  const sechsStundenDeadlineMin = letztePauseEndMin + ARV.LIMIT_6H;

  // 9h-Regel bereits erfüllt (≥30min Pause): nur noch 6h-Regel relevant
  if (gesamtPausen >= ARV.PFLICHT_BIS_9H) {
    return {
      ersteDeadline: null,
      zweiteDeadline: null,
      naechsteDeadline: minutenZuZeitString(sechsStundenDeadlineMin),
      naechsteTyp: "sechs_stunden",
    };
  }

  const naechsteMin = Math.min(sechsStundenDeadlineMin, neunStundenDeadlineMin);
  const naechsteTyp =
    sechsStundenDeadlineMin <= neunStundenDeadlineMin
      ? "sechs_stunden"
      : "neun_stunden";

  return {
    ersteDeadline: null,
    zweiteDeadline: null,
    naechsteDeadline: minutenZuZeitString(naechsteMin),
    naechsteTyp,
  };
}

export { minutenZuZeitString };
