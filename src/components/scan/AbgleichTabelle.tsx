"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ExtrahierteZeile } from "@/types/ocr";

interface ZeitEintragSimple {
  datum: string;
  startzeit: string;
  endzeit: string;
  pauseDauer: number;
}

interface AbgleichTabelleProps {
  extrahierteZeilen: ExtrahierteZeile[];
  erfassteEintraege: ZeitEintragSimple[];
}

function zeitZuMinuten(zeit: string): number {
  const [h, m] = zeit.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function weichtAb(a?: string, b?: string, schwelle = 5): boolean {
  if (!a || !b) return true;
  return Math.abs(zeitZuMinuten(a) - zeitZuMinuten(b)) > schwelle;
}

function formatDatum(iso?: string): string {
  if (!iso) return "–";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function AbgleichTabelle({ extrahierteZeilen, erfassteEintraege }: AbgleichTabelleProps) {
  const hatDaten = extrahierteZeilen.some(z => z.datum);

  // Datum-basierter Abgleich wenn Claude API genutzt wurde
  const erfasstByDatum = new Map(erfassteEintraege.map(e => [e.datum, e]));

  // Alle Datümer sammeln (OCR + Erfasst), sortieren
  const alleDaten = hatDaten
    ? [...new Set([
        ...extrahierteZeilen.map(z => z.datum!),
        ...erfassteEintraege.map(e => e.datum),
      ])].sort()
    : null;

  const ocrByDatum = new Map(extrahierteZeilen.filter(z => z.datum).map(z => [z.datum!, z]));

  let abweichungen = 0;

  const zeilen = alleDaten
    ? alleDaten.map((datum, i) => {
        const ocr = ocrByDatum.get(datum) ?? null;
        const erfasst = erfasstByDatum.get(datum) ?? null;
        const startAbw = ocr && erfasst ? weichtAb(ocr.startzeit, erfasst.startzeit) : !!(ocr || erfasst);
        const endAbw = ocr && erfasst ? weichtAb(ocr.endzeit, erfasst.endzeit) : !!(ocr || erfasst);
        const hatAbw = !ocr || !erfasst || startAbw || endAbw;
        if (hatAbw) abweichungen++;
        return { index: i, datum, ocr, erfasst, startAbw, endAbw, nurOcr: !!ocr && !erfasst, nurErfasst: !ocr && !!erfasst };
      })
    : Array.from({ length: Math.max(extrahierteZeilen.length, erfassteEintraege.length) }, (_, i) => {
        const ocr = extrahierteZeilen[i] ?? null;
        const erfasst = erfassteEintraege[i] ?? null;
        const startAbw = ocr && erfasst ? weichtAb(ocr.startzeit, erfasst.startzeit) : false;
        const endAbw = ocr && erfasst ? weichtAb(ocr.endzeit, erfasst.endzeit) : false;
        const hatAbw = !ocr || !erfasst || startAbw || endAbw;
        if (hatAbw) abweichungen++;
        return { index: i, datum: undefined as string | undefined, ocr, erfasst, startAbw, endAbw, nurOcr: !!ocr && !erfasst, nurErfasst: !ocr && !!erfasst };
      });

  if (zeilen.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Abgleich</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Keine Daten zum Vergleichen vorhanden.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Abgleich</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {hatDaten && <TableHead>Datum</TableHead>}
                <TableHead colSpan={2} className="border-r text-center font-semibold">Scan (Firma)</TableHead>
                <TableHead colSpan={2} className="text-center font-semibold">Erfasst</TableHead>
              </TableRow>
              <TableRow>
                {hatDaten && <TableHead />}
                <TableHead>Start</TableHead>
                <TableHead className="border-r">Ende</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Ende</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zeilen.map((z) => (
                <TableRow
                  key={z.datum ?? z.index}
                  className={z.nurOcr ? "bg-red-50 dark:bg-red-950/30" : z.nurErfasst ? "bg-orange-50 dark:bg-orange-950/30" : ""}
                >
                  {hatDaten && (
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {formatDatum(z.datum)}
                    </TableCell>
                  )}
                  <TableCell className={z.startAbw && z.erfasst ? "bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200" : ""}>
                    {z.ocr?.startzeit ?? "–"}
                  </TableCell>
                  <TableCell className={`border-r ${z.endAbw && z.erfasst ? "bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200" : ""}`}>
                    {z.ocr?.endzeit ?? "–"}
                  </TableCell>
                  <TableCell className={z.startAbw && z.ocr ? "bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200" : ""}>
                    {z.erfasst?.startzeit ?? "–"}
                  </TableCell>
                  <TableCell className={z.endAbw && z.ocr ? "bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200" : ""}>
                    {z.erfasst?.endzeit ?? "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {abweichungen > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>{abweichungen} Abweichung{abweichungen !== 1 ? "en" : ""} gefunden</AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
            <AlertDescription>Keine Abweichungen gefunden ✓</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
