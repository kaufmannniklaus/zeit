"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle } from "lucide-react";
import type { ExtrahierteZeile } from "@/types/ocr";

interface ZeitEintragSimple {
  id: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  pauseDauer: number;
}

interface AbgleichTabelleProps {
  extrahierteZeilen: ExtrahierteZeile[];
  erfassteEintraege: ZeitEintragSimple[];
  onUebernehmen: (eintraege: UebernahmeEintrag[]) => Promise<void>;
}

export interface UebernahmeEintrag {
  id: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  pauseDauer: number;
}

function zeitZuMin(z: string): number {
  const [h, m] = z.split(":").map(Number);
  return h * 60 + m;
}

function abw(a?: string | number, b?: string | number, schwelle = 5): boolean {
  if (a === undefined || b === undefined) return true;
  if (typeof a === "string" && typeof b === "string") {
    return Math.abs(zeitZuMin(a) - zeitZuMin(b)) > schwelle;
  }
  return Math.abs(Number(a) - Number(b)) > schwelle;
}

function formatDatum(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function AbgleichTabelle({ extrahierteZeilen, erfassteEintraege, onUebernehmen }: AbgleichTabelleProps) {
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const erfasstByDatum = new Map(erfassteEintraege.map(e => [e.datum, e]));
  const ocrByDatum = new Map(extrahierteZeilen.filter(z => z.datum).map(z => [z.datum!, z]));

  const alleDaten = [...new Set([
    ...extrahierteZeilen.map(z => z.datum).filter(Boolean) as string[],
    ...erfassteEintraege.map(e => e.datum),
  ])].sort();

  if (alleDaten.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Abgleich</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Keine Daten vorhanden.</p></CardContent>
      </Card>
    );
  }

  const zeilen = alleDaten.map(datum => {
    const ocr = ocrByDatum.get(datum) ?? null;
    const erfasst = erfasstByDatum.get(datum) ?? null;
    const startAbw = abw(ocr?.startzeit, erfasst?.startzeit);
    const endAbw = abw(ocr?.endzeit, erfasst?.endzeit);
    const pauseAbw = ocr?.pauseBerechnet ? abw(ocr.pauseMinuten, erfasst?.pauseDauer, 5) : false;
    const hatAbw = !ocr || !erfasst || startAbw || endAbw || pauseAbw;
    const kannUebernehmen = !!(ocr && erfasst && hatAbw);
    return { datum, ocr, erfasst, startAbw, endAbw, pauseAbw, hatAbw, kannUebernehmen };
  });

  const abweichungen = zeilen.filter(z => z.hatAbw).length;
  const uebernehmbar = zeilen.filter(z => z.kannUebernehmen).map(z => z.datum);

  function toggleAlle() {
    if (ausgewaehlt.size === uebernehmbar.length) {
      setAusgewaehlt(new Set());
    } else {
      setAusgewaehlt(new Set(uebernehmbar));
    }
  }

  function toggle(datum: string) {
    const neu = new Set(ausgewaehlt);
    if (neu.has(datum)) neu.delete(datum);
    else neu.add(datum);
    setAusgewaehlt(neu);
  }

  async function handleUebernehmen() {
    const eintraege: UebernahmeEintrag[] = [];
    for (const datum of ausgewaehlt) {
      const z = zeilen.find(z => z.datum === datum);
      if (!z?.ocr || !z?.erfasst) continue;
      eintraege.push({
        id: z.erfasst.id,
        datum,
        startzeit: z.ocr.startzeit!,
        endzeit: z.ocr.endzeit!,
        pauseDauer: z.ocr.pauseBerechnet ? (z.ocr.pauseMinuten ?? z.erfasst.pauseDauer) : z.erfasst.pauseDauer,
      });
    }
    setSaving(true);
    try {
      await onUebernehmen(eintraege);
      setAusgewaehlt(new Set());
    } finally {
      setSaving(false);
    }
  }

  const abwCell = "bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200 font-medium";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Abgleich</span>
          {abweichungen === 0
            ? <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Alles stimmt</Badge>
            : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{abweichungen} Abweichung{abweichungen !== 1 ? "en" : ""}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  {uebernehmbar.length > 0 && (
                    <input type="checkbox"
                      checked={ausgewaehlt.size === uebernehmbar.length && uebernehmbar.length > 0}
                      onChange={toggleAlle}
                      className="cursor-pointer"
                      title="Alle auswählen"
                    />
                  )}
                </TableHead>
                <TableHead>Datum</TableHead>
                <TableHead colSpan={3} className="border-r text-center font-semibold text-xs">Firma (Tachograph)</TableHead>
                <TableHead colSpan={3} className="text-center font-semibold text-xs">Erfasst (App)</TableHead>
              </TableRow>
              <TableRow>
                <TableHead />
                <TableHead />
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">Ende</TableHead>
                <TableHead className="border-r text-xs">Pause</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">Ende</TableHead>
                <TableHead className="text-xs">Pause</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zeilen.map(z => (
                <TableRow
                  key={z.datum}
                  className={!z.ocr ? "bg-orange-50 dark:bg-orange-950/20" : !z.erfasst ? "bg-red-50 dark:bg-red-950/20" : ""}
                >
                  <TableCell>
                    {z.kannUebernehmen && (
                      <input type="checkbox"
                        checked={ausgewaehlt.has(z.datum)}
                        onChange={() => toggle(z.datum)}
                        className="cursor-pointer"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{formatDatum(z.datum)}</TableCell>
                  <TableCell className={z.startAbw && z.erfasst ? abwCell : ""}>{z.ocr?.startzeit ?? "–"}</TableCell>
                  <TableCell className={z.endAbw && z.erfasst ? abwCell : ""}>{z.ocr?.endzeit ?? "–"}</TableCell>
                  <TableCell className={`border-r ${z.pauseAbw && z.erfasst ? abwCell : ""}`}>
                    {z.ocr
                      ? z.ocr.pauseBerechnet
                        ? `${z.ocr.pauseMinuten} min`
                        : <span className="text-muted-foreground text-xs">?</span>
                      : "–"}
                  </TableCell>
                  <TableCell className={z.startAbw && z.ocr ? abwCell : ""}>{z.erfasst?.startzeit ?? "–"}</TableCell>
                  <TableCell className={z.endAbw && z.ocr ? abwCell : ""}>{z.erfasst?.endzeit ?? "–"}</TableCell>
                  <TableCell className={z.pauseAbw && z.ocr ? abwCell : ""}>
                    {z.erfasst !== null ? `${z.erfasst.pauseDauer} min` : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {uebernehmbar.length > 0 && (
          <div className="flex items-center gap-3 pt-2 border-t">
            <p className="text-sm text-muted-foreground flex-1">
              {ausgewaehlt.size === 0
                ? "Wähle Einträge aus um sie mit den Firmendaten zu überschreiben."
                : `${ausgewaehlt.size} Eintrag${ausgewaehlt.size !== 1 ? "e" : ""} ausgewählt`}
            </p>
            {ausgewaehlt.size > 0 && (
              <Button onClick={handleUebernehmen} disabled={saving} variant="destructive" size="sm">
                {saving ? "Wird gespeichert…" : `${ausgewaehlt.size} übernehmen`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
