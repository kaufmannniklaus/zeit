import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { naechsteArvNotification, type Pause } from "@/lib/arv-berechnung";

function heuteDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function serializeDraft(r: {
  id: string;
  datum: Date;
  startzeit: string;
  endzeit: string | null;
  pausen: unknown;
  abgeschlossen: boolean;
  gesendeteNot: unknown;
  naechsteNotAt: Date | null;
  naechsteNotTyp: string | null;
}) {
  return {
    id: r.id,
    datum: r.datum.toISOString().split("T")[0],
    startzeit: r.startzeit,
    endzeit: r.endzeit,
    pausen: r.pausen as unknown as Pause[],
    abgeschlossen: r.abgeschlossen,
    gesendeteNot: r.gesendeteNot as unknown as string[],
    naechsteNotAt: r.naechsteNotAt?.toISOString() ?? null,
    naechsteNotTyp: r.naechsteNotTyp,
  };
}

// GET – heutige Session laden
export async function GET() {
  try {
    const draft = await prisma.tagessitzungDraft.findUnique({
      where: { datum: heuteDate() },
    });
    return NextResponse.json({ data: draft ? serializeDraft(draft) : null });
  } catch (error) {
    console.error("GET /api/tages-sitzung error:", error);
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

const PostSchema = z.object({
  startzeit: z.string().regex(/^\d{2}:\d{2}$/),
});

// POST – Tag starten
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
    }

    const { startzeit } = parsed.data;

    const naechste = naechsteArvNotification(startzeit, [], []);

    const draft = await prisma.tagessitzungDraft.upsert({
      where: { datum: heuteDate() },
      update: {
        startzeit,
        endzeit: null,
        pausen: [],
        abgeschlossen: false,
        gesendeteNot: [],
        naechsteNotAt: naechste?.faelligUm ?? null,
        naechsteNotTyp: naechste?.typ ?? null,
      },
      create: {
        datum: heuteDate(),
        startzeit,
        pausen: [],
        gesendeteNot: [],
        naechsteNotAt: naechste?.faelligUm ?? null,
        naechsteNotTyp: naechste?.typ ?? null,
      },
    });

    return NextResponse.json({ data: serializeDraft(draft) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tages-sitzung error:", error);
    return NextResponse.json({ error: "Fehler beim Speichern." }, { status: 500 });
  }
}

const PutSchema = z.object({
  aktion: z.enum(["pause_hinzufuegen", "endzeit_setzen", "abschliessen"]),
  minuten: z.number().int().min(1).max(480).optional(),
  endzeit: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  pauseEndezeit: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// PUT – Pause hinzufügen / Endzeit setzen / Abschliessen
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
    }

    const current = await prisma.tagessitzungDraft.findUnique({
      where: { datum: heuteDate() },
    });
    if (!current) {
      return NextResponse.json({ error: "Keine aktive Sitzung heute." }, { status: 404 });
    }

    const pausen = current.pausen as unknown as Pause[];
    const gesendeteNot = current.gesendeteNot as unknown as string[];

    let updateData: Record<string, unknown> = {};

    if (parsed.data.aktion === "pause_hinzufuegen") {
      if (!parsed.data.minuten) {
        return NextResponse.json({ error: "minuten fehlt." }, { status: 400 });
      }
      const neuePausen: Pause[] = [
        ...pausen,
        {
          minuten: parsed.data.minuten,
          erstelltAm: new Date().toISOString(),
          ...(parsed.data.pauseEndezeit ? { endezeit: parsed.data.pauseEndezeit } : {}),
        },
      ];
      const naechste = naechsteArvNotification(current.startzeit, neuePausen, gesendeteNot);
      updateData = {
        pausen: neuePausen,
        naechsteNotAt: naechste?.faelligUm ?? null,
        naechsteNotTyp: naechste?.typ ?? null,
      };
    } else if (parsed.data.aktion === "endzeit_setzen") {
      if (!parsed.data.endzeit) {
        return NextResponse.json({ error: "endzeit fehlt." }, { status: 400 });
      }
      updateData = { endzeit: parsed.data.endzeit };
    } else if (parsed.data.aktion === "abschliessen") {
      updateData = { abgeschlossen: true, naechsteNotAt: null, naechsteNotTyp: null };
    }

    const updated = await prisma.tagessitzungDraft.update({
      where: { datum: heuteDate() },
      data: updateData,
    });

    return NextResponse.json({ data: serializeDraft(updated) });
  } catch (error) {
    console.error("PUT /api/tages-sitzung error:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren." }, { status: 500 });
  }
}

// DELETE – Draft löschen (Reset)
export async function DELETE() {
  try {
    await prisma.tagessitzungDraft.deleteMany({ where: { datum: heuteDate() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tages-sitzung error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen." }, { status: 500 });
  }
}
