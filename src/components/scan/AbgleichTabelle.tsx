"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [stunden, minuten] = zeit.split(":").map(Number);
  return (stunden || 0) * 60 + (minuten || 0);
}

function zeitenWeichenAb(a?: string, b?: string, schwelle = 5): boolean {
  if (!a || !b) return true;
  return Math.abs(zeitZuMinuten(a) - zeitZuMinuten(b)) > schwelle;
}

export function AbgleichTabelle({
  extrahierteZeilen,
  erfassteEintraege,
}: AbgleichTabelleProps) {
  const maxRows = Math.max(extrahierteZeilen.length, erfassteEintraege.length);
  let abweichungen = 0;

  const zeilen = Array.from({ length: maxRows }, (_, i) => {
    const ocr = extrahierteZeilen[i] || null;
    const erfasst = erfassteEintraege[i] || null;

    const keineErfasst = ocr && !erfasst;
    const keineOcr = !ocr && erfasst;
    const startAbweichung =
      ocr && erfasst ? zeitenWeichenAb(ocr.startzeit, erfasst.startzeit) : false;
    const endAbweichung =
      ocr && erfasst ? zeitenWeichenAb(ocr.endzeit, erfasst.endzeit) : false;

    const hatAbweichung =
      keineErfasst || keineOcr || startAbweichung || endAbweichung;
    if (hatAbweichung) abweichungen++;

    return {
      index: i,
      ocr,
      erfasst,
      keineErfasst,
      keineOcr,
      startAbweichung,
      endAbweichung,
    };
  });

  if (maxRows === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Abgleich</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Keine Daten zum Vergleichen vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abgleich</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead
                  colSpan={2}
                  className="border-r text-center font-semibold"
                >
                  Scan (OCR)
                </TableHead>
                <TableHead colSpan={2} className="text-center font-semibold">
                  Erfasst
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Start</TableHead>
                <TableHead className="border-r">Ende</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Ende</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zeilen.map((z) => {
                let rowClass = "";
                if (z.keineErfasst) rowClass = "bg-red-50 dark:bg-red-950/30";
                else if (z.keineOcr) rowClass = "bg-orange-50 dark:bg-orange-950/30";

                return (
                  <TableRow key={z.index} className={rowClass}>
                    <TableCell className="font-mono text-xs">
                      {z.index + 1}
                    </TableCell>
                    <TableCell>
                      {z.ocr?.startzeit || "-"}
                    </TableCell>
                    <TableCell className="border-r">
                      {z.ocr?.endzeit || "-"}
                    </TableCell>
                    <TableCell
                      className={
                        z.startAbweichung
                          ? "bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200"
                          : ""
                      }
                    >
                      {z.erfasst?.startzeit || "-"}
                    </TableCell>
                    <TableCell
                      className={
                        z.endAbweichung
                          ? "bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200"
                          : ""
                      }
                    >
                      {z.erfasst?.endzeit || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {abweichungen > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              {abweichungen} Abweichung{abweichungen !== 1 ? "en" : ""} gefunden
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
            <AlertDescription>Keine Abweichungen gefunden</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
