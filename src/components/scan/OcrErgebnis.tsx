"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { OcrResult } from "@/types/ocr";

interface OcrErgebnisProps {
  ergebnis: OcrResult;
}

function vertrauenBadgeVariant(wert: number) {
  if (wert >= 80) return "default" as const;
  if (wert >= 60) return "secondary" as const;
  return "destructive" as const;
}

function vertrauenBadgeClass(wert: number) {
  if (wert >= 80) return "bg-green-100 text-green-800 hover:bg-green-100";
  if (wert >= 60) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  return "bg-red-100 text-red-800 hover:bg-red-100";
}

export function OcrErgebnis({ ergebnis }: OcrErgebnisProps) {
  const anzahlZeitpaare = ergebnis.extrahierteZeilen.filter(
    (z) => z.startzeit && z.endzeit
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{anzahlZeitpaare} Zeitpaare erkannt</CardTitle>
          <Badge
            variant={vertrauenBadgeVariant(ergebnis.vertrauenswuerdigkeit)}
            className={vertrauenBadgeClass(ergebnis.vertrauenswuerdigkeit)}
          >
            {ergebnis.vertrauenswuerdigkeit}% Vertrauen
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ergebnis.extrahierteZeilen.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Zeile</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Ende</TableHead>
                  <TableHead>Pause</TableHead>
                  <TableHead>Rohtext</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ergebnis.extrahierteZeilen.map((zeile) => (
                  <TableRow key={zeile.zeile}>
                    <TableCell className="font-mono text-xs">
                      {zeile.zeile}
                    </TableCell>
                    <TableCell>{zeile.startzeit || "-"}</TableCell>
                    <TableCell>{zeile.endzeit || "-"}</TableCell>
                    <TableCell>{zeile.pause || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {zeile.rohtext}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Keine Zeitpaare im Bild erkannt.
          </p>
        )}

        <Accordion>
          <AccordionItem>
            <AccordionTrigger>Rohen OCR-Text anzeigen</AccordionTrigger>
            <AccordionContent>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-xs">
                {ergebnis.rohtextOcr || "Kein Text erkannt."}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
