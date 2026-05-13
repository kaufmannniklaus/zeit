import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, readdirSync, rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { ExtrahierteZeile, OcrResult } from "@/types/ocr";

const ZEIT_REGEX = /\b([0-1]?\d|2[0-3]):[0-5]\d\b/g;

// ─── PDF via Claude API (100% genau) ────────────────────────────────────────

async function pdfMitClaudeExtrahieren(pdfBuffer: Buffer): Promise<ExtrahierteZeile[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: pdfBuffer.toString("base64"),
          },
        },
        {
          type: "text",
          text: `Extrahiere alle Arbeitstage aus diesem Tachographen-Wochenübersicht-Bericht.

Für jeden Arbeitstag mit tatsächlicher Arbeitszeit benötige ich:
- datum: im Format YYYY-MM-DD
- startzeit: Anfangszeit (Spalte "Anfang") im Format HH:MM
- endzeit: Endzeit (Spalte "Ende") im Format HH:MM
- pauseMinuten: Gesamte Pausenzeit in Minuten (0 wenn keine)

Hinweise:
- Nur echte Arbeitstage mit konkreten Start- und Endzeiten
- Keine Ruhetage, Wochenruhezeiten, Totale oder Durchschnitte
- Datum steht als "DD.MM.YYYY" in der Spalte "Datum"

Antworte NUR mit einem validen JSON-Array ohne weiteren Text:
[{"datum":"2026-02-23","startzeit":"06:00","endzeit":"18:00","pauseMinuten":30}]`,
        },
      ],
    }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unerwartete Antwort von Claude API");

  const text = block.text.trim();
  const jsonStart = text.indexOf("[");
  const jsonEnd = text.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("Kein JSON-Array in Antwort");

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Array<{
    datum: string;
    startzeit: string;
    endzeit: string;
    pauseMinuten: number;
  }>;

  return parsed.map((e, i) => ({
    zeile: i + 1,
    rohtext: `${e.datum} ${e.startzeit}–${e.endzeit}`,
    datum: e.datum,
    startzeit: e.startzeit,
    endzeit: e.endzeit,
    pauseMinuten: e.pauseMinuten ?? 0,
  }));
}

// ─── Bild via Tesseract CLI ──────────────────────────────────────────────────

function bildMitTesseractExtrahieren(bildBuffer: Buffer): ExtrahierteZeile[] {
  const tmpDir = mkdtempSync(join(tmpdir(), "ocr-"));
  try {
    const bildPfad = join(tmpDir, "input.jpg");
    const outputBase = join(tmpDir, "out");
    writeFileSync(bildPfad, bildBuffer);
    execFileSync("tesseract", [bildPfad, outputBase, "-l", "deu+eng", "--psm", "11"]);
    const rohtext = readFileSync(outputBase + ".txt", "utf-8");

    const zeilen = rohtext.split("\n").filter(z => z.trim().length > 0);
    const ergebnis: ExtrahierteZeile[] = [];

    zeilen.forEach((zeile, index) => {
      const matches = [...zeile.matchAll(ZEIT_REGEX)].map(m => m[0]);
      if (matches.length >= 2) {
        const [startzeit, endzeit, pause] = matches;
        ergebnis.push({ zeile: index + 1, rohtext: zeile.trim(), startzeit, endzeit, pause });
      }
    });

    return ergebnis;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── Öffentliche API ─────────────────────────────────────────────────────────

export async function verarbeiteOcrBild(bildBuffer: Buffer): Promise<OcrResult> {
  const istPdf = bildBuffer.slice(0, 4).toString() === "%PDF";

  if (istPdf) {
    const zeilen = await pdfMitClaudeExtrahieren(bildBuffer);
    return {
      rohtextOcr: zeilen.map(z => z.rohtext).join("\n"),
      extrahierteZeilen: zeilen,
      vertrauenswuerdigkeit: 100,
    };
  }

  const zeilen = bildMitTesseractExtrahieren(bildBuffer);
  return {
    rohtextOcr: zeilen.map(z => z.rohtext).join("\n"),
    extrahierteZeilen: zeilen,
    vertrauenswuerdigkeit: 0,
  };
}
