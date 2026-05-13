"use client";

import { useState } from "react";
import { BildUpload } from "@/components/scan/BildUpload";
import { OcrErgebnis } from "@/components/scan/OcrErgebnis";
import { AbgleichTabelle } from "@/components/scan/AbgleichTabelle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OcrResult } from "@/types/ocr";
import type { ZeitEintrag } from "@/types/index";

interface ZeitEintragSimple {
  datum: string;
  startzeit: string;
  endzeit: string;
  pauseDauer: number;
}

export function ScanClient() {
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [vonDatum, setVonDatum] = useState("");
  const [bisDatum, setBisDatum] = useState("");
  const [vergleichsEintraege, setVergleichsEintraege] = useState<
    ZeitEintragSimple[]
  >([]);
  const [vergleichLoading, setVergleichLoading] = useState(false);
  const [vergleichError, setVergleichError] = useState<string | null>(null);

  function handleOcrComplete(result: OcrResult) {
    setOcrResult(result);
    // Datumsbereich automatisch aus OCR-Ergebnis setzen
    const daten = result.extrahierteZeilen.map(z => z.datum).filter(Boolean) as string[];
    if (daten.length > 0) {
      const von = daten.reduce((a, b) => (a < b ? a : b));
      const bis = daten.reduce((a, b) => (a > b ? a : b));
      setVonDatum(von);
      setBisDatum(bis);
      ladeEintraege(von, bis);
    }
  }

  async function ladeEintraege(von: string, bis: string) {
    if (!von || !bis) return;

    setVergleichLoading(true);
    setVergleichError(null);

    try {
      const params = new URLSearchParams({ von, bis });
      const response = await fetch(`/api/zeiteintraege?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Zeiteintraege.");
      }

      const json = await response.json();
      const eintraege: ZeitEintragSimple[] = (json.data || []).map(
        (e: ZeitEintrag) => ({
          datum: e.datum,
          startzeit: e.startzeit,
          endzeit: e.endzeit,
          pauseDauer: e.pauseDauer,
        })
      );
      setVergleichsEintraege(eintraege);
    } catch (err) {
      console.error(err);
      setVergleichError("Zeiteintraege konnten nicht geladen werden.");
      setVergleichsEintraege([]);
    } finally {
      setVergleichLoading(false);
    }
  }

  function handleVonChange(value: string) {
    setVonDatum(value);
    if (value && bisDatum) {
      ladeEintraege(value, bisDatum);
    }
  }

  function handleBisChange(value: string) {
    setBisDatum(value);
    if (vonDatum && value) {
      ladeEintraege(vonDatum, value);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan-Abgleich</h1>
        <p className="mt-2 text-muted-foreground">
          Lade ein Bild deiner Zeiterfassung hoch und vergleiche die
          erkannten Zeiten mit deinen erfassten Eintraegen.
        </p>
      </div>

      <BildUpload onOcrComplete={handleOcrComplete} />

      {ocrResult && (
        <>
          <OcrErgebnis ergebnis={ocrResult} />

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Vergleichszeitraum waehlen
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="von-datum">Von</Label>
                <Input
                  id="von-datum"
                  type="date"
                  value={vonDatum}
                  onChange={(e) => handleVonChange(e.target.value)}
                  aria-label="Startdatum fuer Vergleich"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="bis-datum">Bis</Label>
                <Input
                  id="bis-datum"
                  type="date"
                  value={bisDatum}
                  onChange={(e) => handleBisChange(e.target.value)}
                  aria-label="Enddatum fuer Vergleich"
                />
              </div>
            </div>
          </div>

          {vergleichLoading && (
            <p className="text-sm text-muted-foreground">
              Eintraege werden geladen...
            </p>
          )}

          {vergleichError && (
            <Alert variant="destructive">
              <AlertDescription>{vergleichError}</AlertDescription>
            </Alert>
          )}

          {vonDatum && bisDatum && !vergleichLoading && !vergleichError && (
            <AbgleichTabelle
              extrahierteZeilen={ocrResult.extrahierteZeilen}
              erfassteEintraege={vergleichsEintraege}
            />
          )}
        </>
      )}
    </div>
  );
}
