import { getISOWeek, getISOWeekYear, subDays, startOfDay } from "date-fns";

interface ZeitEintragKpi {
  datum: Date;
  effektivzeit: number;
}

interface KpiErgebnis {
  ueberstundenMinuten: number;
  durchschnittWocheMinuten: number;
  durchschnittTagMinuten: number;
  schnitt26WochenMinuten: number;
  erlaubteMinutenNaechsteWoche: number;
  sollstundenProWocheMinuten: number;
}

function countDistinktKW(eintraege: ZeitEintragKpi[]): number {
  const kws = new Set(
    eintraege.map((e) => `${getISOWeekYear(e.datum)}-${getISOWeek(e.datum)}`)
  );
  return kws.size;
}

function countDistinktTage(eintraege: ZeitEintragKpi[]): number {
  const tage = new Set(eintraege.map((e) => e.datum.toISOString().split("T")[0]));
  return tage.size;
}

export function berechneKpis(
  alleEintraege: ZeitEintragKpi[],
  sollstundenProWoche: number,
  ueberstundenSaldoMinuten: number = 0
): KpiErgebnis {
  const sollMinutenProWoche = Math.round(sollstundenProWoche * 60);
  const heute = startOfDay(new Date());

  const gesamtIstMinuten = alleEintraege.reduce(
    (sum, e) => sum + e.effektivzeit,
    0
  );

  const anzahlKW = countDistinktKW(alleEintraege);
  const gesamtSollMinuten = anzahlKW * sollMinutenProWoche;
  const ueberstundenMinuten =
    ueberstundenSaldoMinuten + gesamtIstMinuten - gesamtSollMinuten;

  const durchschnittWocheMinuten =
    anzahlKW > 0 ? Math.round(gesamtIstMinuten / anzahlKW) : 0;

  const anzahlTage = countDistinktTage(alleEintraege);
  const durchschnittTagMinuten =
    anzahlTage > 0 ? Math.round(gesamtIstMinuten / anzahlTage) : 0;

  const vor26Wochen = subDays(heute, 182);
  const eintraege26W = alleEintraege.filter(
    (e) => e.datum >= vor26Wochen && e.datum <= heute
  );
  const summe26W = eintraege26W.reduce((sum, e) => sum + e.effektivzeit, 0);
  const schnitt26WochenMinuten = Math.round(summe26W / 26);

  const maxMinutenProWoche = 48 * 60;
  let erlaubteMinutenNaechsteWoche: number;

  if (schnitt26WochenMinuten <= maxMinutenProWoche) {
    erlaubteMinutenNaechsteWoche = maxMinutenProWoche;
  } else {
    const vor25Wochen = subDays(heute, 175);
    const eintraege25W = alleEintraege.filter(
      (e) => e.datum >= vor25Wochen && e.datum <= heute
    );
    const summe25W = eintraege25W.reduce((sum, e) => sum + e.effektivzeit, 0);
    erlaubteMinutenNaechsteWoche = Math.max(
      0,
      maxMinutenProWoche * 26 - summe25W
    );
  }

  return {
    ueberstundenMinuten,
    durchschnittWocheMinuten,
    durchschnittTagMinuten,
    schnitt26WochenMinuten,
    erlaubteMinutenNaechsteWoche,
    sollstundenProWocheMinuten: sollMinutenProWoche,
  };
}
